import crypto from "crypto";
import { prisma } from "../../../database";
import { generateAndCacheOpportunities } from "../../ai/services/opportunities-orchestrator";
import { careerResolver } from "../../career/career-resolver.service";

export class OpportunitiesService {
	async getOpportunities(userId: string | undefined, filters: any) {
		const { search, type, location, remote, sortBy = "Newest" } = filters;

		let personalizedOpps: any[] = [];
		let aiProfile: any = null;

		if (userId) {
			aiProfile = await prisma.aiCache.findUnique({ where: { userId } });
			const userProfile = await prisma.studentProfile.findUnique({ where: { userId } });

			if (!aiProfile || !userProfile) {
				throw new Error("User profile or AI cache not found");
			}

			// If AI opportunities not generated yet, generate them and wait
			if (!aiProfile.opportunities) {
				const currentHash = "opps-hash-" + Date.now();
				const newOpps = await generateAndCacheOpportunities(
					userId,
					userProfile as any,
					currentHash,
				);
				if (newOpps) {
					personalizedOpps = newOpps.opportunities;
				}
			} else {
				personalizedOpps = (aiProfile.opportunities as any).opportunities || [];
			}
		}

		// Find roadmap completion percentage
		let roadmapScore = 0;
		let completedPhases = 0;
		if (userId) {
			const allPhases = await prisma.roadmapProgress.findMany({ where: { userId } });
			completedPhases = allPhases.filter((p) => p.status === "COMPLETED").length;
			const total = Math.max(allPhases.length, 1);
			roadmapScore = Math.min(10, Math.round((completedPhases / total) * 10));
		}

		// Now fetch all from global Opportunity table to get bookmarks/applications
		const hashIds = personalizedOpps.map((opp) => {
			const slug = `${opp.title}-${opp.company}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
			return crypto.createHash("md5").update(slug).digest("hex").substring(0, 16);
		});

		const where: any = {};
		if (userId && hashIds.length > 0) {
			where.id = { in: hashIds };
		}

		if (search) {
			where.OR = [
				{ title: { contains: search, mode: "insensitive" } },
				{ company: { contains: search, mode: "insensitive" } },
				{ requiredSkills: { hasSome: [search] } },
			];
		}
		if (type && type !== "All") where.type = type;
		if (location && location !== "All")
			where.location = { contains: location, mode: "insensitive" };
		if (remote === "true") where.workMode = "Remote";

		const opps = await prisma.opportunity.findMany({
			where,
			orderBy: { postedDate: "desc" },
			include: {
				bookmarks: userId ? { where: { userId } } : false,
				applications: userId ? { where: { userId } } : false,
			},
		});

		// Merge AI personalized reasoning and calculate score
		// Since we throw if userProfile or aiProfile is not found, we can guarantee them if userId exists
		let studentProfile: any = null;
		let targetCareer = "";
		if (userId) {
			studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
			const resolved = await careerResolver.resolveTargetCareer(userId);
			targetCareer = resolved.career;
		}

		const processedOpps = opps.map((opp) => {
			const pData = personalizedOpps.find((p) => {
				const slug = `${p.title}-${p.company}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				const hashId = crypto.createHash("md5").update(slug).digest("hex").substring(0, 16);
				return hashId === opp.id;
			});

			let calculatedScore = 0;
			if (userId && aiProfile && studentProfile) {
				const recommendation = aiProfile.recommendation as any;
				const recommendedSkills = recommendation?.recommendedCareers?.[0]?.skills || [];

				// 1. Career Match (0-40)
				let careerScore = 5; // else
				const oppTitle = opp.title.toLowerCase();
				const targetLower = targetCareer.toLowerCase();

				if (targetLower && oppTitle === targetLower) {
					careerScore = 40;
				} else if (targetLower && oppTitle.includes(targetLower)) {
					careerScore = 40;
				} else if (
					targetLower &&
					(oppTitle.includes(targetLower.split(" ")[0]) ||
						(opp.type === "Internship" && targetLower.includes("developer")))
				) {
					careerScore = 30; // same domain
				} else if (
					targetLower &&
					(oppTitle.includes("engineer") || oppTitle.includes("developer"))
				) {
					careerScore = 20; // related
				}

				// 2. Skill Match (0-30)
				const reqSkills = opp.requiredSkills.map((s) => s.toLowerCase());
				const recSkillsLower = recommendedSkills.map((s: string) => s.toLowerCase());
				let skillScore = 0;
				if (reqSkills.length > 0) {
					const commonSkills = reqSkills.filter(
						(s) =>
							recSkillsLower.includes(s) ||
							studentProfile.skills.map((st: string) => st.toLowerCase()).includes(s),
					).length;
					skillScore = Math.round((commonSkills / reqSkills.length) * 30);
				} else {
					skillScore = 15;
				}

				// 3. Missing Skill Penalty (0 to -15)
				const skillGap = aiProfile.skillGap as any;
				const missingSkills =
					skillGap?.[0]?.missingSkills?.map((s: string) => s.toLowerCase()) || [];
				let penalty = 0;
				if (reqSkills.length > 0 && missingSkills.length > 0) {
					const missingCount = reqSkills.filter((s) => missingSkills.includes(s)).length;
					penalty = Math.min(15, missingCount * 3);
				}

				// 4. Roadmap Score (already computed globally as roadmapScore)

				// 5. Education / Experience Score (0-5)
				let eduScore = 2;
				if (studentProfile.experienceLevel === "Intermediate" || studentProfile.cgpa >= 8.0)
					eduScore = 4;
				if (opp.type === "Internship") eduScore = 5;

				calculatedScore = careerScore + skillScore + roadmapScore + eduScore - penalty;

				// Add deterministic offset for uniqueness
				const offset = (opp.title.length + opp.company.length) % 4;
				calculatedScore += offset;

				// Clamp between 15 and 99
				calculatedScore = Math.max(15, Math.min(99, Math.round(calculatedScore || 0)));

				console.log({
					opportunityTitle: opp.title,
					recommendedCareer: targetCareer || "No AI recommendation",
					opportunitySkills: opp.requiredSkills.join(", ") || "No skills found",
					profileSkills: studentProfile.skills?.join(", ") || "No skills found",
					roadmapCompletion: `${completedPhases} phases`,
					careerScore,
					skillScore,
					roadmapScore,
					educationScore: eduScore,
					penalty,
					finalScore: calculatedScore,
				});
			} else {
				console.log("Missing required data for scoring:", {
					userId,
					hasAiProfile: !!aiProfile,
					hasStudentProfile: !!studentProfile,
				});
				// Fallback if not logged in
				calculatedScore = 50 + (opp.title.length % 40);
			}

			let matchLevel = "Moderate";
			if (calculatedScore >= 90) matchLevel = "Excellent";
			else if (calculatedScore >= 80) matchLevel = "Strong";
			else if (calculatedScore >= 70) matchLevel = "Good";

			const generatedReasons = pData?.matchReason ? [pData.matchReason] : [];
			if (generatedReasons.length === 0 && calculatedScore > 0) {
				generatedReasons.push(`Matches your profile with a score of ${calculatedScore}%`);
			}

			return {
				...opp,
				matchPercentage: calculatedScore,
				matchLevel,
				matchReason: generatedReasons,
				recommendedPreparation: pData?.recommendedPreparation || "",
				estimatedDifficulty: pData?.estimatedDifficulty || "",
				isBookmarked: userId ? opp.bookmarks.length > 0 : false,
				hasApplied: userId ? opp.applications.length > 0 : false,
				bookmarks: undefined,
				applications: undefined,
			};
		});

		// Apply sorting
		if (sortBy === "Highest Match" && userId) {
			processedOpps.sort((a, b) => b.matchPercentage - a.matchPercentage);
		} else if (sortBy === "Deadline Soon") {
			processedOpps.sort((a, b) => {
				if (!a.deadline) return 1;
				if (!b.deadline) return -1;
				return a.deadline.getTime() - b.deadline.getTime();
			});
		}

		return processedOpps;
	}

	async toggleBookmark(userId: string, opportunityId: string) {
		const existing = await prisma.opportunityBookmark.findUnique({
			where: { userId_opportunityId: { userId, opportunityId } },
		});

		if (existing) {
			await prisma.opportunityBookmark.delete({ where: { id: existing.id } });
			return { bookmarked: false };
		} else {
			await prisma.opportunityBookmark.create({ data: { userId, opportunityId } });
			return { bookmarked: true };
		}
	}

	async markApplied(userId: string, opportunityId: string) {
		const existing = await prisma.opportunityApplication.findUnique({
			where: { userId_opportunityId: { userId, opportunityId } },
		});

		if (!existing) {
			await prisma.opportunityApplication.create({ data: { userId, opportunityId } });
		}
		return { applied: true };
	}
}

export const opportunitiesService = new OpportunitiesService();
