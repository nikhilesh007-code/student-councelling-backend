import { StudyTaskStatus } from "@prisma/client";
import cron from "node-cron";
import { prisma } from "../../../database";
import { notificationService } from "../../notifications/services/notification.service";

export const initReminderScheduler = () => {
	// Run every minute
	cron.schedule("* * * * *", async () => {
		try {
			const now = new Date();

			// 1. Find pending tasks that are scheduled for now or slightly past, and reminder not sent
			const pendingTasks = await prisma.studyTask.findMany({
				where: {
					status: StudyTaskStatus.PENDING,
					reminderSent: false,
					scheduledAt: {
						lte: now,
						gte: new Date(now.getTime() - 15 * 60000), // Within the last 15 minutes
					},
				},
			});

			for (const task of pendingTasks) {
				await notificationService.createNotification({
					userId: task.userId,
					type: "STUDY_REMINDER",
					title: "Study Reminder",
					message: `It's time to study: ${task.title}`,
					taskId: task.id,
					actionUrl: "/planner",
					icon: "menu_book",
				});

				await prisma.studyTask.update({
					where: { id: task.id },
					data: { reminderSent: true },
				});
			}

			// 2. Mark PENDING tasks as MISSED if scheduledAt is way in the past (e.g., > 1 hour ago)
			// This is a simple threshold.
			const pastThreshold = new Date(now.getTime() - 60 * 60000);
			await prisma.studyTask.updateMany({
				where: {
					status: StudyTaskStatus.PENDING,
					scheduledAt: { lt: pastThreshold },
				},
				data: { status: StudyTaskStatus.MISSED },
			});
		} catch (error) {
			console.error("[CRON] Error running reminder scheduler", error);
		}
	});

	console.log("[CRON] Reminder scheduler initialized");
};
