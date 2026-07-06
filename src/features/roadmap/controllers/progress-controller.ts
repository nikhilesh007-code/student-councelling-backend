import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { notificationService } from "../../notifications/services/notification.service";

export async function getRoadmapProgress(req: Request, res: Response) {
	try {
		const userIdFromQuery = req.query.userId as string;
		const userIdFromBody = req.body.userId as string;
		const targetUserId = userIdFromQuery || userIdFromBody;
		const career = (req.query.career as string) || (req.body.career as string);

		if (!targetUserId) {
			return res.status(400).json({ success: false, message: "userId is required" });
		}
		if (!career) {
			return res.status(400).json({ success: false, message: "career is required" });
		}

		const progress = await prisma.roadmapProgress.findMany({
			where: { userId: targetUserId, career: career },
		});

		return res.status(200).json({ success: true, progress });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, message: "Failed to get progress" });
	}
}

export async function updatePhaseStatus(req: Request, res: Response) {
	try {
		const { phaseId } = req.params;
		const { userId, career, status } = req.body; // status: NOT_STARTED, IN_PROGRESS or COMPLETED

		if (!userId) {
			return res.status(400).json({ success: false, message: "userId is required" });
		}
		if (!career) {
			return res.status(400).json({ success: false, message: "career is required" });
		}

		if (!status || !["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status" });
		}

		const parsedPhaseId = parseInt(phaseId as string, 10);
		if (isNaN(parsedPhaseId)) {
			return res.status(400).json({ success: false, message: "Invalid phaseId" });
		}

		const progress = await prisma.roadmapProgress.upsert({
			where: {
				userId_career_phaseId: {
					userId: userId,
					career: career,
					phaseId: parsedPhaseId,
				},
			},
			create: {
				userId,
				career,
				phaseId: parsedPhaseId,
				status,
				completedAt: status === "COMPLETED" ? new Date() : null,
			},
			update: {
				status,
				completedAt: status === "COMPLETED" ? new Date() : null,
			},
		});

		if (status === "COMPLETED") {
			notificationService
				.create({
					userId,
					module: "ROADMAP",
					priority: "ACHIEVEMENT",
					type: "PHASE_COMPLETED",
					title: "Roadmap Milestone Completed",
					message: `Congratulations! You completed Phase ${parsedPhaseId + 1} of your ${career} roadmap.`,
					actionType: "VIEW_ROADMAP",
					actionUrl: "/roadmap",
				})
				.catch((e) => console.error(e));
		}

		return res.status(200).json({ success: true, progress });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, message: "Failed to update progress" });
	}
}
