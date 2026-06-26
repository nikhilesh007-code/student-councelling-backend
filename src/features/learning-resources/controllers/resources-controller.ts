import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { getOrchestratedGuidance } from "../../ai/services/guidance-orchestrator";
import { careerResolver } from "../../career/career-resolver.service";

export async function getLearningResources(req: Request, res: Response) {
	try {
		const { userId } = req.body;

		const profile = await prisma.studentProfile.findUnique({
			where: { userId },
			select: {
				selectedCareer: true,
				careerGoal: true,
				skills: true,
				interests: true,
				branch: true,
				cgpa: true,
				userType: true,
			},
		});

		if (!profile) {
			return res.status(404).json({ success: false, message: "Profile not found" });
		}

		let guidance = await getOrchestratedGuidance(userId, profile as any);

		// If the guidance doesn't have resources (e.g. from an old cache), force regenerate
		if (!guidance.resources || guidance.resources.length === 0) {
			guidance = await getOrchestratedGuidance(userId, profile as any, true);
		}

		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);

		console.log(`[RESOURCES] Generated resources for user ${userId}`);
		res.status(200).json({
			success: true,
			header: {
				targetCareer,
			},
			resources: guidance.resources || [],
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Unknown error";
		console.error(`[ERROR] Failed to fetch resources: ${reason}`);
		res.status(500).json({ success: false, message: "Failed to fetch resources" });
	}
}
