import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { getOrchestratedGuidance } from "../../ai/services/guidance-orchestrator";
import { careerContextService } from "../../career/career-context.service";
import { notificationService } from "../../notifications/services/notification.service";
import { LearningResourceService } from "../services/learning-resource-service";

export async function getLearningResources(req: Request, res: Response) {
	try {
		const { userId } = req.body;

		const context = await careerContextService.buildContext(userId);
		const profile = context.rawProfile;

		let guidance = await getOrchestratedGuidance(userId, profile as any);

		let rawTopics: string[] = [];

		if (guidance.learningTopics && guidance.learningTopics.length > 0) {
			rawTopics = guidance.learningTopics;
		} else if (guidance.resources && guidance.resources.length > 0) {
			// Legacy migration: extract topics from old resources
			rawTopics = guidance.resources.map((r: any) => r.skill || r.topic || r.title);
		} else {
			// If neither exist, force regenerate
			guidance = await getOrchestratedGuidance(userId, profile as any, true);
			rawTopics = guidance.learningTopics || [];
		}

		// Filter out any undefined or empty strings
		rawTopics = rawTopics.filter(Boolean);

		const targetCareer = context.targetCareer;
		
		// Add Target Career to the front of the topics list so we fetch resources for it
		if (targetCareer && !rawTopics.includes(targetCareer)) {
			rawTopics.unshift(targetCareer);
		}

		const aggregatedResources = await LearningResourceService.getAggregatedResources(rawTopics);

		console.log(`[RESOURCES] Generated aggregated resources for user ${userId}`);

		// Only notify if we actually generated new guidance
		if ((guidance as any)?._meta?.cacheHit === false) {
			notificationService.create({
				userId,
				module: 'RESOURCES',
				priority: 'SUCCESS',
				type: 'RESOURCES_GENERATED',
				title: 'Learning Resources Generated',
				message: `New curated learning resources are available for ${targetCareer}.`,
				actionType: 'VIEW_RESOURCES',
				actionUrl: '/resources'
			}).catch(e => console.error(e));
		}

		res.status(200).json({
			success: true,
			header: {
				targetCareer,
			},
			resources: aggregatedResources,
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Unknown error";
		console.error(`[ERROR] Failed to fetch resources: ${reason}`);
		res.status(500).json({ success: false, message: "Failed to fetch resources" });
	}
}
