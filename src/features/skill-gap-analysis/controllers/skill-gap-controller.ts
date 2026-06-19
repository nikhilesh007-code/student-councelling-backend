import type { Request, Response } from "express";
import { prisma } from "../../../database";

export async function analyzeSkillGap(
    req: Request,
    res: Response
) {
    try {
        const { userId } = req.body;

        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId,
            },
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        const career = await prisma.career.findUnique({
            where: {
                name: profile.careerGoal,
            },
            include: {
                skills: {
                    include: {
                        skill: true,
                    },
                },
            },
        });

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

        const matchedSkills = studentSkills.filter(
            (skill) => requiredSkills.includes(skill)
        );

        const missingSkills = requiredSkills.filter(
            (skill) => !studentSkills.includes(skill)
        );

        const gapScore = Math.round(
            (missingSkills.length / requiredSkills.length) * 100
        );

        const readinessScore = 100 - gapScore;

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
            gapScore,
            readinessScore,
            summary,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Analysis failed",
        });
    }
}