import type { Request, Response } from "express";
import { opportunitiesService } from "../services/opportunities-service";
import { notificationService } from "../../notifications/services/notification.service";

export class OpportunitiesController {
	async getOpportunities(req: Request, res: Response) {
		try {
			const { userId, search, type, location, remote, sortBy } = req.body;
			const opportunities = await opportunitiesService.getOpportunities(userId, {
				search,
				type,
				location,
				remote,
				sortBy,
			});
			console.log(`[OPPORTUNITIES] Generated opportunities for user ${userId}`);
			res.json({ success: true, data: opportunities });
		} catch (error: any) {
			console.error(`[ERROR] Failed to fetch opportunities: ${error.message || "Unknown error"}`);
			res.status(500).json({ success: false, message: error.message });
		}
	}

	async toggleBookmark(req: Request, res: Response) {
		try {
			const { userId, opportunityId } = req.body;
			if (!userId || !opportunityId)
				return res.status(400).json({ success: false, message: "Missing params" });
			const result = await opportunitiesService.toggleBookmark(userId, opportunityId);

			if (result.bookmarked) {
				notificationService.create({
					userId,
					module: 'OPPORTUNITIES',
					priority: 'INFO',
					type: 'OPPORTUNITY_BOOKMARKED',
					title: 'Opportunity Saved',
					message: 'You have successfully saved an opportunity to your bookmarks.',
					actionType: 'VIEW_OPPORTUNITIES',
					actionUrl: '/opportunities'
				}).catch(e => console.error(e));
			}

			res.json({ success: true, data: result });
		} catch (error: any) {
			console.error("Error toggling bookmark:", error);
			res.status(500).json({ success: false, message: error.message });
		}
	}

	async markApplied(req: Request, res: Response) {
		try {
			const { userId, opportunityId } = req.body;
			if (!userId || !opportunityId)
				return res.status(400).json({ success: false, message: "Missing params" });
			const result = await opportunitiesService.markApplied(userId, opportunityId);

			notificationService.create({
				userId,
				module: 'OPPORTUNITIES',
				priority: 'ACHIEVEMENT',
				type: 'OPPORTUNITY_APPLIED',
				title: 'Application Submitted',
				message: 'Great job! You have marked an opportunity as applied.',
				actionType: 'VIEW_OPPORTUNITIES',
				actionUrl: '/opportunities'
			}).catch(e => console.error(e));

			res.json({ success: true, data: result });
		} catch (error: any) {
			console.error("Error marking applied:", error);
			res.status(500).json({ success: false, message: error.message });
		}
	}
}

export const opportunitiesController = new OpportunitiesController();
