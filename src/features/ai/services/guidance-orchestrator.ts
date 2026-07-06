import crypto from "crypto";
import { prisma } from "../../../database";
import { aiService } from "../ai-service";
import {
	type ComprehensiveGuidance,
	ComprehensiveGuidanceSchema,
	type StudentProfileParams,
} from "./schemas";

/**
 * Builds the comprehensive guidance prompt from a student profile.
 */
function buildGuidancePrompt(
	profile: StudentProfileParams,
	parsedResume?: any,
	normalizedSkills?: string[],
): string {
	const isProfessional = profile.userType === "Working Professional";
	const profileDetails = isProfessional
		? `- Current Job Title: ${profile.currentJobTitle || "Not specified"}
- Company: ${profile.companyName || "Not specified"}
- Years of Experience: ${profile.yearsOfExperience || "Not specified"}
- Industry: ${profile.industry || "Not specified"}
- Current Salary: ${profile.currentSalary || "Not specified"}
- Expected Salary: ${profile.expectedSalary || "Not specified"}
- Desired Role: ${profile.desiredRole || "Not specified"}`
		: `- Branch: ${profile.branch || "Not specified"}
- CGPA: ${profile.cgpa || "Not specified"}
- Career Goal: ${profile.careerGoal || "Not specified"}`;

	const instructionFocus = isProfessional
		? `Focus your output on Career Switching, Promotion Readiness, Salary Growth, Upskilling, and Leadership Paths.`
		: `Focus your output on Internships, Certifications, Learning Roadmaps, and Entry-Level Careers.`;

	return `You are an expert career counsellor and skill gap analyzer.
Analyze the user's profile comprehensively.

User Profile:
- User Type: ${profile.userType || "Student"}
- Selected Target Career: ${profile.selectedCareer || "Not specified (infer from profile)"}
- Experience Level: ${profile.experienceLevel || "Not specified"}
- Skills: ${normalizedSkills ? normalizedSkills.join(", ") : profile.skills.length > 0 ? profile.skills.join(", ") : "None specified"}
- Interests: ${profile.interests.length > 0 ? profile.interests.join(", ") : "None specified"}
- Preferred Domains: ${profile.preferredDomains && profile.preferredDomains.length > 0 ? profile.preferredDomains.join(", ") : "None specified"}
${profileDetails}
- Projects Context: ${profile.projects ? JSON.stringify(profile.projects) : "None"}

${
	parsedResume
		? `
We have also parsed their uploaded resume. Here is their highly detailed structured data:
Parsed Resume Context:
${JSON.stringify(parsedResume, null, 2)}
`
		: ""
}

${instructionFocus}

Generate a highly concise JSON response containing:
1. Exactly 3 recommended careers with match percentage and a short 1-2 line reason. If "Selected Target Career" is specified, make sure it is the #1 recommended career.
2. Skill gap analysis for these careers. MUST USE CANONICAL SKILL NAMES (e.g. "Node.js", "Express.js", "JavaScript", "React", "TypeScript", "MongoDB", "Docker").
3. A specific, detailed 5-8 phase roadmap to achieve the #1 recommended career (incorporate their existing skills).
4. Extract exactly 5-8 highly specific "learningTopics" based on the user's missing skills. 
   - These should be specific technologies, concepts, or frameworks (e.g., "React", "Node.js", "System Design", "Docker").
   - Do NOT generate full resources, only the topic names.

Return ONLY a single valid JSON object that perfectly matches this exact schema structure:
{
  "recommendedCareers": [{"title": "str", "matchPercentage": 0, "reason": "str"}],
  "skillGaps": [{"career": "str", "missingSkills": ["str"], "readinessScore": 0}],
  "roadmap": [{"step": "str", "objective": "str", "duration": "str", "skills": ["str"], "projects": ["str"], "completion": "str"}],
  "learningTopics": ["str"]
}`;
}

/**
 * Parses raw AI response text into validated ComprehensiveGuidance.
 */
function parseGuidanceResponse(rawText: string): ComprehensiveGuidance {
	let text = rawText.trim();
	if (text.startsWith("```json")) {
		text = text
			.replace(/^```json/, "")
			.replace(/```$/, "")
			.trim();
	}
	const parsedJson = JSON.parse(text);
	return ComprehensiveGuidanceSchema.parse(parsedJson);
}

// Background generation worker
async function generateAndCacheInBackground(
	userId: string,
	profile: StudentProfileParams,
	currentHash: string,
	parsedResume?: any,
) {
	let source = "gemini";
	let comprehensiveGuidance: ComprehensiveGuidance | null = null;

	try {
		const prompt = buildGuidancePrompt(profile, parsedResume);
		const aiResponse = await aiService.generate(prompt, {
			feature: "Career Guidance & Skill Gap (BG)",
			responseFormat: "json",
			userId,
		});

		comprehensiveGuidance = parseGuidanceResponse(aiResponse.response);
		source = aiResponse.provider.toLowerCase();

		if (aiResponse.fallbackUsed) {
		}
	} catch (error: any) {
		console.error(`[BACKGROUND ERROR] AI generation failed for user ${userId}:`, error.message);

		// Revert status to indicate it is no longer refreshing, but keep old data
		await prisma.aiCache.updateMany({
			where: { userId, source: "refresh-in-progress" },
			data: { source: "gemini-cache" }, // arbitrary fallback source so it stops being "refresh-in-progress"
		});
		return;
	}

	if (comprehensiveGuidance) {
		try {
			await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: currentHash,
					recommendation: comprehensiveGuidance as any,
					source: source,
				},
				update: {
					profileHash: currentHash,
					recommendation: comprehensiveGuidance as any,
					generatedAt: new Date(),
					source: source,
				},
			});
		} catch (error) {
			console.error(`[BACKGROUND ERROR] Failed to update cache for user ${userId}:`, error);
		}
	}
}

