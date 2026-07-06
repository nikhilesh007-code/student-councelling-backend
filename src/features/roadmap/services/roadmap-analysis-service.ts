import { prisma } from "../../../database";
import { SkillNormalizer } from "../../../utils/normalizers";
import { aiService } from "../../ai/ai-service";
import { careerContextService } from "../../career/career-context.service";
import { careerResolver } from "../../career/career-resolver.service";
import { getOrInitializeProfile } from "../../users/services/profile-service";

export class RoadmapAnalysisService {
	async analyzeRoadmap(userId: string) {
		let aiCache = await prisma.aiCache.findUnique({
			where: { userId },
		});

		if (aiCache && aiCache.roadmapAnalysis && Object.keys(aiCache.roadmapAnalysis).length > 0) {
			return this.normalizeResponse(aiCache.roadmapAnalysis);
		}

		// JIT Generation: Cache is empty, so we must generate it.

		const profile = await getOrInitializeProfile(userId);

		const resumeAnalysis = await prisma.resumeAnalysis.findUnique({ where: { userId } });
		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);

		const systemPrompt = `You are an expert career planner and AI roadmap generator.
Create a highly detailed, phase-by-phase career roadmap based on the user's profile and existing skills.

User Profile:
- Target Career: ${targetCareer}
- Skills: ${profile.skills?.join(", ") || "None specified"}
- Interests: ${profile.interests?.join(", ") || "None specified"}
- Branch: ${profile.branch || "Not specified"}
- CGPA: ${profile.cgpa || "Not specified"}
- Overall Career Goal: ${profile.careerGoal || "Not specified"}
${
	resumeAnalysis?.parsedData && Object.keys(resumeAnalysis.parsedData).length > 0
		? `
Additionally, use this extracted data from their uploaded resume to enrich the roadmap:
Parsed Resume JSON:
${JSON.stringify(resumeAnalysis.parsedData, null, 2)}`
		: ""
}

Target Career: ${targetCareer}

Return purely JSON matching this exact structure:
{
  "targetCareer": "${targetCareer}",
  "estimatedDuration": "e.g., 6 months",
  "currentPhase": "e.g., Phase 2",
  "overallProgress": 15,
  "phases": [
    {
      "phase": 1,
      "title": "string",
      "objective": "string",
      "skills": ["string"],
      "projects": ["string"],
      "expectedOutcome": "string",
      "estimatedWeeks": "string",
      "completion": 100
    }
  ],
  "nextBestAction": {
    "title": "string",
    "description": "string",
    "priority": "High"
  }
}`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Career Roadmap Generation",
				responseFormat: "json",
				userId,
			});

			const cleaned = response.response
				.replace(/```json/gi, "")
				.replace(/```/g, "")
				.trim();
			const aiResult = JSON.parse(cleaned);

			// Save back to DB
			aiCache = await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: "jit-generated",
					roadmapAnalysis: aiResult,
					source: "groq",
				},
				update: {
					roadmapAnalysis: aiResult,
					generatedAt: new Date(),
				},
			});

			return this.normalizeResponse(aiResult);
		} catch (error: any) {
			console.error(`[JIT ERROR] Failed to generate roadmap for user ${userId}:`, error.message);
			if (error.name === "RateLimitError") {
				throw new Error(
					"We're currently experiencing high traffic. Please try viewing your roadmap again in a few moments.",
				);
			}
			throw new Error("Failed to generate career roadmap.");
		}
	}

	private normalizeResponse(raw: any) {
		const nextAction = {
			title: raw.nextBestAction?.title || raw.nextAction?.title || "Start learning today",
			reason:
				raw.nextBestAction?.description ||
				raw.nextAction?.reason ||
				"Begin the first phase of your roadmap.",
			duration: raw.nextBestAction?.duration || raw.nextAction?.duration || "1 week",
			priority: raw.nextBestAction?.priority || raw.nextAction?.priority || "High",
		};

		return {
			...raw,
			nextAction,
			milestonePrediction: raw.milestonePrediction || {
				internshipReady: "After core skills",
				placementReady: raw.estimatedDuration || "After roadmap completion",
				confidence: 85,
			},
			suggestedProjects:
				raw.suggestedProjects ||
				(raw.phases || []).flatMap((p: any) =>
					(p.projects || []).map((proj: string) => ({
						title: proj,
						difficulty: "Intermediate",
						reason: `Hands-on project for ${p.title || "this phase"}.`,
						skills: p.skills || [],
					})),
				),
		};
	}

	async getRoadmap(userId: string) {
		const rawRoadmap = await this.analyzeRoadmap(userId);

		// Fetch career context to determine dynamic progress
		const context = await careerContextService.buildContext(userId);
		const normalizedSkills = context.normalizedSkills || [];
		const normalizedSkillSet = new Set(normalizedSkills);

		const phases = rawRoadmap.phases || [];
		const totalPhases = phases.length;

		let furthestPhaseIndex = -1;
		const completedSkills: string[] = [];
		let remainingSkills: string[] = [];

		for (let i = 0; i < phases.length; i++) {
			const phaseSkills = phases[i].skills || [];
			const roadmapSkills = SkillNormalizer.normalizeArray(phaseSkills);
			const hasSkill = roadmapSkills.some((skill: string) => normalizedSkillSet.has(skill));
			if (hasSkill) {
				furthestPhaseIndex = i;
			}
		}

		let completedPhases = 0;
		let currentPhase = "Getting Started";
		let nextPhase = "Phase 1";
		let nextSkill = "Not yet identified";
		let overallProgress = 0;

		if (furthestPhaseIndex === -1) {
			completedPhases = 0;
			if (phases.length > 0) {
				currentPhase = phases[0].title;
				nextPhase = phases.length > 1 ? phases[1].title : "Completion";
				const p0Skills = SkillNormalizer.normalizeArray(phases[0].skills || []);
				nextSkill = p0Skills[0] || nextSkill;
				remainingSkills = phases.flatMap((p: any) =>
					SkillNormalizer.normalizeArray(p.skills || []),
				);
			}
		} else {
			const furthestPhaseSkills = SkillNormalizer.normalizeArray(
				phases[furthestPhaseIndex].skills || [],
			);
			const allFurthestComplete = furthestPhaseSkills.every((s: string) =>
				normalizedSkillSet.has(s),
			);

			console.log("=== DEBUG MATCHING ===");
			console.log("Normalized profile skills:", Array.from(normalizedSkillSet));
			console.log(`Normalized roadmap phase ${furthestPhaseIndex} skills:`, furthestPhaseSkills);
			console.log(
				"Matched:",
				furthestPhaseSkills.filter((s: string) => normalizedSkillSet.has(s)),
			);

			if (allFurthestComplete) {
				completedPhases = furthestPhaseIndex + 1;
				if (completedPhases < totalPhases) {
					currentPhase = phases[completedPhases].title;
					nextPhase =
						phases.length > completedPhases + 1 ? phases[completedPhases + 1].title : "Completion";
					const nextPhaseSkills = SkillNormalizer.normalizeArray(
						phases[completedPhases].skills || [],
					);
					nextSkill = nextPhaseSkills[0] || nextSkill;
				} else {
					currentPhase = "All phases complete";
					nextPhase = "Ready for the job market";
					nextSkill = "Ready for the job market";
				}
			} else {
				completedPhases = furthestPhaseIndex;
				currentPhase = phases[furthestPhaseIndex].title;
				nextPhase =
					phases.length > furthestPhaseIndex + 1
						? phases[furthestPhaseIndex + 1].title
						: "Completion";
				const missing = furthestPhaseSkills.find((s: string) => !normalizedSkillSet.has(s));
				if (missing) {
					nextSkill = missing;
				}
			}

			// Gather completed vs remaining
			for (let i = 0; i < phases.length; i++) {
				const pSkills = SkillNormalizer.normalizeArray(phases[i].skills || []);
				if (i < completedPhases) {
					completedSkills.push(...pSkills);
				} else if (i === completedPhases) {
					pSkills.forEach((s: string) => {
						if (normalizedSkillSet.has(s)) completedSkills.push(s);
						else remainingSkills.push(s);
					});
				} else {
					remainingSkills.push(...pSkills);
				}
			}
		}

		overallProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
		const remainingPhases = Math.max(0, totalPhases - completedPhases);

		// Return enriched payload
		return {
			...rawRoadmap,
			dynamicProgress: {
				overallProgress,
				completedPhases,
				remainingPhases,
				currentPhase,
				nextPhase,
				nextSkill,
				completedSkills,
				remainingSkills,
				estimatedCompletion: rawRoadmap.estimatedDuration || "Unknown",
			},
		};
	}
}

export const roadmapAnalysisService = new RoadmapAnalysisService();
