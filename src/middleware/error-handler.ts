import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
	if (err instanceof AppError) {
		return res.status(err.statusCode).json({
			success: false,
			message: err.message,
		});
	}

	console.error("Unhandled error:", err);

	return res.status(500).json({
		success: false,
		message: "Internal server error",
	});
}
