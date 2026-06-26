import type { Request, Response } from "express";
import { placementService } from "./placement-service";

export class PlacementController {
	async getDashboard(req: Request, res: Response) {
		try {
			const userId = req.body.userId;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized: missing userId" });
			}

			const dashboardData = await placementService.getDashboard(userId);
			res.status(200).json(dashboardData);
		} catch (error: any) {
			console.error("Placement dashboard error:", error);
			res.status(500).json({ error: error.message || "Failed to fetch placement dashboard" });
		}
	}
}

export const placementController = new PlacementController();
