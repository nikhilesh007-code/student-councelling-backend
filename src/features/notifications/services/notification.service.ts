import type { Prisma } from "@prisma/client";
import { prisma } from "../../../database";

export interface CreateNotificationDto {
	userId: string;
	module: string;
	priority?: string; // e.g. INFO, SUCCESS, WARNING, ERROR, ACHIEVEMENT, REMINDER
	type: string;
	title: string;
	message: string;
	actionType?: string; // e.g. VIEW_PROFILE, VIEW_RESUME, etc.
	taskId?: string;
	actionUrl?: string;
	icon?: string;
	metadata?: any;
	scheduledFor?: Date;
	expiresAt?: Date;
}

export class NotificationService {
	async create(data: CreateNotificationDto) {
		// Duplicate protection
		// same user, same title, same module, last 60 seconds
		const oneMinuteAgo = new Date(Date.now() - 60000);

		const existing = await prisma.notification.findFirst({
			where: {
				userId: data.userId,
				module: data.module,
				title: data.title,
				createdAt: {
					gte: oneMinuteAgo,
				},
			},
		});

		if (existing) {
			// Skip duplicate
			return existing;
		}

		return prisma.notification.create({
			data: {
				userId: data.userId,
				module: data.module,
				priority: data.priority || "INFO",
				type: data.type,
				title: data.title,
				message: data.message,
				actionType: data.actionType,
				taskId: data.taskId,
				actionUrl: data.actionUrl,
				icon: data.icon,
				metadata: data.metadata || {},
				scheduledFor: data.scheduledFor,
				expiresAt: data.expiresAt,
			},
		});
	}

	// Keep for backwards compatibility during refactor
	async createNotification(data: any) {
		return this.create({
			...data,
			module: data.module || "SYSTEM",
			priority: data.priority || "INFO",
		});
	}

	async getNotifications(
		userId: string,
		options: {
			page?: number;
			limit?: number;
			module?: string;
			read?: boolean;
			search?: string;
		} = {},
	) {
		const page = options.page || 1;
		const limit = options.limit || 20;
		const skip = (page - 1) * limit;

		const where: Prisma.NotificationWhereInput = {
			userId,
			...(options.module && { module: options.module }),
			...(options.read !== undefined && { isRead: options.read }),
			...(options.search && {
				OR: [
					{ title: { contains: options.search, mode: "insensitive" } },
					{ message: { contains: options.search, mode: "insensitive" } },
				],
			}),
		};

		const [notifications, total] = await Promise.all([
			prisma.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			prisma.notification.count({ where }),
		]);

		return {
			notifications,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		};
	}

	async getUnreadCount(userId: string) {
		return prisma.notification.count({
			where: {
				userId,
				isRead: false,
				OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
			},
		});
	}

	// Used for bell dropdown
	async getUnreadNotifications(userId: string) {
		return prisma.notification.findMany({
			where: {
				userId,
				isRead: false,
				OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
			},
			orderBy: { createdAt: "desc" },
			take: 7,
		});
	}

	async markRead(userId: string, id: string) {
		return prisma.notification.updateMany({
			where: { id, userId },
			data: { isRead: true },
		});
	}

	async markAllRead(userId: string) {
		return prisma.notification.updateMany({
			where: { userId, isRead: false },
			data: { isRead: true },
		});
	}

	async deleteById(userId: string, id: string) {
		return prisma.notification.deleteMany({
			where: { id, userId },
		});
	}

	async deleteAll(userId: string) {
		return prisma.notification.deleteMany({
			where: {
				userId,
				module: {
					not: "SYSTEM",
				},
			},
		});
	}
}

export const notificationService = new NotificationService();
