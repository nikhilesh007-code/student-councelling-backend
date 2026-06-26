import type { NextFunction, Request, Response } from "express";
import { AI_MODEL } from "../features/ai/config";

export function attachDebugMetadata(req: Request, res: Response, next: NextFunction) {
	const originalJson = res.json;

	res.json = function (body) {
		if (typeof body === "object" && body !== null && !Array.isArray(body)) {
			const source = res.locals.dataSource || "Prisma Database";
			const cacheHit = res.locals.cacheHit || false;
			let model;

			if (source === "gemini" || source === "cached_gemini" || source === "Gemini") {
				model = "gemini-2.5-flash";
			} else if (source === "groq" || source === "cached_groq" || source === "Groq") {
				model = AI_MODEL;
			} else if (source === "ollama" || source === "cached_ollama" || source === "Ollama") {
				model = "llama3:latest";
			}

			if (cacheHit) {
				console.log(`[CACHE] Cache HIT`);
			} else if (source !== "Prisma Database") {
				console.log(`[CACHE] Cache MISS`);
			}

			body._debug = {
				source,
				generatedAt: new Date().toISOString(),
				cacheHit,
				model,
			};
		}
		return originalJson.call(this, body);
	};

	next();
}
