import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { resolveCareer } from "../../../utils/career-lookup";
import { generateSkillGapRoadmap } from "../../ai/services/ollama-service";

export async function analyzeSkillGap(
    req: Request,
    res: Response
) {
    const start = Date.now();
    try {
        const { userId, targetCareer } = req.body;

        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId,
            },
            select: {
                careerGoal: true,
                skills: true
            }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        let career = null;

        if (targetCareer) {
            career = await prisma.career.findUnique({
                where: { name: targetCareer },
                include: { skills: { include: { skill: true } } }
            });
            if (!career) {
                career = await prisma.career.findFirst({
                    where: { name: { equals: targetCareer, mode: 'insensitive' } },
                    include: { skills: { include: { skill: true } } }
                });
            }
        }

        if (!career) {
            career = await resolveCareer(profile.careerGoal, profile.skills);
        }

        const dbTime = Date.now() - start;
        console.log(`[SKILL GAP] Database query time: ${dbTime}ms`);
        
        if (!career) {
            // Ultimate safety net, should not hit due to fallbacks
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

        const readinessScore = requiredSkills.length > 0 ? Math.round(totalScore / requiredSkills.length) : 0;
        const gapScore = 100 - readinessScore;

        let summary = "";

        if (missingSkills.length === 0) {
            summary = `Excellent! You currently possess all the required skills for a ${career.name} role.`;
        } else {
            summary = `You already have ${matchedSkills.length} out of ${requiredSkills.length} required skills for becoming a ${career.name}. Focus on learning ${missingSkills.join(", ")} to improve your career readiness.`;
        }

        return res.status(200).json({
            success: true,
            career: career.name,
            currentSkills: studentSkills,
            matchedSkills,
            missingSkills,
            skillMatches,
            gapScore,
            readinessScore,
            summary
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Analysis failed",
        });
    }
}

export async function analyzeSkillGapAi(
    req: Request,
    res: Response
) {
    try {
        const { userId, careerName, currentSkills, missingSkills, readinessScore, regenerate } = req.body;

        const crypto = require('crypto');
        const hashPayload = JSON.stringify({ careerName, currentSkills, missingSkills, readinessScore });
        const currentHash = crypto.createHash('md5').update(hashPayload).digest('hex');

        if (!regenerate) {
            const cache = await prisma.aiCache.findUnique({ where: { userId } });
            if (cache && cache.profileHash === currentHash && cache.skillGap) {
                console.log(`[AI CACHE HIT] Skill Gap Roadmap for ${userId}`);
                return res.status(200).json({
                    success: true,
                    ...((cache.skillGap as any) || {})
                });
            }
        }

        console.log(regenerate ? `[AI REGENERATE] Skill Gap Roadmap for ${userId}` : `[AI CACHE MISS] Skill Gap Roadmap for ${userId}`);

        const aiDataPromise = generateSkillGapRoadmap({
            careerName,
            currentSkills,
            missingSkills,
            readinessScore
        });

        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<any>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Timeout")), 60000);
        });

        const aiData = await Promise.race([aiDataPromise, timeoutPromise]);
        clearTimeout(timeoutId!);

        const responseData = {
            roadmap: aiData.roadmap,
            projects: aiData.projects,
            studyPlan: aiData.studyPlan,
            estimatedTimeline: aiData.estimatedTimeline
        };

        await prisma.aiCache.upsert({
            where: { userId },
            create: {
                userId,
                profileHash: currentHash,
                skillGap: responseData
            },
            update: {
                profileHash: currentHash,
                skillGap: responseData
            }
        });

        return res.status(200).json({
            success: true,
            ...responseData
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "AI Analysis failed",
        });
    }
}