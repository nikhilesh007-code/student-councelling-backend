import type { Request, Response } from "express";
import ollama from "ollama";
import { prisma } from "../../../database";
import { resolveCareer } from "../../../utils/career-lookup";
import { generateCareerExplanation } from "../../ai/services/ollama-service";

export async function generateCareerGuidance(
    req: Request,
    res: Response
) {
    const start = Date.now();
    try {
        const { userId } = req.body;

        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId,
            },
            select: {
                careerGoal: true,
                skills: true,
                interests: true
            }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        const career = await resolveCareer(profile.careerGoal, profile.skills);
        const dbTime = Date.now() - start;
        console.log(`[RECOMMENDATION] Database query time: ${dbTime}ms`);
        
        if (!career) {
            return res.status(404).json({
                success: false,
                message: "Career not found",
            });
        }

        const requiredSkills = career.skills.map(
            (item) => item.skill.name
        );

        const studentSkills = profile.skills;

        const { matchSkills } = await import("../../skills/services/skill-similarity-service");
        const skillMatches = await matchSkills(requiredSkills, studentSkills);

        const matchedSkills = skillMatches.filter(m => m.matchType === 'Exact').map(m => m.requiredSkill);
        const missingSkills = skillMatches.filter(m => m.matchType === 'Missing').map(m => m.requiredSkill);

        let totalScore = 0;
        for (const match of skillMatches) {
            totalScore += match.score;
        }

        const matchScore = requiredSkills.length > 0 ? Math.round(totalScore / requiredSkills.length) : 0;
        const gapScore = 100 - matchScore;


        let interests: string[] = [];
        if (typeof profile.interests === 'string') {
            interests = (profile.interests as string).split(',').map(i => i.trim());
        } else if (Array.isArray(profile.interests)) {
            interests = profile.interests;
        }

        res.status(200).json({
            success: true,
            matchScore,
            career: career.name,
            gapScore,
            matchedSkills,
            missingSkills,
            skillMatches,
            interests,
            studentSkills,
            careerGoal: profile.careerGoal
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Career guidance failed",
        });
    }
}

export async function generateCareerGuidanceAi(
    req: Request,
    res: Response
) {
    try {
        const { userId, studentSkills, interests, careerGoal, careerName, matchScore, missingSkills, regenerate } = req.body;

        const crypto = require('crypto');
        const hashPayload = JSON.stringify({ studentSkills, interests, careerGoal, careerName, matchScore, missingSkills });
        const currentHash = crypto.createHash('md5').update(hashPayload).digest('hex');

        if (!regenerate) {
            const cache = await prisma.aiCache.findUnique({ where: { userId } });
            if (cache && cache.profileHash === currentHash && cache.recommendation) {
                console.log(`[AI CACHE HIT] Recommendation for ${userId}`);
                return res.status(200).json({
                    success: true,
                    ...((cache.recommendation as any) || {})
                });
            }
        }

        console.log(regenerate ? `[AI REGENERATE] Recommendation for ${userId}` : `[AI CACHE MISS] Recommendation for ${userId}`);

        const aiData = await generateCareerExplanation({
            userSkills: studentSkills,
            interests,
            careerGoal,
            recommendedCareer: careerName,
            matchPercentage: matchScore,
            missingSkills
        });

        const responseData = {
            aiExplanation: aiData.aiExplanation,
            nextSteps: aiData.nextSteps,
        };

        await prisma.aiCache.upsert({
            where: { userId },
            create: {
                userId,
                profileHash: currentHash,
                recommendation: responseData
            },
            update: {
                profileHash: currentHash,
                recommendation: responseData
            }
        });

        res.status(200).json({
            success: true,
            ...responseData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "AI Career guidance failed",
        });
    }
}