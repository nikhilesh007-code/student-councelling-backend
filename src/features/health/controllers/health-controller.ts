import type { Request, Response } from "express";
import { env } from "../../../config/env";
import { prisma } from "../../../database";

export async function getHealth(_req: Request, res: Response) {
	const uptime = process.uptime();

	let dbStatus: "healthy" | "unhealthy" = "unhealthy";
	try {
		await prisma.$queryRaw`SELECT 1`;
		dbStatus = "healthy";
	} catch {
		dbStatus = "unhealthy";
	}

	const status = dbStatus === "healthy" ? "healthy" : "degraded";

	res.status(200).json({
		success: true,
		status,
		timestamp: new Date().toISOString(),
		environment: env.NODE_ENV,
		uptime: Math.floor(uptime),
		services: {
			database: dbStatus,
		},
	});
}
