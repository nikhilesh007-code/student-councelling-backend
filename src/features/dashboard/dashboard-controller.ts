import type { Request, Response } from "express";
import { dashboardService } from "./dashboard-service";

export class DashboardController {
	async getDashboard(req: Request, res: Response) {
		try {
			const userId = req.query.userId as string;
			if (!userId) {
				return res.status(401).json({ success: false, error: "Unauthorized: missing userId" });
			}

			const summary = await dashboardService.getDashboardSummary(userId);
			res.status(200).json({ success: true, data: summary });
		} catch (error: any) {
			console.error("Dashboard controller error:", error);
			// Return safe fallback
			res.status(200).json({
				success: true,
				data: {
					careerMatch: null,
					progress: 0,
					studyStats: { completedTasks: 0, completedResources: 0 },
					upcomingTasks: [],
					recommendedCareers: [],
					internships: [],
					learningResources: [],
					recentActivity: [],
					aiInsight: null,
					onboarding: {
						score: 0,
						profileCompleted: false,
						careerGuidanceCompleted: false,
						roadmapCompleted: false,
						skillGapCompleted: false,
						plannerCompleted: false,
					},
				},
			});
		}
	}
}

export const dashboardController = new DashboardController();
