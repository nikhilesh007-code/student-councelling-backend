import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";
import { careerResolver } from "../career/career-resolver.service";

export class PlacementService {
	async getDashboard(userId: string) {
		let aiCache = await prisma.aiCache.findUnique({
			where: { userId },
		});

		if (aiCache && aiCache.placement && Object.keys(aiCache.placement).length > 0) {
			return this.normalizeResponse(aiCache.placement as any);
		}

		// JIT Generation: Cache is empty, so we must generate it.

		const resumeAnalysis = await prisma.resumeAnalysis.findUnique({ where: { userId } });
		if (!resumeAnalysis || !resumeAnalysis.parsedData) {
			throw new Error("Resume not found or not parsed. Please upload your resume first.");
		}

		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);

		const systemPrompt = `You are an expert tech recruiter and placement readiness evaluator.
Evaluate the candidate's parsed resume data and generate a highly detailed placement readiness assessment for their target career.

Parsed Resume JSON:
${JSON.stringify(resumeAnalysis.parsedData, null, 2)}

Target Career: ${targetCareer}

Return purely JSON matching this exact structure:
{
  "readinessScore": 75,
  "technicalReadiness": 80,
  "softSkillsReadiness": 70,
  "placementAssessment": "2-3 sentences evaluating their overall readiness.",
  "priorityImprovements": ["string"],
  "todayActions": ["string"],
  "roadmap": [
    {"week": 1, "focus": "string describing the week's focus area", "tasks": ["string"]},
    {"week": 2, "focus": "string", "tasks": ["string"]},
    {"week": 3, "focus": "string", "tasks": ["string"]},
    {"week": 4, "focus": "string", "tasks": ["string"]}
  ],
  "companyReadiness": [
    {"company": "e.g. Google", "readinessPercentage": 60, "explanation": "1-2 sentences explaining what's missing"},
    {"company": "e.g. Amazon", "readinessPercentage": 70, "explanation": "1-2 sentences"}
  ]
}`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Placement Readiness Generation",
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
					placement: aiResult,
					source: "groq",
				},
				update: {
					placement: aiResult,
					generatedAt: new Date(),
				},
			});

			return this.normalizeResponse(aiResult);
		} catch (error: any) {
			console.error(
				`[JIT ERROR] Failed to generate placement analysis for user ${userId}:`,
				error.message,
			);
			if (error.name === "RateLimitError") {
				throw new Error(
					"We're currently experiencing high traffic. Please try viewing your placement dashboard again in a few moments.",
				);
			}
			throw new Error("Failed to generate placement analysis.");
		}
	}

	/**
	 * Normalizes the AI response to match the exact shape the frontend expects.
	 * Handles both old-format (overallReadiness, readiness) and new-format (readinessScore, readinessPercentage) fields.
	 */
	private normalizeResponse(raw: any): any {
		const normalized: any = {
			readinessScore: raw.readinessScore ?? raw.overallReadiness ?? 0,
			technicalReadiness: raw.technicalReadiness ?? 0,
			softSkillsReadiness: raw.softSkillsReadiness ?? 0,
			placementAssessment: raw.placementAssessment || null,
			priorityImprovements: Array.isArray(raw.priorityImprovements) ? raw.priorityImprovements : [],
			todayActions: Array.isArray(raw.todayActions) ? raw.todayActions : [],
		};

		// Normalize roadmap: handle both string[] and {week, focus, tasks}[] shapes
		if (Array.isArray(raw.roadmap)) {
			normalized.roadmap = raw.roadmap.map((item: any, idx: number) => {
				if (typeof item === "string") {
					return { week: idx + 1, focus: item, tasks: [] };
				}
				return {
					week: item.week ?? idx + 1,
					focus: item.focus ?? item.title ?? "Week " + (idx + 1),
					tasks: Array.isArray(item.tasks) ? item.tasks : [],
				};
			});
		} else {
			normalized.roadmap = [];
		}

		// Normalize companyReadiness: map old field names to new ones
		if (Array.isArray(raw.companyReadiness)) {
			normalized.companyReadiness = raw.companyReadiness.map((c: any) => ({
				company: c.company || "Unknown",
				readinessPercentage: c.readinessPercentage ?? c.readiness ?? 0,
				explanation:
					c.explanation ||
					(Array.isArray(c.missingRequirements)
						? c.missingRequirements.join(". ")
						: "No details available."),
			}));
		} else {
			normalized.companyReadiness = [];
		}

		return normalized;
	}
}

export const placementService = new PlacementService();
