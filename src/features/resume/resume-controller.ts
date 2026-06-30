import type { Request, Response } from "express";
import { resumeMatchService } from "./resume-match-service";
import { resumeOrchestrator } from "./resume-orchestrator.service";
import { notificationService } from "../notifications/services/notification.service";

export class ResumeController {
	async upload(req: Request, res: Response) {
		try {
			const userId = req.body.userId;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized: missing userId" });
			}

			if (!req.file) {
				return res.status(400).json({ error: "No file uploaded" });
			}

			const fileBuffer = req.file.buffer;
			const fileName = req.file.originalname;
			const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + " MB";

			const text = await resumeOrchestrator.extractText(fileBuffer);

			// Trigger Notification
			notificationService.create({
				userId,
				module: 'RESUME',
				priority: 'INFO',
				type: 'RESUME_UPLOADED',
				title: 'Resume uploaded',
				message: `Successfully uploaded ${fileName} (${fileSizeMb}).`,
				actionType: 'VIEW_RESUME',
				actionUrl: '/resume'
			}).catch(e => console.error(e));

			res.status(200).json({
				fileName,
				fileSizeMb,
				resumeText: text,
			});
		} catch (error: any) {
			console.error("Resume upload error:", error);
			res.status(500).json({ error: error.message || "Failed to extract text from resume" });
		}
	}

	async analyze(req: Request, res: Response) {
		try {
			const { userId, resumeText, targetCareer, fileName, fileSizeMb } = req.body;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized: missing userId" });
			}

			if (!resumeText) {
				return res.status(400).json({ error: "Missing resumeText" });
			}

			const analysis = await resumeOrchestrator.processResume(
				userId,
				resumeText,
				targetCareer,
				fileName || "resume.pdf",
				fileSizeMb || "0 MB",
			);

			res.status(200).json(analysis);
		} catch (error: any) {
			console.error("Resume analysis error:", error);
			res.status(500).json({ error: error.message || "Failed to analyze resume" });
		}
	}

	async getAnalysis(req: Request, res: Response) {
		try {
			const userId = req.body.userId;
			if (!userId) {
				return res.status(401).json({ error: "Unauthorized: missing userId" });
			}

			const analysis = await resumeOrchestrator.getAnalysis(userId);
			res.status(200).json(analysis); // can be null if not analyzed yet
		} catch (error: any) {
			console.error("Get resume analysis error:", error);
			res.status(500).json({ error: error.message || "Failed to get resume analysis" });
		}
	}

	async analyzeResumeMatch(req: Request, res: Response) {
		const { userId } = req.body;

		if (!userId) {
			return res.status(400).json({ success: false, error: "Missing userId" });
		}

		try {
			const matchData = await resumeMatchService.analyzeMatch(userId);
			res.status(200).json({ success: true, match: matchData });
		} catch (error: any) {
			console.error("Analyze resume match error:", error);
			res
				.status(500)
				.json({ success: false, error: error.message || "Failed to analyze resume match" });
		}
	}
}

export const resumeController = new ResumeController();
