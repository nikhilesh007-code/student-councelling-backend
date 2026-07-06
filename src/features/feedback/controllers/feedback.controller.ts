import type { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { notificationService } from "../../notifications/services/notification.service";
import { feedbackService } from "../services/feedback.service";

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads", "feedback");
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for disk storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, "feedback-" + uniqueSuffix + ext);
	},
});

export const uploadFeedbackImage = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
	fileFilter: (req, file, cb) => {
		const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
		if (allowedMimeTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error("Only PNG, JPG, and JPEG formats are allowed"));
		}
	},
});

export class FeedbackController {
	async createFeedback(req: Request, res: Response) {
		try {
			const { category, module, subject, description, priority } = req.body;
			const userId = (req as any).user?.id || req.body.userId;

			if (!userId) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			if (!subject || subject.trim().length === 0) {
				return res.status(400).json({ error: "Subject is required" });
			}

			if (!description || description.trim().length < 20) {
				return res.status(400).json({ error: "Description must be at least 20 characters long" });
			}

			if (description.length > 1000) {
				return res.status(400).json({ error: "Description cannot exceed 1000 characters" });
			}

			let attachmentUrl: string | null = null;
			if (req.file) {
				// Create an accessible URL path for the static serve
				attachmentUrl = `/uploads/feedback/${req.file.filename}`;
			}

			const feedback = await feedbackService.create({
				userId,
				category,
				module,
				subject,
				description,
				priority: priority || "Low",
				attachmentUrl,
			});

			// Send a system notification on success
			await notificationService.createNotification({
				userId,
				module: "SYSTEM",
				type: "FEEDBACK_SUBMITTED",
				title: "Feedback submitted successfully",
				message: `Your ${category} regarding ${module} has been received.`,
				priority: "INFO",
			});

			res.status(201).json({ success: true, feedback });
		} catch (error: any) {
			console.error("Error creating feedback:", error);
			res.status(500).json({ error: error.message || "Internal server error" });
		}
	}

	async getMyFeedback(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id || req.query.userId;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const feedback = await feedbackService.getUserFeedback(userId);
			res.status(200).json({ success: true, feedback });
		} catch (error: any) {
			console.error("Error fetching feedback:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}

	async deleteFeedback(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id || req.body.userId || req.query.userId;
			const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

			if (!userId) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			await feedbackService.deleteFeedback(userId, id);
			res.status(200).json({ success: true });
		} catch (error: any) {
			console.error("Error deleting feedback:", error);
			// Determine if error is unauthorized or bad request
			const status = error.message === "Unauthorized" ? 403 : 400;
			res.status(status).json({ error: error.message });
		}
	}
}

export const feedbackController = new FeedbackController();
