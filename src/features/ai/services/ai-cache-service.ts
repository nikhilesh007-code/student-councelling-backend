import { prisma } from "../../../database";

export class AiCacheService {
	async getRecommendation(userId: string) {
		const aiCache = await prisma.aiCache.findUnique({ where: { userId } });
		
		if (!aiCache) {
			return null;
		}

		// The orchestrator stores the comprehensive guidance under 'recommendation'
		const recommendation = aiCache.recommendation as any;
		
		if (!recommendation) {
			return null;
		}

		return recommendation;
	}
}

export const aiCacheService = new AiCacheService();
