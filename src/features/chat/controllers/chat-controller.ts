import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { aiService } from "../../ai/ai-service";
import { careerResolver } from "../../career/career-resolver.service";
import { getOrInitializeProfile } from "../../users/services/profile-service";

export async function handleChat(req: Request, res: Response) {
	try {
		const { userId, message } = req.body;

		if (!userId || !message) {
			return res.status(400).json({
				success: false,
				message: "Missing userId or message",
			});
		}

		const profile = await getOrInitializeProfile(userId);

		const aiCache = await prisma.aiCache.findUnique({
			where: { userId },
		});

		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);

		const skillGap = aiCache?.skillGap as any;
		const missingSkills = skillGap?.[0]?.missingSkills || [];

		const systemPrompt = `You are an expert Career Mentor and Technical Guide. 
Your goal is to answer the user's questions in a friendly, conversational mentor tone. 

You MUST answer technical questions (e.g., "What is Java?", "Explain Docker", "What is Machine Learning"). 
If the user asks about a topic not directly relevant to their career, answer the question first, then explain how relevant it is to their chosen career.

CRITICAL RULES:
1. Every technical answer MUST be personalized. After explaining the concept, relate it back to the user's Target Career and Missing Skills.
2. Recommend learning order. (e.g., "If your goal is ML Engineer, learn Python before Java.")
3. Explain why a technology matters in the industry.
4. You can answer questions about programming, AI, machine learning, web dev, cloud, DevOps, databases, interviews, resumes, internships, roadmap, and career planning.
5. ONLY refuse unrelated topics like politics, entertainment gossip, or unsafe/illegal requests. Do NOT refuse technical programming questions.

USER RAG CONTEXT:
- Name: ${profile.user?.name || "Unknown"}
- Branch/Degree: ${profile.branch || profile.degree || "Unknown"} 
- Target Career: ${targetCareer}
- Current Skills: ${profile.skills.length ? profile.skills.join(", ") : "None listed"}
- Missing Skills to Learn: ${missingSkills.length ? missingSkills.join(", ") : "None identified yet"}
- Interests: ${Array.isArray(profile.interests) ? profile.interests.join(", ") : profile.interests}

Example Tone:
User: "What is Java?"
Assistant: "Java is a powerful, object-oriented programming language widely used in enterprise backend systems and Android app development... Since your target career is Data Scientist, Java is not a high priority right now. Instead, you should focus on your missing skills like Python and SQL first!"`;


		const aiResponse = await aiService.generate(message, {
			feature: "AI Chat",
			systemPrompt,
			responseFormat: "text",
		});

		console.log(
			`[CHATBOT] Provider: ${aiResponse.provider} | Duration: ${aiResponse.durationMs}ms | Fallback: ${aiResponse.fallbackUsed}`,
		);

		res.status(200).json({
			success: true,
			reply: aiResponse.response,
			_ai: {
				provider: aiResponse.provider,
				fallbackUsed: aiResponse.fallbackUsed,
				durationMs: aiResponse.durationMs,
			},
		});
	} catch (error) {
		console.error("[CHAT ERROR]", error);

		res.status(500).json({
			success: false,
			message: "Failed to generate AI response",
		});
	}
}
