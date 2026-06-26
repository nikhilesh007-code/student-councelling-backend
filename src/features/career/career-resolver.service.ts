import { prisma } from "../../database";

export interface ResolvedCareer {
	career: string;
	source: "SELECTED" | "AI_RECOMMENDED" | "CAREER_GOAL" | "FALLBACK";
	confidence: number;
}

export class CareerResolverService {
	async resolveTargetCareer(userId: string): Promise<ResolvedCareer> {
		const profile = await prisma.studentProfile.findUnique({ where: { userId } });
		
		// 1. Priority 1: User explicitly selected a career
		if (profile?.selectedCareer) {
			return {
				career: profile.selectedCareer,
				source: "SELECTED",
				confidence: 100,
			};
		}

		// 2. Priority 2: Highest AI recommendation
		const aiCache = await prisma.aiCache.findUnique({ where: { userId } });
		if (aiCache?.recommendation) {
			const rec = aiCache.recommendation as any;
			if (rec.topCareer) {
				return {
					career: rec.topCareer,
					source: "AI_RECOMMENDED",
					confidence: 90,
				};
			}
			if (rec.recommendedCareers && rec.recommendedCareers.length > 0 && rec.recommendedCareers[0].title) {
				return {
					career: rec.recommendedCareers[0].title,
					source: "AI_RECOMMENDED",
					confidence: 85,
				};
			}
		}

		// 3. Priority 3: User's general career goal
		if (profile?.careerGoal) {
			return {
				career: profile.careerGoal,
				source: "CAREER_GOAL",
				confidence: 70,
			};
		}

		// 4. Fallback: Default fallback if absolutely no data exists
		return {
			career: "Software Engineer",
			source: "FALLBACK",
			confidence: 10,
		};
	}
}

export const careerResolver = new CareerResolverService();
