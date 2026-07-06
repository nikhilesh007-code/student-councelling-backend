import { StudyTaskStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { notificationService } from "../../notifications/services/notification.service";
import { studyPlannerService } from "../services/study-planner.service";

export const generatePlan = async (req: Request, res: Response) => {
	try {
		const userId = (req.body?.userId || req.query?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		// Optional: save preferences if sent in request
		if (req.body?.preferences) {
			const { planType, startDate, replaceExisting, ...prismaPrefs } = req.body.preferences;
			if (Object.keys(prismaPrefs).length > 0) {
				await studyPlannerService.setPreferences(userId, prismaPrefs);
			}
		}

		const tasks = await studyPlannerService.generatePlan(userId, req.body?.preferences || {});

		// Trigger Notification
		notificationService
			.create({
				userId,
				module: "STUDY",
				priority: "SUCCESS",
				type: "PLAN_GENERATED",
				title: "Study Plan Generated",
				message: "Your new AI-powered study plan has been successfully created.",
				actionType: "VIEW_STUDY_PLAN",
				actionUrl: "/planner",
			})
			.catch((e) => console.error(e));

		res.json({ success: true, tasks });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const getTasks = async (req: Request, res: Response) => {
	try {
		const userId = (req.query?.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		const tasks = await studyPlannerService.getTasks(userId);
		res.json({ success: true, tasks });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const updateTaskStatus = async (req: Request, res: Response) => {
	try {
		const userId = (req.body?.userId || req.query?.userId) as string;
		const id = req.params.id as string;
		const { status } = req.body || {};
		if (!userId) return res.status(400).json({ error: "userId required" });
		if (!Object.values(StudyTaskStatus).includes(status)) {
			return res.status(400).json({ error: "Invalid status" });
		}

		const task = await studyPlannerService.updateTaskStatus(userId, id, status as StudyTaskStatus);

		let priority = "INFO";
		let type = "TASK_UPDATED";
		let title = "Task Updated";

		if (status === "COMPLETED") {
			priority = "SUCCESS";
			type = "TASK_COMPLETED";
			title = "Task Completed";
		} else if (status === "IN_PROGRESS") {
			type = "TASK_STARTED";
			title = "Task Started";
		} else if (status === "SKIPPED") {
			type = "TASK_SKIPPED";
			title = "Task Skipped";
		}

		notificationService
			.create({
				userId,
				module: "STUDY",
				priority,
				type,
				title,
				message: `You marked task "${task.title}" as ${status.replace("_", " ").toLowerCase()}.`,
				actionType: "VIEW_STUDY_PLAN",
				actionUrl: "/planner",
			})
			.catch((e) => console.error(e));

		res.json({ success: true, task });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const getStatistics = async (req: Request, res: Response) => {
	try {
		const userId = (req.query?.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		const stats = await studyPlannerService.getStatistics(userId);
		res.json({ success: true, stats });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const archivePlan = async (req: Request, res: Response) => {
	try {
		const userId = (req.body?.userId || req.query?.userId) as string;
		const planId = req.params.planId as string;
		if (!userId) return res.status(400).json({ error: "userId required" });
		if (!planId) return res.status(400).json({ error: "planId required" });

		const result = await studyPlannerService.archivePlan(userId, planId);

		notificationService
			.create({
				userId,
				module: "STUDY",
				priority: "INFO",
				type: "PLAN_DELETED",
				title: "Study Plan Archived",
				message: "Your study plan has been securely archived.",
				actionType: "VIEW_STUDY_PLAN",
				actionUrl: "/planner",
			})
			.catch((e) => console.error(e));

		res.json(result);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};
