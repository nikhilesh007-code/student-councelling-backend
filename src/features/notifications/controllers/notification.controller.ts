import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service";

export const getNotifications = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 20;
		const module = req.query.module as string;
		const search = req.query.search as string;
		let read: boolean | undefined;

		if (req.query.read === "true") read = true;
		if (req.query.read === "false") read = false;

		const result = await notificationService.getNotifications(userId, {
			page,
			limit,
			module,
			read,
			search,
		});
		res.json({ success: true, ...result });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const getUnreadCount = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		const count = await notificationService.getUnreadCount(userId);
		res.json({ success: true, count });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const getUnreadNotifications = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		const notifications = await notificationService.getUnreadNotifications(userId);
		res.json({ success: true, notifications });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const markRead = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		const id = req.params.id as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		await notificationService.markRead(userId, id);
		res.json({ success: true });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const markAllRead = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		await notificationService.markAllRead(userId);
		res.json({ success: true });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const deleteById = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		const id = req.params.id as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		await notificationService.deleteById(userId, id);
		res.json({ success: true });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};

export const deleteAll = async (req: Request, res: Response) => {
	try {
		const userId = (req.query.userId || req.body?.userId) as string;
		if (!userId) return res.status(400).json({ error: "userId required" });

		await notificationService.deleteAll(userId);
		res.json({ success: true });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};
