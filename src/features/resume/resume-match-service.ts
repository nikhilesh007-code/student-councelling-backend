import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";
import { careerContextService } from "../career/career-context.service";
import { SkillNormalizer } from "../../utils/normalizers";

export class ResumeMatchService {
	async analyzeMatch(userId: string) {
		let aiCache = await prisma.aiCache.findUnique({
			where: { userId },
		});

		if (aiCache && aiCache.resumeMatch && Object.keys(aiCache.resumeMatch).length > 0) {
			return aiCache.resumeMatch;
		}

		// JIT Generation: Cache is empty, so we must generate it.

		const resumeAnalysis = await prisma.resumeAnalysis.findUnique({ where: { userId } });
		if (!resumeAnalysis || !resumeAnalysis.parsedData) {
			throw new Error("Resume not found or not parsed. Please upload your resume first.");
		}

		const context = await careerContextService.buildContext(userId);
		const targetCareer = context.targetCareer;

		const systemPrompt = `You are an expert career counselor and AI placement analyzer.
Analyze the candidate's parsed resume data to determine how well they match their Target Career.

Parsed Resume JSON:
${JSON.stringify(resumeAnalysis.parsedData, null, 2)}

Target Career: ${targetCareer}

Return purely JSON matching this exact structure. 
MUST use CANONICAL SKILL NAMES for all skills (e.g. "Node.js", "Express.js", "JavaScript", "React", "TypeScript", "MongoDB", "Docker").

{
  "matchScore": 85,
  "matchingSkills": ["string"],
  "missingSkills": ["string"],
  "recommendations": ["string"],
  "careerSpecificProjects": ["string"],
  "careerSpecificCertifications": ["string"]
}`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Career Match Generation",
				responseFormat: "json",
				userId,
			});

			const cleaned = response.response
				.replace(/```json/gi, "")
				.replace(/```/g, "")
				.trim();
			const aiResult = JSON.parse(cleaned);

			// Normalize AI outputs
			aiResult.matchingSkills = SkillNormalizer.normalizeArray(aiResult.matchingSkills);
			aiResult.missingSkills = SkillNormalizer.normalizeArray(aiResult.missingSkills);
			
			// Explicitly subtract profile skills from missing skills just in case
			aiResult.missingSkills = aiResult.missingSkills.filter(
				(skill: string) => !context.normalizedSkills.includes(skill)
			);

			// Save back to DB
			aiCache = await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: "jit-generated",
					resumeMatch: aiResult,
					source: "groq",
				},
				update: {
					resumeMatch: aiResult,
					generatedAt: new Date(),
				},
			});

			return aiResult;
		} catch (error: any) {
			console.error(
				`[JIT ERROR] Failed to generate career match analysis for user ${userId}:`,
				error.message,
			);
			if (error.name === "RateLimitError") {
				throw new Error(
					"We're currently experiencing high traffic. Please try viewing your career match again in a few moments.",
				);
			}
			throw new Error("Failed to generate career match analysis.");
		}
	}
}

export const resumeMatchService = new ResumeMatchService();
