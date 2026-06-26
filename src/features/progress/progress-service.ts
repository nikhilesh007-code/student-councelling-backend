import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";

export class ProgressService {
	async getDashboard(userId: string) {
		// 1. Gather real DB data in parallel
		const [profile, roadmapRecords, applications, aiCache, resumeAnalysis] =
			await Promise.all([
				prisma.studentProfile.findUnique({ where: { userId } }),
				prisma.roadmapProgress.findMany({ where: { userId } }),
				prisma.opportunityApplication.findMany({ where: { userId } }),
				prisma.aiCache.findUnique({ where: { userId } }),
				prisma.resumeAnalysis.findUnique({ where: { userId } }),
			]);

		// 2. Compute roadmap progress from real records
		const totalPhases = roadmapRecords.length;
		const completedPhases = roadmapRecords.filter(
			(r) => r.status === "COMPLETED",
		).length;
		const inProgressPhase = roadmapRecords.find(
			(r) => r.status === "IN_PROGRESS",
		);
		const firstNotStarted = roadmapRecords.find(
			(r) => r.status === "NOT_STARTED",
		);
		const currentMilestone = inProgressPhase
			? `Phase ${inProgressPhase.phaseId + 1}`
			: firstNotStarted
				? `Phase ${firstNotStarted.phaseId + 1}`
				: totalPhases > 0
					? "All phases complete"
					: "No roadmap generated";
		const roadmapPercentage =
			totalPhases > 0
				? Math.round((completedPhases / totalPhases) * 100)
				: 0;

		// 3. Compute skill data from profile and cached skill gap
		const learnedSkills = profile?.skills || [];
		const cachedRecommendation = aiCache?.recommendation as any;
		const skillGaps =
			cachedRecommendation?.skillGaps ||
			(aiCache?.skillGap as any) ||
			null;
		let missingSkills: string[] = [];
		const inProgressSkills: string[] = [];
		if (skillGaps) {
			if (Array.isArray(skillGaps)) {
				// skillGaps is array of { career, missingSkills, readinessScore }
				for (const gap of skillGaps) {
					if (Array.isArray(gap.missingSkills)) {
						missingSkills.push(...gap.missingSkills);
					}
				}
				missingSkills = [...new Set(missingSkills)];
			} else if (
				typeof skillGaps === "object" &&
				Array.isArray(skillGaps.missingSkills)
			) {
				missingSkills = skillGaps.missingSkills;
			}
		}

		// 4. Compute application stats from real records
		const applied = applications.length;
		const interviews = applications.filter(
			(a) => a.status === "INTERVIEW",
		).length;
		const offers = applications.filter(
			(a) => a.status === "OFFERED",
		).length;

		// 5. Build dbData from real sources
		const dbData = {
			roadmapProgress: {
				completed: completedPhases,
				total: totalPhases,
				percentage: roadmapPercentage,
				currentMilestone,
			},
			learnedSkills,
			inProgressSkills,
			missingSkills,
			applications: {
				applied,
				interviews,
				offers,
			},
		};

		// 6. Get AI insights (from cache or JIT generate)
		let aiData = aiCache?.progress as any;
		if (aiData && Object.keys(aiData).length > 0) {
			return { dbData, aiData };
		}

		// JIT Generation: Cache is empty, generate AI insights
		if (!resumeAnalysis || !resumeAnalysis.parsedData) {
			// No resume — return DB data with empty AI data
			return {
				dbData,
				aiData: {
					progressSummary:
						"Upload your resume to get personalized AI progress insights.",
					insights: [
						"Complete your profile to improve recommendations.",
						"Upload a resume for detailed skill gap analysis.",
						"Set a target career to unlock your learning roadmap.",
					],
					topStrength: profile?.skills?.[0] || "Not yet identified",
					topWeakness: "Resume not uploaded yet",
					nextSkill: "Upload resume to determine",
					weeklyRecommendation:
						"Start by uploading your resume to unlock the full progress dashboard.",
					estimatedReadiness: 0,
				},
			};
		}

		console.log(
			`[JIT PROGRESS] Generating progress analysis for user ${userId}...`,
		);

		const systemPrompt = `You are an expert career coach and progress tracker.
Analyze the candidate's parsed resume data to determine their progress, missing skills, and weekly actionable recommendations.

Parsed Resume JSON:
${JSON.stringify(resumeAnalysis.parsedData, null, 2)}

Profile Skills: ${learnedSkills.join(", ") || "None listed"}
Roadmap Progress: ${completedPhases}/${totalPhases} phases completed

Return purely JSON matching this exact structure:
{
  "progressSummary": "2-3 sentences summarizing their learning progress.",
  "insights": ["string", "string", "string"],
  "topStrength": "string",
  "topWeakness": "string",
  "nextSkill": "string (the most important missing skill to learn next)",
  "weeklyRecommendation": "1 specific task for this week",
  "estimatedReadiness": 60
}`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Progress Insights Generation",
				responseFormat: "json",
				userId,
			});

			const cleaned = response.response
				.replace(/```json/gi, "")
				.replace(/```/g, "")
				.trim();
			aiData = JSON.parse(cleaned);

			// Save back to DB
			await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: "jit-generated",
					progress: aiData,
					source: "groq",
				},
				update: {
					progress: aiData,
					generatedAt: new Date(),
				},
			});

			return { dbData, aiData };
		} catch (error: any) {
			console.error(
				`[JIT ERROR] Failed to generate progress analysis for user ${userId}:`,
				error.message,
			);

			// Return DB data with fallback AI data so page never crashes
			return {
				dbData,
				aiData: {
					progressSummary:
						"AI analysis is temporarily unavailable. Your database stats are shown above.",
					insights: [
						"AI insights will be available once the service recovers.",
					],
					topStrength: learnedSkills[0] || "Not yet identified",
					topWeakness: "Analysis pending",
					nextSkill: "Analysis pending",
					weeklyRecommendation:
						"Continue working on your current roadmap phase.",
					estimatedReadiness: roadmapPercentage,
				},
			};
		}
	}
}

export const progressService = new ProgressService();
