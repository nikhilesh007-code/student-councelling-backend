import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { getOrchestratedGuidance } from "../../ai/services/guidance-orchestrator";

export async function generateCareerGuidance(req: Request, res: Response) {
	try {
		const { userId, regenerate } = req.body;

		const profile = await prisma.studentProfile.findUnique({
			where: {
				userId,
			},
			select: {
				careerGoal: true,
				skills: true,
				interests: true,
				branch: true,
				cgpa: true,
				userType: true,
				experienceLevel: true,
				preferredDomains: true,
				currentJobTitle: true,
				companyName: true,
				yearsOfExperience: true,
				industry: true,
				desiredRole: true,
				currentSalary: true,
				expectedSalary: true,
				projects: true,
			},
		});

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "Student profile not found",
			});
		}

		const guidance = await getOrchestratedGuidance(userId, profile as any, regenerate);
		if ((guidance as any)._meta) {
			res.locals.dataSource = (guidance as any)._meta.source;
			res.locals.cacheHit = (guidance as any)._meta.cacheHit;
		}

		if (!guidance || !guidance.recommendedCareers || guidance.recommendedCareers.length === 0) {
			return res.status(500).json({
				success: false,
				message: "AI failed to generate recommendations.",
			});
		}

		return res.status(200).json({
			success: true,
			topCareers: guidance.recommendedCareers,
			aiExplanation:
				(guidance as any).insights && (guidance as any).insights.length > 0
					? (guidance as any).insights[0]
					: "Based on your unique profile, here are the top matching careers.",
			insights: (guidance as any).insights,
			roadmap: guidance.roadmap,
			_meta: (guidance as any)._meta,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Career guidance failed",
		});
	}
}