export async function getOrchestratedGuidance(
	userId: string,
	profile: StudentProfileParams,
	forceRegenerate: boolean = false,
): Promise<ComprehensiveGuidance> {
	const hashData = {
		careerGoal: profile.careerGoal || "",
		skills: profile.skills ? profile.skills.sort() : [],
		interests: profile.interests ? profile.interests.sort() : [],
		preferredDomains: profile.preferredDomains ? profile.preferredDomains.sort() : [],
		userType: profile.userType || "Student",
	};
	const currentHash = crypto.createHash("sha256").update(JSON.stringify(hashData)).digest("hex");

	const [cache, resumeAnalysis] = await Promise.all([
		prisma.aiCache.findUnique({ where: { userId } }),
		prisma.resumeAnalysis.findUnique({ where: { userId } }),
	]);
	const parsedResume = resumeAnalysis?.parsedData;

	if (cache && cache.recommendation) {
		const isHashStale = cache.profileHash !== currentHash;
		const isTimeStale = Date.now() - cache.generatedAt.getTime() > 24 * 60 * 60 * 1000;
		const isStale = isHashStale || isTimeStale || forceRegenerate;

		const cachedRes = cache.recommendation as unknown as ComprehensiveGuidance;

		if (!isStale) {
			(cachedRes as any)._meta = {
				source: `cached_${cache.source}`,
				cacheHit: true,
				isRefreshing: false,
			};
			return cachedRes;
		}

		// Cache is stale or force regenerate requested

		const shouldBlockAndRegenerate = isHashStale || forceRegenerate;

		if (!shouldBlockAndRegenerate) {
			if (cache.source === "refresh-in-progress") {
				console.log(
					`[ORCHESTRATOR] Background refresh already in progress for user ${userId}. Returning stale cache.`,
				);
				(cachedRes as any)._meta = {
					source: "refresh-in-progress",
					cacheHit: true,
					isRefreshing: true,
				};
				return cachedRes;
			} else {
				console.log(
					`[ORCHESTRATOR] Triggering background refresh for user ${userId}. Returning stale cache immediately.`,
				);

				// Mark as refreshing in DB
				await prisma.aiCache.update({
					where: { userId },
					data: { source: "refresh-in-progress" },
				});

				// Fire and forget background worker
				generateAndCacheInBackground(userId, profile, currentHash, parsedResume).catch((err) => {
					console.error(`[ORCHESTRATOR FATAL] Background worker crashed:`, err);
				});

				(cachedRes as any)._meta = {
					source: `cached_${cache.source}`,
					cacheHit: true,
					isRefreshing: true,
				};
				return cachedRes;
			}
		}
	}

	// No cache exists at all
	console.log(
		`[ORCHESTRATOR] Cache MISS (No history) for user ${userId}. Must block and wait for generation...`,
	);

	let comprehensiveGuidance: ComprehensiveGuidance | null = null;
	let source = "gemini";

	try {
		// Import careerContextService dynamically if needed to prevent circular dependencies
		const { careerContextService } = await import("../../career/career-context.service");
		const context = await careerContextService.buildContext(userId);

		const prompt = buildGuidancePrompt(profile, parsedResume, context.normalizedSkills);
		const aiResponse = await aiService.generate(prompt, {
			feature: "Career Guidance & Skill Gap",
			responseFormat: "json",
			userId,
		});

		comprehensiveGuidance = parseGuidanceResponse(aiResponse.response);
		source = aiResponse.provider.toLowerCase();

		if (aiResponse.fallbackUsed) {
		}
	} catch (error: any) {
		console.error(
			`[ORCHESTRATOR ERROR] All AI providers failed for user ${userId}:`,
			error.message,
		);

		if (error.name === "RateLimitError" && cache && cache.recommendation) {
			const cachedRes = cache.recommendation as unknown as ComprehensiveGuidance;
			(cachedRes as any)._meta = {
				source: `cached_${cache.source}`,
				cacheHit: true,
				isRefreshing: false,
			};
			return cachedRes;
		}

		throw new Error(
			"AI recommendations temporarily unavailable. All providers failed and no cache exists.",
		);
	}

	// Update Cache
	if (comprehensiveGuidance) {
		try {
			await prisma.aiCache.upsert({
				where: { userId },
				create: {
					userId,
					profileHash: currentHash,
					recommendation: comprehensiveGuidance as any,
					source: source,
				},
				update: {
					profileHash: currentHash,
					recommendation: comprehensiveGuidance as any,
					generatedAt: new Date(),
					source: source,
				},
			});
		} catch (error) {
			console.error(`[ORCHESTRATOR ERROR] Failed to update cache for user ${userId}:`, error);
		}
	}

	(comprehensiveGuidance as any)._meta = { source: source, cacheHit: false, isRefreshing: false };
	return comprehensiveGuidance as ComprehensiveGuidance;
}
