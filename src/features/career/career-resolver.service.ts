import { getOrInitializeProfile } from "../users/services/profile-service";
import { CareerNormalizer } from "../../utils/normalizers";
import { prisma } from "../../database";

import { aiCacheService } from "../ai/services/ai-cache-service";

export interface ResolvedCareer {
	career: string;
	source: "SELECTED" | "AI_RECOMMENDED" | "CAREER_GOAL" | "FALLBACK";
	confidence: number;
}

export class CareerResolverService {
	async resolveTargetCareer(userId: string): Promise<ResolvedCareer> {
		const profile = await getOrInitializeProfile(userId);
		
		let resolvedCareer = "Software Engineer";
		let source: "SELECTED" | "AI_RECOMMENDED" | "CAREER_GOAL" | "FALLBACK" = "FALLBACK";
		let confidence = 10;
		
		// 1. Priority 1: User explicitly selected a career
		if (profile?.selectedCareer) {
			resolvedCareer = profile.selectedCareer;
			source = "SELECTED";
			confidence = 100;
		} 
		// 2. Priority 2: Highest AI recommendation
		else {
			const rec = await aiCacheService.getRecommendation(userId);
			if (rec) {
				if (rec.topCareer) {
					resolvedCareer = rec.topCareer;
					source = "AI_RECOMMENDED";
					confidence = 90;
				} else if (rec.recommendedCareers && rec.recommendedCareers.length > 0 && rec.recommendedCareers[0].title) {
					resolvedCareer = rec.recommendedCareers[0].title;
					source = "AI_RECOMMENDED";
					confidence = 85;
				}
			} 
			// 3. Priority 3: User's general career goal
			else if (profile?.careerGoal) {
				resolvedCareer = profile.careerGoal;
				source = "CAREER_GOAL";
				confidence = 70;
			}
		}

		return {
			career: CareerNormalizer.normalize(resolvedCareer),
			source,
			confidence,
		};
	}
}

export const careerResolver = new CareerResolverService();
