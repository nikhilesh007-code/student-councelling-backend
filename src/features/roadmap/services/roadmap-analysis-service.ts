import { prisma } from "../../../database";
import { aiService } from "../../ai/ai-service";
import { careerResolver } from "../../career/career-resolver.service";

export class RoadmapAnalysisService {
	async analyzeRoadmap(userId: string) {
		let aiCache = await prisma.aiCache.findUnique({
			where: { userId },
		});

		if (aiCache && aiCache.roadmapAnalysis && Object.keys(aiCache.roadmapAnalysis).length > 0) {
			return this.normalizeResponse(aiCache.roadmapAnalysis);
		}

		// JIT Generation: Cache is empty, so we must generate it.

		const profile = await prisma.studentProfile.findUnique({ where: { userId } });
		if (!profile) {
			throw new Error("Student profile not found. Please complete your profile first.");
		}

		const resumeAnalysis = await prisma.resumeAnalysis.findUnique({ where: { userId } });
		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);

		const systemPrompt = `You are an expert career planner and AI roadmap generator.
Create a highly detailed, phase-by-phase career roadmap based on the user's profile and existing skills.

User Profile:
- Target Career: ${targetCareer}
- Skills: ${profile.skills?.join(", ") || "None specified"}
- Interests: ${profile.interests?.join(", ") || "None specified"}
- Branch: ${profile.branch || "Not specified"}
- CGPA: ${profile.cgpa || "Not specified"}
- Overall Career Goal: ${profile.careerGoal || "Not specified"}
${resumeAnalysis?.parsedData && Object.keys(resumeAnalysis.parsedData).length > 0 ? `
Additionally, use this extracted data from their uploaded resume to enrich the roadmap:
Parsed Resume JSON:
${JSON.stringify(resumeAnalysis.parsedData, null, 2)}` : ""}

Target Career: ${targetCareer}

Return purely JSON matching this exact structure:
{
  "targetCareer": "${targetCareer}",
  "estimatedDuration": "e.g., 6 months",
  "currentPhase": "e.g., Phase 2",
  "overallProgress": 15,
  "phases": [
    {
      "phase": 1,
      "title": "string",
      "objective": "string",
      "skills": ["string"],
      "projects": ["string"],
      "expectedOutcome": "string",
      "estimatedWeeks": "string",
      "completion": 100
    }
  ],
  "nextBestAction": {
    "title": "string",
    "description": "string",
    "priority": "High"
  }
}`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Career Roadmap Generation",
				responseFormat: "json",
				userId,
			});

			const cleaned = response.response
				.replace(/```json/gi, "")
				.replace(/```/g, "")
				.trim();
			const aiResult = JSON.parse(cleaned);

			// Save back to DB
			aiCache = await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: "jit-generated",
					roadmapAnalysis: aiResult,
					source: "groq",
				},
				update: {
					roadmapAnalysis: aiResult,
					generatedAt: new Date(),
				},
			});

			return this.normalizeResponse(aiResult);
		} catch (error: any) {
			console.error(`[JIT ERROR] Failed to generate roadmap for user ${userId}:`, error.message);
			if (error.name === "RateLimitError") {
				throw new Error(
					"We're currently experiencing high traffic. Please try viewing your roadmap again in a few moments.",
				);
			}
			throw new Error("Failed to generate career roadmap.");
		}
	}

	private normalizeResponse(raw: any) {
		const nextAction = {
			title: raw.nextBestAction?.title || raw.nextAction?.title || "Start learning today",
			reason: raw.nextBestAction?.description || raw.nextAction?.reason || "Begin the first phase of your roadmap.",
			duration: raw.nextBestAction?.duration || raw.nextAction?.duration || "1 week",
			priority: raw.nextBestAction?.priority || raw.nextAction?.priority || "High"
		};

		return {
			...raw,
			nextAction,
			milestonePrediction: raw.milestonePrediction || {
				internshipReady: "After core skills",
				placementReady: raw.estimatedDuration || "After roadmap completion",
				confidence: 85
			},
			suggestedProjects: raw.suggestedProjects || (raw.phases || []).flatMap((p: any) => 
				(p.projects || []).map((proj: string) => ({
					title: proj,
					difficulty: "Intermediate",
					reason: `Hands-on project for ${p.title || 'this phase'}.`,
					skills: p.skills || []
				}))
			)
		};
	}
}

export const roadmapAnalysisService = new RoadmapAnalysisService();
