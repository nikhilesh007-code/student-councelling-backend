import { Prisma } from "@prisma/client";
import { prisma } from "../../../database";

export interface CreateFeedbackDto {
	userId: string;
	category: string;
	module: string;
	subject: string;
	description: string;
	priority: string;
	attachmentUrl?: string | null;
}

export class FeedbackService {
	async create(data: CreateFeedbackDto) {
		return prisma.feedback.create({
			data: {
				userId: data.userId,
				category: data.category,
				module: data.module,
				subject: data.subject,
				description: data.description,
				priority: data.priority,
				attachmentUrl: data.attachmentUrl,
			},
		});
	}

	async getUserFeedback(userId: string) {
		return prisma.feedback.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		});
	}

	async deleteFeedback(userId: string, id: string) {
		// Check if the feedback belongs to the user and is OPEN
		const feedback = await prisma.feedback.findUnique({
			where: { id },
		});

		if (!feedback) {
			throw new Error("Feedback not found");
		}

		if (feedback.userId !== userId) {
			throw new Error("Unauthorized");
		}

		if (feedback.status !== "OPEN") {
			throw new Error("Only open feedback reports can be deleted");
		}

		return prisma.feedback.delete({
			where: { id },
		});
	}
}

export const feedbackService = new FeedbackService();
