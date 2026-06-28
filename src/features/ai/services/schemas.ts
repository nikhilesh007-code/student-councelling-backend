/**
 * Zod schemas and TypeScript types for AI responses.
 * These are shared across the orchestrator and other features.
 *
 * Previously part of gemini-service.ts — SDK usage has been moved
 * to the AI provider abstraction layer.
 */

import { z } from "zod";

// ─── Comprehensive Guidance Schema ──────────────────────────────────────────

export const LearningResourceSchema = z.object({
	title: z.string(),
	provider: z.string(),
	type: z.string(),
	skill: z.string(),
	difficulty: z.string(),
	duration: z.string().optional(),
	shortReason: z.string(),
	officialUrl: z.string(),
	priority: z.string(),
});

export const ComprehensiveGuidanceSchema = z.object({
	recommendedCareers: z.array(
		z.object({
			title: z.string(),
			matchPercentage: z.number(),
			reason: z.string(),
		}),
	),
	skillGaps: z.array(
		z.object({
			career: z.string(),
			missingSkills: z.array(z.string()),
			readinessScore: z.number(),
		}),
	),
	roadmap: z.array(
		z.object({
			step: z.string(),
			duration: z.string(),
			skills: z.array(z.string()).optional(),
			projects: z.array(z.string()).optional(),
			objective: z.string().optional(),
			completion: z.string().optional(),
		}),
	),
	resources: z.array(LearningResourceSchema).optional(),
	learningTopics: z.array(z.string()).optional(),
});

export type ComprehensiveGuidance = z.infer<typeof ComprehensiveGuidanceSchema>;

// ─── Student Profile Params ─────────────────────────────────────────────────

export interface StudentProfileParams {
	userId?: string;
	userType?: string;
	skills: string[];
	interests: string[];
	branch?: string | null;
	cgpa?: number | null;
	careerGoal?: string | null;
	experienceLevel?: string | null;
	preferredDomains?: string[];
	currentJobTitle?: string | null;
	companyName?: string | null;
	yearsOfExperience?: number | null;
	industry?: string | null;
	desiredRole?: string | null;
	currentSalary?: string | null;
	expectedSalary?: string | null;
	projects?: any;
	selectedCareer?: string | null;
}

// ─── Career Roadmap Schema ──────────────────────────────────────────────────

export const RoadmapPhaseSchema = z.object({
	phase: z.number(),
	title: z.string(),
	duration: z.string(),
	skills: z.array(z.string()),
	projects: z.array(z.string()),
	description: z.string(),
	objective: z.string(),
	completion: z.string(),
});

export const CareerRoadmapResponseSchema = z.object({
	career: z.string(),
	roadmap: z.array(RoadmapPhaseSchema),
});

export type CareerRoadmapResponse = z.infer<typeof CareerRoadmapResponseSchema>;

// ─── Opportunities Schema ───────────────────────────────────────────────────

export const OpportunityRecommendationSchema = z.object({
	title: z.string(),
	company: z.string(),
	companyLogo: z.string().optional(),
	location: z.string(),
	workMode: z.string(), // "Remote", "Hybrid", "Onsite"
	type: z.string(), // "Internship", "Job", "Hackathon", "Scholarship", "Competition"
	duration: z.string().optional(),
	stipend: z.string().optional(),
	deadline: z.string().optional(),
	applyUrl: z.string().optional(),
	requiredSkills: z.array(z.string()),
	description: z.string(),
	eligibility: z.string(),
	matchScore: z.string(), // "91%"
	matchReason: z.string(),
	recommendedPreparation: z.string(),
	estimatedDifficulty: z.string(),
});

export const OpportunitiesResponseSchema = z.object({
	opportunities: z.array(OpportunityRecommendationSchema),
});

export type OpportunityRecommendation = z.infer<typeof OpportunityRecommendationSchema>;
export type OpportunitiesResponse = z.infer<typeof OpportunitiesResponseSchema>;
