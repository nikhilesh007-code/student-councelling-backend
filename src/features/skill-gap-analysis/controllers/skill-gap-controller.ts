import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { resolveCareer } from "../../../utils/career-lookup";
import { getOrchestratedGuidance } from "../../ai/services/guidance-orchestrator";
import { careerResolver } from "../../career/career-resolver.service";

export async function analyzeSkillGap(req: Request, res: Response) {
	const start = Date.now();
	try {
		const { userId, targetCareer } = req.body;

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
			},
		});

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "Student profile not found",
			});
		}

		let interests: string[] = [];
		if (typeof profile.interests === "string") {
			interests = (profile.interests as string).split(",").map((i) => i.trim());
		} else if (Array.isArray(profile.interests)) {
			interests = profile.interests;
		}

		try {
			const guidance = await getOrchestratedGuidance(userId, profile as any);

			if ((guidance as any)._meta) {
				res.locals.dataSource = (guidance as any)._meta.source;
				res.locals.cacheHit = (guidance as any)._meta.cacheHit;
			}

			if (guidance && guidance.skillGaps && guidance.skillGaps.length > 0) {
				const resolved = targetCareer ? { career: targetCareer } : await careerResolver.resolveTargetCareer(userId);
				const resolvedTargetCareer = resolved.career;
				let targetGap = guidance.skillGaps.find(
					(g) =>
						resolvedTargetCareer &&
						g.career.toLowerCase().includes(resolvedTargetCareer.toLowerCase()),
				);
				if (!targetGap) {
					targetGap = guidance.skillGaps[0];
				}

				if (targetGap) {
					const matchedSkills = profile.skills.filter((s) => !targetGap.missingSkills.includes(s));

					let summary = "";
					if (targetGap.missingSkills.length === 0) {
						summary = `Excellent! You currently possess all the required skills for a ${targetGap.career} role.`;
					} else {
						summary = `You already have some required skills for becoming a ${targetGap.career}. Focus on learning ${targetGap.missingSkills.join(", ")} to improve your career readiness.`;
					}

					console.log(`[SKILL_GAP] Completed skill gap analysis for user ${userId}`);
					return res.status(200).json({
						success: true,
						career: targetGap.career,
						currentSkills: profile.skills,
						matchedSkills: matchedSkills,
						missingSkills: targetGap.missingSkills,
						skillMatches: [], // Legacy payload
						gapScore: 100 - targetGap.readinessScore,
						readinessScore: targetGap.readinessScore,
						summary: summary,
						_meta: (guidance as any)._meta,
					});
				}
			}
		} catch (aiError) {
			console.error(`[AI ERROR] Orchestrated guidance failed for ${userId}, falling back`, aiError);
		}

		res.locals.dataSource = "Fallback Engine";
		res.locals.cacheHit = false;

		let career = null;

		if (targetCareer) {
			career = await prisma.career.findUnique({
				where: { name: targetCareer },
				include: { skills: { include: { skill: true } } },
			});
			if (!career) {
				career = await prisma.career.findFirst({
					where: { name: { equals: targetCareer, mode: "insensitive" } },
					include: { skills: { include: { skill: true } } },
				});
			}
		}

		if (!career) {
			career = await resolveCareer(profile.careerGoal, profile.skills);
		}

		const dbTime = Date.now() - start;

		if (!career) {
			return res.status(404).json({
				success: false,
				message: "Career not found",
			});
		}

		const requiredSkills = career.skills.map((item) => item.skill.name);

		const studentSkills = profile.skills;

		const { matchSkills } = await import("../../skills/services/skill-similarity-service");
		const skillMatches = await matchSkills(requiredSkills, studentSkills);

		const matchedSkills = skillMatches
			.filter((m) => m.matchType === "Exact")
			.map((m) => m.requiredSkill);
		const missingSkills = skillMatches
			.filter((m) => m.matchType === "Missing")
			.map((m) => m.requiredSkill);

		let totalScore = 0;
		for (const match of skillMatches) {
			totalScore += match.score;
		}

		const readinessScore =
			requiredSkills.length > 0 ? Math.round(totalScore / requiredSkills.length) : 0;
		const gapScore = 100 - readinessScore;

		let summary = "";

		if (missingSkills.length === 0) {
			summary = `Excellent! You currently possess all the required skills for a ${career.name} role.`;
		} else {
			summary = `You already have ${matchedSkills.length} out of ${requiredSkills.length} required skills for becoming a ${career.name}. Focus on learning ${missingSkills.join(", ")} to improve your career readiness.`;
		}

		console.log(`[SKILL_GAP] Completed skill gap analysis for user ${userId}`);
		return res.status(200).json({
			success: true,
			career: career.name,
			currentSkills: studentSkills,
			matchedSkills,
			missingSkills,
			skillMatches,
			gapScore,
			readinessScore,
			summary,
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Unknown error";
		console.error(`[ERROR] Failed to analyze skill gap: ${reason}`);

		return res.status(500).json({
			success: false,
			message: reason,
		});
	}
}
