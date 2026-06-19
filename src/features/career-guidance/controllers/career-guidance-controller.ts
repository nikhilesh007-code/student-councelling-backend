import type { Request, Response } from "express";
import ollama from "ollama";
import { prisma } from "../../../database";

export async function generateCareerGuidance(
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

        const prompt = `
You are an expert career counsellor.

Student Branch: ${profile.branch}
Student CGPA: ${profile.cgpa}

Career Goal: ${career.name}

Current Skills:
${studentSkills.join(", ")}

Matched Skills:
${matchedSkills.join(", ")}

Missing Skills:
${missingSkills.join(", ")}

Gap Score:
${gapScore}%

Give:

1. Skill Gap Summary
2. Learning Roadmap
3. Recommended Courses
4. Recommended Projects
5. Career Advice

Keep it practical and student-friendly.
`;

        const aiResponse = await ollama.chat({
            model: "llama3",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        res.status(200).json({
            success: true,
            career: career.name,
            gapScore,
            matchedSkills,
            missingSkills,
            guidance: aiResponse.message.content,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Career guidance failed",
        });
    }
}