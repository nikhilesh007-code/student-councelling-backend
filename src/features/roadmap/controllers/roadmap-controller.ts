import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { getOrchestratedGuidance } from "../../ai/services/guidance-orchestrator";
import { roadmapAnalysisService } from "../services/roadmap-analysis-service";
import { careerResolver } from "../../career/career-resolver.service";

export async function generateCareerRoadmap(req: Request, res: Response) {
	try {
		const { userId, regenerate } = req.body;

		const profile = await prisma.studentProfile.findUnique({
			where: {
				userId,
			},
			select: {
				selectedCareer: true,
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

		const { career } = await careerResolver.resolveTargetCareer(userId);

		if (!guidance || !guidance.roadmap || guidance.roadmap.length === 0) {
			return res.status(500).json({
				success: false,
				message: "AI failed to generate roadmap.",
			});
		}

		const progressRecords = await prisma.roadmapProgress.findMany({
			where: { userId, career: career as string },
		});

		// Calculate stats
		let completedPhases = 0;
		let firstIncomplete = -1;

		// Format phases with joined DB status
		const formattedRoadmap = guidance.roadmap.map((step: any, index: number) => {
			const record = progressRecords.find(p => p.phaseId === index);
			const status = record?.status || "NOT_STARTED";
			
			if (status === "COMPLETED") {
				completedPhases++;
			} else if (firstIncomplete === -1) {
				firstIncomplete = index;
			}

			return {
				id: index,
				phase: index + 1,
				title: step.step,
				duration: step.duration,
				skills: step.skills || [],
				projects: step.projects || [],
				description: step.objective || "", 
				objective: step.objective || "",
				completion: step.completion || "",
				status: status,
				progress: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0,
				items: (step.skills || []).map((s: string) => ({
					name: s,
					done: status === 'COMPLETED'
				}))
			};
		});

		const totalPhases = formattedRoadmap.length;
		const overallProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
		
		if (firstIncomplete === -1 && completedPhases === totalPhases && totalPhases > 0) {
			firstIncomplete = totalPhases - 1; // Last phase
		}
		const currentStage = `Phase ${firstIncomplete + 1} of ${totalPhases}`;

		// Get summary & insights from progress cache, or fallback
		const aiCache = await prisma.aiCache.findUnique({ where: { userId } });
		let summary = "Your personalized step-by-step career roadmap to achieve your goals.";
		let insights: string[] = [];

		if (aiCache && aiCache.progress) {
			const p = aiCache.progress as any;
			if (p.progressSummary) summary = p.progressSummary;
			if (p.insights && Array.isArray(p.insights)) insights = p.insights;
		}

		if (insights.length === 0 && guidance.roadmap.length >= 3) {
			insights = [
				`Focus on ${guidance.roadmap[0].step} first to build a solid foundation.`,
				`Your major milestone will be ${guidance.roadmap[Math.floor(guidance.roadmap.length / 2)].step}.`,
				`Complete all ${totalPhases} phases to become placement ready as a ${career}.`
			];
		}

		console.log(`[ROADMAP] Generated roadmap for user ${userId}`);
		return res.status(200).json({
			success: true,
			career: career,
			summary,
			insights,
			overallProgress,
			currentStage,
			phases: formattedRoadmap,
			_meta: (guidance as any)._meta,
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Unknown error";
		console.error(`[ERROR] Failed to generate roadmap: ${reason}`);
		res.status(500).json({
			success: false,
			message: reason,
		});
	}
}

export async function analyzeRoadmap(req: Request, res: Response) {
	try {
		const { userId } = req.body;
		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized: missing userId" });
		}
		const data = await roadmapAnalysisService.analyzeRoadmap(userId);
		console.log(`[ROADMAP] Analyzed roadmap for user ${userId}`);
		res.status(200).json({ success: true, analysis: data });
	} catch (error: any) {
		console.error(`[ERROR] Failed to analyze roadmap: ${error.message || "Unknown error"}`);
		res.status(500).json({ success: false, message: error.message || "Failed to analyze roadmap" });
	}
}
