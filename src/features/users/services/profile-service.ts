import { prisma } from "../../../database";

export async function getOrInitializeProfile(userId: string) {
	if (!userId) {
		throw new Error("userId is required to fetch or initialize a profile.");
	}

	let profile = await prisma.studentProfile.findUnique({
		where: { userId },
		include: { user: true },
	});

	if (!profile) {
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new Error("User not found in the database. Cannot initialize profile.");
		}

		profile = await prisma.studentProfile.create({
			data: {
				userId: user.id,
				userType: "Student",
				careerGoal: "Software Engineer",
				skills: ["Programming Fundamentals", "Problem Solving"],
				interests: ["Software Development", "Technology"],
				experienceLevel: "Beginner",
			},
			include: { user: true },
		});
	}

	if (profile && profile.user && profile.user.name) {
		(profile as any).name = profile.user.name;
	}

	return profile;
}

export interface ProfileCompletionResult {
	percentage: number;
	missingFields: string[];
	completedFields: string[];
}

export async function calculateProfileCompletion(userId: string): Promise<ProfileCompletionResult> {
	const profile = await prisma.studentProfile.findUnique({ where: { userId } });
	const user = await prisma.user.findUnique({ where: { id: userId } });

	const missingFields: string[] = [];
	const completedFields: string[] = [];

	const isFilled = (value: any) => {
		if (value === null || value === undefined) return false;
		if (Array.isArray(value)) return value.length > 0;
		return value.toString().trim() !== "";
	};

	const coreFields = [
		{ name: "Name", value: user?.name },
		{ name: "Target Career", value: profile?.careerGoal || profile?.selectedCareer },
		{ name: "Skills", value: profile?.skills },
		{ name: "Interests", value: profile?.interests },
		{ name: "University", value: profile?.university },
		{ name: "Degree", value: profile?.degree },
		{ name: "Branch/Major", value: profile?.branch },
		{ name: "Year/Semester", value: profile?.year || profile?.semester },
	];

	const optionalFields = [
		{ name: "Bio", value: profile?.bio },
		{ name: "Phone Number", value: profile?.phone },
		{ name: "Experience Level", value: profile?.experienceLevel },
		{ name: "Portfolio Projects", value: profile?.projects },
		{ name: "GitHub Profile", value: profile?.github },
		{ name: "LinkedIn Profile", value: profile?.linkedin },
		{ name: "Certifications", value: profile?.certifications },
	];

	// Ensure Preferred Domains is not reported as missing if the user already has Professional Interests
	const hasInterests = isFilled(profile?.interests);
	if (!hasInterests || isFilled(profile?.preferredDomains)) {
		optionalFields.push({ name: "Preferred Domains", value: profile?.preferredDomains });
	}

	let coreCompletedCount = 0;
	for (const f of coreFields) {
		if (isFilled(f.value)) {
			completedFields.push(f.name);
			coreCompletedCount++;
		} else {
			missingFields.push(f.name);
		}
	}

	let optionalCompletedCount = 0;
	for (const f of optionalFields) {
		if (isFilled(f.value)) {
			completedFields.push(f.name);
			optionalCompletedCount++;
		} else {
			missingFields.push(f.name);
		}
	}

	// Core = 80%, Optional = 20%
	const corePercentage = coreFields.length > 0 ? (coreCompletedCount / coreFields.length) * 80 : 0;
	const optionalPercentage =
		optionalFields.length > 0 ? (optionalCompletedCount / optionalFields.length) * 20 : 0;
	const percentage = Math.round(corePercentage + optionalPercentage);

	return {
		percentage,
		missingFields,
		completedFields,
	};
}
