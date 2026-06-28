import { prisma } from "../../../database";
import { careerContextService } from "../../career/career-context.service";
import { aiCacheService } from "../../ai/services/ai-cache-service";
import { SkillNormalizer } from "../../../utils/normalizers";

export class SkillGapAnalysisService {
	async getLatestAnalysis(userId: string) {
		const context = await careerContextService.buildContext(userId);
		let readinessScore = 0;
		let matchedSkills = context.normalizedSkills || [];
		let missingSkills: string[] = [];
		let career = context.targetCareer;

		const recommendation = await aiCacheService.getRecommendation(userId);
		
		const skillGaps = recommendation?.skillGaps;
		if (skillGaps && Array.isArray(skillGaps) && skillGaps.length > 0) {
			const resolvedTargetCareer = context.targetCareer;
			let targetGap = skillGaps.find(
				(g: any) =>
					resolvedTargetCareer &&
					g.career.toLowerCase().includes(resolvedTargetCareer.toLowerCase()),
			);
			if (!targetGap) {
				targetGap = skillGaps[0];
			}

			if (targetGap) {
				career = targetGap.career;
				readinessScore = targetGap.readinessScore || 0;
				
				// Normalize AI missing skills
				const aiMissingSkills = SkillNormalizer.normalizeArray(targetGap.missingSkills || []);
				
				// Explicitly SUBTRACT profile skills from AI missing skills
				missingSkills = aiMissingSkills.filter(
					(skill) => !context.normalizedSkills.includes(skill)
				);
			}
		}

		return {
			career,
			readinessScore,
			matchedSkills,
			missingSkills
		};
	}
}

export const skillGapAnalysisService = new SkillGapAnalysisService();
