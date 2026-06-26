import type { Request, Response } from "express";
import { prisma } from "../../../database";
import { getOrchestratedGuidance } from "../../ai/services/guidance-orchestrator";

async function generateAndCacheGeminiResults(userId: string, profile: any) {
	try {

		let interests: string[] = [];
		if (typeof profile.interests === "string") {
			interests = (profile.interests as string).split(",").map((i) => i.trim());
		} else if (Array.isArray(profile.interests)) {
			interests = profile.interests;
		}

		await getOrchestratedGuidance(
			userId,
			{
				...profile,
				skills: profile.skills || [],
				interests,
			},
			true,
		); // forceRegenerate = true

	} catch (error) {
		console.error(`[AI ERROR] Failed to precache orchestrated guidance for ${userId}`, error);
	}
}

export async function createProfile(req: Request, res: Response) {
	try {
		const {
			userId,
			userType,
			experienceLevel,
			preferredDomains,
			projects,
			university,
			degree,
			semester,
			branch,
			year,
			cgpa,
			academicProjects,
			certifications,
			currentJobTitle,
			companyName,
			yearsOfExperience,
			industry,
			desiredRole,
			currentSalary,
			expectedSalary,
			interests,
			careerGoal,
			leetCode,
		} = req.body;

		const parsedYear = year ? parseInt(year) : null;
		const parsedCgpa = cgpa ? parseFloat(cgpa) : null;
		const parsedYearsOfExperience = yearsOfExperience ? parseFloat(yearsOfExperience) : null;

		const profile = await prisma.studentProfile.create({
			data: {
				userId,
				userType,
				experienceLevel,
				preferredDomains: preferredDomains || [],
				projects,
				university,
				degree,
				semester,
				branch,
				year: Number.isNaN(parsedYear) ? null : parsedYear,
				cgpa: Number.isNaN(parsedCgpa) ? null : parsedCgpa,
				academicProjects: academicProjects || [],
				certifications: certifications || [],
				currentJobTitle,
				companyName,
				yearsOfExperience: Number.isNaN(parsedYearsOfExperience) ? null : parsedYearsOfExperience,
				industry,
				desiredRole,
				currentSalary,
				expectedSalary,
				skills: req.body.skills || [],
				interests: interests || [],
				careerGoal,
				leetCode,
			},
		});

		res.status(201).json({
			success: true,
			data: profile,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to create profile",
		});
	}
}

export async function getProfile(req: Request, res: Response) {
	try {
		const { userId } = req.params;

		const profile = await prisma.studentProfile.findUnique({
			where: {
				userId: userId as string,
			},
			include: { user: true },
		});

		if (profile) {
			// Flatten name so frontend can use it easily
			(profile as any).name = (profile as any).user?.name;
		}

		res.status(200).json({
			success: true,
			data: profile,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Failed to fetch profile",
		});
	}
}
export async function updateProfile(req: Request, res: Response) {
	try {
		const {
			userId,
			name,
			userType,
			experienceLevel,
			preferredDomains,
			projects,
			university,
			degree,
			semester,
			branch,
			year,
			cgpa,
			academicProjects,
			certifications,
			currentJobTitle,
			companyName,
			yearsOfExperience,
			industry,
			desiredRole,
			currentSalary,
			expectedSalary,
			skills,
			interests,
			careerGoal,
			phone,
			bio,
			github,
			linkedin,
			leetCode,
		} = req.body;

		if (name) {
			await prisma.user.update({
				where: { id: userId },
				data: { name },
			});
		}

		const parsedYear = year ? parseInt(year) : null;
		const parsedCgpa = cgpa ? parseFloat(cgpa) : null;
		const parsedYearsOfExperience = yearsOfExperience ? parseFloat(yearsOfExperience) : null;

		const profileData = {
			userType,
			experienceLevel,
			preferredDomains: preferredDomains || [],
			projects,
			university,
			degree,
			semester,
			branch,
			year: Number.isNaN(parsedYear) ? null : parsedYear,
			cgpa: Number.isNaN(parsedCgpa) ? null : parsedCgpa,
			academicProjects,
			certifications,
			currentJobTitle,
			companyName,
			yearsOfExperience: Number.isNaN(parsedYearsOfExperience) ? null : parsedYearsOfExperience,
			industry,
			desiredRole,
			currentSalary,
			expectedSalary,
			skills: skills || [],
			interests: interests || [],
			careerGoal,
			phone,
			bio,
			github,
			linkedin,
			leetCode,
		};

		const profile = await prisma.studentProfile.upsert({
			where: {
				userId,
			},
			create: {
				userId,
				...profileData,
			},
			update: {
				...profileData,
			},
			include: { user: true },
		});

		// Invalidate AI cache when profile changes
		try {
			if (prisma.aiCache) {
				await prisma.aiCache.delete({ where: { userId } });
			}
		} catch (cacheError) {
			console.error(`[AI CACHE INVALIDATION FAILED] for ${userId}`, cacheError);
		}

		// Trigger Gemini background generation
		generateAndCacheGeminiResults(userId, profile).catch((e) => {
			console.error(`[AI ERROR] Background generation failed for ${userId}`, e);
		});

		(profile as any).name = profile.user?.name;

		res.status(200).json({
			success: true,
			data: profile,
		});
	} catch (error) {
		console.error("Failed to update profile", error);
		res.status(500).json({
			success: false,
			message: "Failed to update profile",
		});
	}
}

export async function updateTargetCareer(req: Request, res: Response) {
	try {
		const { userId, selectedCareer } = req.body;

		if (!userId || !selectedCareer) {
			return res.status(400).json({ success: false, message: "Missing userId or selectedCareer" });
		}

		const profile = await prisma.studentProfile.update({
			where: { userId },
			data: { selectedCareer },
		});

		// Invalidate AI cache when career changes so the new roadmap can be generated
		try {
			if (prisma.aiCache) {
				await prisma.aiCache.delete({ where: { userId } });
			}
		} catch (cacheError) {
			console.error(`[AI CACHE INVALIDATION FAILED] for ${userId}`, cacheError);
		}

		// Trigger Gemini background generation for the newly selected career
		generateAndCacheGeminiResults(userId, profile).catch((e) => {
			console.error(`[AI ERROR] Background generation failed for ${userId}`, e);
		});

		res.status(200).json({
			success: true,
			data: profile,
		});
	} catch (error) {
		console.error("Failed to update target career", error);
		res.status(500).json({
			success: false,
			message: "Failed to update target career",
		});
	}
}
