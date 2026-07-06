import crypto from "crypto";
import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";
import { careerContextService } from "../career/career-context.service";
import { LearningResourceService } from "../learning-resources/services/learning-resource-service";
import { roadmapAnalysisService } from "../roadmap/services/roadmap-analysis-service";
import { skillGapAnalysisService } from "../skill-gap-analysis/services/skill-gap-service";
import { calculateProfileCompletion } from "../users/services/profile-service";

export class ProgressContextService {
	async getDashboard(userId: string) {
		// 1. Fetch Profile Completion
		const profileCompletionData = await calculateProfileCompletion(userId);
		const profileCompletion = profileCompletionData.percentage;

		// 2. Fetch Skill Gap (SSoT for readiness and matched/missing skills)
		const skillGap = await skillGapAnalysisService.getLatestAnalysis(userId);
		const readinessScore = skillGap.readinessScore;

		console.log("=== DEBUG PROGRESS: SkillGapService.getLatestAnalysis ===");
		console.log("readinessScore:", readinessScore);
		console.log("matchedSkills:", skillGap.matchedSkills);
		console.log("missingSkills:", skillGap.missingSkills);

		// 3. Top Strength is the first matched skill from SGA
		const topStrength =
			skillGap.matchedSkills.length > 0 ? skillGap.matchedSkills[0] : "Not yet identified";

		// 4. Fetch Career Roadmap (SSoT for roadmap dynamic progress)
		const roadmap = await roadmapAnalysisService.getRoadmap(userId);
		const progressInfo = roadmap.dynamicProgress;

		const completedPhases = progressInfo?.completedPhases || 0;
		const totalPhases = roadmap.phases?.length || 0;
		const roadmapPercentage = progressInfo?.overallProgress || 0;
		const currentPhaseTitle = progressInfo?.currentPhase || "Getting Started";
		const currentStageRatio = `${completedPhases}/${totalPhases}`;
		const nextSkill = progressInfo?.nextSkill || "Not yet identified";

		console.log("=== DEBUG PROGRESS: RoadmapAnalysisService.getRoadmap ===");
		console.log("overallProgress:", roadmapPercentage);
		console.log("completedPhases:", completedPhases);
		console.log("currentPhase:", currentPhaseTitle);
		console.log("nextSkill:", nextSkill);

		// 5. Critical Weakness is the next skill from Roadmap
		const criticalWeakness = nextSkill;

		// 6. Fetch Recommended Resources (Next 2 milestones)
		let nextLearningSteps: any[] = [];
		const nextSkillsToLearn = [];
		if (progressInfo?.remainingSkills?.length > 0) {
			nextSkillsToLearn.push(...progressInfo.remainingSkills.slice(0, 2));
		} else if (
			nextSkill &&
			nextSkill !== "Ready for the job market" &&
			nextSkill !== "Not yet identified"
		) {
			nextSkillsToLearn.push(nextSkill);
		}

		if (nextSkillsToLearn.length > 0) {
			nextLearningSteps = await LearningResourceService.getAggregatedResources(nextSkillsToLearn);
		}

		// 7. Database / Deterministic Data Payload
		const dbData = {
			profileCompletion,
			roadmapProgress: {
				completed: completedPhases,
				total: totalPhases,
				percentage: roadmapPercentage,
				currentPhaseTitle,
				currentStageRatio,
			},
			focusAreas: {
				topStrength,
				criticalWeakness,
				nextSkill,
			},
			learnedSkills: skillGap.matchedSkills,
			missingSkills: skillGap.missingSkills,
			nextLearningSteps: nextLearningSteps.slice(0, 3), // Top 3 resources
			readinessScore,
		};

		console.log("=== DEBUG PROGRESS: Final dbData Object ===");
		console.log(JSON.stringify(dbData, null, 2));

		// 8. Check Cache for AI Summary
		// The hash must include Target Career, Readiness Score, and Roadmap Progress (completedPhases)
		const profileString = `${skillGap.career}-${skillGap.matchedSkills.join(",")}-${completedPhases}-${readinessScore}`;
		const currentHash = crypto.createHash("md5").update(profileString).digest("hex");

		const aiCache = await prisma.aiCache.findUnique({ where: { userId } });
		let aiData = aiCache?.progress as any;

		if (aiData && aiData.hash === currentHash) {
			return { dbData, aiData };
		}

		// JIT Generate AI Insights
		console.log(`[JIT PROGRESS] Generating AI summary for user ${userId}...`);

		const systemPrompt = `You are an expert career coach.
Analyze the candidate's deterministic progress metrics to generate a summary and exactly 3 actionable recommendations.

Target Career: ${skillGap.career}
Readiness Score: ${readinessScore}%
Strengths: ${topStrength}
Critical Weakness: ${criticalWeakness}
Next Skill: ${nextSkill}

Return purely JSON matching this exact structure:
{
  "progressSummary": "2-3 sentences summarizing their overall learning progress and career readiness.",
  "recommendations": ["string", "string", "string"]
}

Rules for generation:
- NO calculations. Use ONLY the provided values.
- Do not infer readiness. Do not infer progress. Do not invent strengths.
- Produce EXACTLY 3 concise actionable recommendations based strictly on the current phase and next skill.
- MAXIMUM 30 words per recommendation.`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Progress Summary Generation",
				responseFormat: "json",
				userId,
			});

			const cleaned = response.response
				.replace(/```json/gi, "")
				.replace(/```/g, "")
				.trim();
			aiData = JSON.parse(cleaned);
			aiData.hash = currentHash;

			// Save back to DB
			await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: "jit-generated",
					progress: aiData,
					source: "groq",
				},
				update: {
					progress: aiData,
					generatedAt: new Date(),
				},
			});

			return { dbData, aiData };
		} catch (error: any) {
			console.error(
				`[JIT ERROR] Failed to generate progress summary for user ${userId}:`,
				error.message,
			);
			return {
				dbData,
				aiData: {
					progressSummary:
						"AI summary is temporarily unavailable. Keep working on your next learning steps!",
					recommendations: [
						"Focus on your critical weakness.",
						"Start your next learning step.",
						"Apply your strengths to new projects.",
					],
				},
			};
		}
	}
}

export const progressService = new ProgressContextService();
