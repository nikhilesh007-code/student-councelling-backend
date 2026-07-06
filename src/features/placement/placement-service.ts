import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";
import { careerResolver } from "../career/career-resolver.service";
import { notificationService } from "../notifications/services/notification.service";

export class PlacementService {
	async getDashboard(userId: string) {
		let aiCache = await prisma.aiCache.findUnique({
			where: { userId },
		});

		if (aiCache && aiCache.placement && Object.keys(aiCache.placement).length > 0) {
			const placementData = aiCache.placement as any;
			if (placementData.schemaVersion === "2.1") {
				return this.normalizeResponse(placementData);
			} else {
				// Delete invalid/legacy cache
				await prisma.aiCache.update({
					where: { userId },
					data: { placement: {} },
				});
				aiCache = null;
			}
		}

		// JIT Generation: Cache is empty, so we must generate it.
		const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
		if (!studentProfile) {
			throw new Error("Profile not found. Please complete your profile first.");
		}

		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);

		const systemPrompt = `You are an expert Placement Preparation Coach for engineering students.
Your responsibility is ONLY to evaluate placement readiness based on the candidate's profile.

Do NOT perform resume analysis.
Do NOT perform skill-gap analysis.
Do NOT generate a career roadmap.

Candidate Profile:
- Target Career: ${targetCareer}
- Skills: ${studentProfile.skills?.join(", ") || "None"}
- Projects: ${JSON.stringify(studentProfile.projects) || "None"}
- Certifications: ${JSON.stringify(studentProfile.certifications) || "None"}
- CGPA: ${studentProfile.cgpa || "None"}
- Experience Level: ${studentProfile.experienceLevel || "None"}

Guardrails & Consistency Rules:
- The placement scores must be internally consistent.
- If Backend Readiness is below 40, Placement Confidence score should not exceed 80.
- If Coding Readiness is below 30, Product Company status cannot be "Ready".
- Interview Readiness scores must align with the strengths and weaknesses provided.
- Never contradict earlier sections.

IMPORTANT: The JSON schema below includes example numbers (like 78, 72, 90, 45) purely to show you the correct format and data type. These are NOT real answers — they are placeholders. You MUST replace every single number with your own fresh calculation based on THIS specific candidate's actual skills, projects, CGPA, and experience level above. Reusing any of these example numbers as-is (unless it is a genuine coincidence) is an error.

Return STRICT JSON exactly matching this schema:
{
  "schemaVersion": "2.1",
  "placementReadinessAssessment": "string (2-3 paragraphs evaluating placement readiness)",
  "technicalStrengths": [
    { "skill": "string", "importance": "High|Medium|Low", "reason": "string" }
  ],
  "technicalWeaknesses": [
    { "skill": "string", "importance": "High|Medium|Low", "reason": "string" }
  ],
  "companyEligibility": {
    "service": { "status": "Ready|Needs Improvement|Not Ready", "reason": "string" },
    "product": { "status": "Ready|Needs Improvement|Not Ready", "reason": "string" },
    "startup": { "status": "Ready|Needs Improvement|Not Ready", "reason": "string" }
  },
  "interviewReadiness": {
    "coding": { "score": 72, "reason": "string" },
    "frontend": { "score": 90, "reason": "string" },
    "backend": { "score": 45, "reason": "string" },
    "dbms": { "score": 65, "reason": "string" },
    "os": { "score": 50, "reason": "string" },
    "cn": { "score": 42, "reason": "string" },
    "aptitude": { "score": 70, "reason": "string" },
    "hr": { "score": 88, "reason": "string" }
  },
  "fivePlacementPriorities": ["string (exact 5 items, sorted highest to lowest priority, highly actionable)"],
  "missingPlacementRequirements": {
    "skills": ["string"],
    "projects": ["string"],
    "documents": ["string"]
  },
  "recruiterFeedback": "string (max 100 words, professional tone, mention one strength and one critical improvement)",
  "estimatedPlacementConfidence": {
    "score": 78,
    "category": "string (e.g. Moderately Ready)",
    "confidenceReason": "string"
  }
}`;

		try {
			const response = await aiService.generate(systemPrompt, {
				feature: "Placement Readiness Generation",
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
					placement: aiResult,
					source: "groq",
				},
				update: {
					placement: aiResult,
					generatedAt: new Date(),
				},
			});

			// Trigger Notification
			notificationService
				.create({
					userId,
					module: "PLACEMENT",
					priority: aiResult.estimatedPlacementConfidence?.score >= 80 ? "SUCCESS" : "INFO",
					type: "PLACEMENT_ANALYSIS_GENERATED",
					title: "Placement Readiness Evaluated",
					message: `Your placement readiness score is ${aiResult.estimatedPlacementConfidence?.score || 0}%.`,
					actionType: "VIEW_PLACEMENT",
					actionUrl: "/placement",
				})
				.catch((e) => console.error(e));

			return this.normalizeResponse(aiResult);
		} catch (error: any) {
			console.error(
				`[JIT ERROR] Failed to generate placement analysis for user ${userId}:`,
				error.message,
			);
			if (error.name === "RateLimitError") {
				throw new Error(
					"We're currently experiencing high traffic. Please try viewing your placement dashboard again in a few moments.",
				);
			}
			throw new Error("Failed to generate placement analysis.");
		}
	}

	/**
	 * Normalizes the AI response to match the exact shape the frontend expects.
	 */
	private normalizeResponse(raw: any): any {
		return {
			schemaVersion: raw.schemaVersion || "2.1",
			placementReadinessAssessment: raw.placementReadinessAssessment || "",
			technicalStrengths: Array.isArray(raw.technicalStrengths) ? raw.technicalStrengths : [],
			technicalWeaknesses: Array.isArray(raw.technicalWeaknesses) ? raw.technicalWeaknesses : [],
			companyEligibility: raw.companyEligibility || {
				service: { status: "Not Ready", reason: "" },
				product: { status: "Not Ready", reason: "" },
				startup: { status: "Not Ready", reason: "" },
			},
			interviewReadiness: raw.interviewReadiness || {
				coding: { score: 0, reason: "" },
				frontend: { score: 0, reason: "" },
				backend: { score: 0, reason: "" },
				dbms: { score: 0, reason: "" },
				os: { score: 0, reason: "" },
				cn: { score: 0, reason: "" },
				aptitude: { score: 0, reason: "" },
				hr: { score: 0, reason: "" },
			},
			fivePlacementPriorities: Array.isArray(raw.fivePlacementPriorities)
				? raw.fivePlacementPriorities
				: [],
			missingPlacementRequirements: raw.missingPlacementRequirements || {
				skills: [],
				projects: [],
				documents: [],
			},
			recruiterFeedback: raw.recruiterFeedback || "",
			estimatedPlacementConfidence: raw.estimatedPlacementConfidence || {
				score: 0,
				category: "Unknown",
				confidenceReason: "",
			},
		};
	}
}

export const placementService = new PlacementService();
