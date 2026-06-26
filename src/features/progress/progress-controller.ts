import type { Request, Response } from "express";
import { progressService } from "./progress-service";

export class ProgressController {
	async analyzeProgress(req: Request, res: Response) {
		try {
			const userId = req.body.userId;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized: missing userId" });
			}

			const data = await progressService.getDashboard(userId);
			res.status(200).json(data);
		} catch (error: any) {
			console.error("Progress analysis error:", error);
			// Return a safe fallback response so the frontend never crashes
			res.status(200).json({
				dbData: {
					roadmapProgress: { completed: 0, total: 0, percentage: 0, currentMilestone: "No data" },
					learnedSkills: [],
					inProgressSkills: [],
					missingSkills: [],
					applications: { applied: 0, interviews: 0, offers: 0 },
				},
				aiData: {
					progressSummary: error.message || "Failed to load progress analysis.",
					insights: ["Please ensure your profile is complete and a resume has been uploaded."],
					topStrength: "Not available",
					topWeakness: "Not available",
					nextSkill: "Not available",
					weeklyRecommendation: "Complete your profile and upload your resume to get started.",
					estimatedReadiness: 0,
				},
			});
		}
	}
}

export const progressController = new ProgressController();
