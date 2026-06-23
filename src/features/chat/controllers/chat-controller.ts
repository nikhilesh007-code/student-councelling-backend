import type { Request, Response } from "express";
import ollama from "ollama";
import { prisma } from "../../../database";

export async function handleChat(req: Request, res: Response) {
    try {
        const { userId, message } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                message: "Missing userId or message",
            });
        }

        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId,
            },
            select: {
                branch: true,
                year: true,
                skills: true,
                interests: true,
                careerGoal: true,
                bio: true,
                user: {
                    select: { name: true }
                }
            }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }

        const systemPrompt = `You are CareerAI. Chat concisely with the student. Provide short, helpful answers.
Profile:
Name: ${profile.user?.name || 'Unknown'}
Branch: ${profile.branch || 'Unknown'} Year: ${profile.year || 'Unknown'}
Skills: ${profile.skills.join(', ')}
Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : profile.interests}
Goal: ${profile.careerGoal || 'Undecided'}
Bio: ${profile.bio || 'None'}
Only answer career-related questions. Reject generating emails, marketing, or reports.

Examples:
User: hi
Assistant: Hi ${profile.user?.name || 'there'}! How can I help with your career journey today?

User: what skills do I have?
Assistant: Based on your profile, your skills are ${profile.skills.join(', ') || 'None listed'}.`;

        const promptLength = systemPrompt.length + message.length;
        const modelName = "llama3:latest";

        console.log(`[CHAT] Model:`, modelName);
        console.log(`[CHAT] User:`, userId);

        const messages = [
            {
                role: "system",
                content: systemPrompt,
            },
            {
                role: "user",
                content: message,
            }
        ];

        const startTimeMs = performance.now();

        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<any>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Timeout")), 30000);
        });

        const aiResponse = await Promise.race([
            ollama.chat({
                model: modelName,
                messages,
            }),
            timeoutPromise
        ]);
        clearTimeout(timeoutId!);

        const endTimeMs = performance.now();
        const generationTime = ((endTimeMs - startTimeMs) / 1000).toFixed(2);
        const tokenCount = aiResponse.eval_count || 0; 

        console.log(`[CHATBOT] Response Time: ${generationTime} seconds | Tokens: ${tokenCount}`);

        res.status(200).json({
            success: true,
            reply: aiResponse.message.content,
        });

    } catch (error) {
        console.error("[CHAT ERROR]", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate AI response",
        });
    }
}
