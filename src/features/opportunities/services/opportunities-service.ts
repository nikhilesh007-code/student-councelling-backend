import crypto from "crypto";
import { prisma } from "../../../database";
import { evaluateOpportunities } from "../../ai/services/opportunities-orchestrator";
import { careerContextService } from "../../career/career-context.service";
import { notificationService } from "../../notifications/services/notification.service";
import { getOrInitializeProfile } from "../../users/services/profile-service";
import { AdzunaProvider } from "../providers/adzuna-provider";
import { GithubProvider } from "../providers/github-provider";
import type { IOpportunityProvider, NormalizedOpportunity } from "../providers/provider";
import { RemotiveProvider } from "../providers/remotive-provider";

export class OpportunitiesService {
	private providers: IOpportunityProvider[] = [
		new AdzunaProvider(),
		new RemotiveProvider(),
		new GithubProvider(),
	];

	async getOpportunities(userId: string | undefined, filters: any) {
		const { search, type, location, remote, sortBy = "Newest" } = filters;

		let processedOpps: any[] = [];
		let profile: any = null;

		if (userId) {
			const context = await careerContextService.buildContext(userId);
			profile = context.rawProfile;
			profile.targetCareer = context.targetCareer;
			profile.skills = context.normalizedSkills;

			const profileString = `${context.targetCareer}-${(context.normalizedSkills || []).join(",")}`;
			const currentHash = crypto.createHash("md5").update(profileString).digest("hex");

			const aiCache = await prisma.aiCache.findUnique({ where: { userId } });
			const cachedOpps = aiCache?.opportunities as any;

			const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

			if (
				cachedOpps &&
				cachedOpps.hash === currentHash &&
				aiCache &&
				aiCache.generatedAt > thirtyMinsAgo &&
				cachedOpps.jobs &&
				cachedOpps.jobs.length > 0
			) {
				console.log(`[OPPORTUNITIES] Cache HIT for user ${userId}`);
				processedOpps = cachedOpps.jobs;
			} else {
				console.log(
					`[OPPORTUNITIES] Cache MISS or profile changed for user ${userId}. Fetching from providers...`,
				);

				const providerPromises = this.providers.map(async (provider) => {
					const start = Date.now();
					const jobs = await provider.searchJobs(profile);
					console.log(
						`[PROVIDER] ${provider.name} | Response Time: ${Date.now() - start}ms | Jobs Fetched: ${jobs?.length || 0}`,
					);
					return jobs || [];
				});

				const providerResults = await Promise.all(providerPromises);
				const allJobs = providerResults.flat();
				console.log(`[TRACE] Provider returned: ${allJobs.length} jobs combined`);
				console.log(`[TRACE] After merge: ${allJobs.length}`);

				const uniqueJobsMap = new Map<string, NormalizedOpportunity>();
				for (const job of allJobs) {
					if (!uniqueJobsMap.has(job.id)) {
						uniqueJobsMap.set(job.id, job);
					}
				}
				const uniqueJobs = Array.from(uniqueJobsMap.values());
				console.log(`[TRACE] After dedupe: ${uniqueJobs.length}`);

				const evaluatedJobs = await evaluateOpportunities(userId, profile, uniqueJobs);
				console.log(`[TRACE] After AI: ${evaluatedJobs.length}`);

				processedOpps = evaluatedJobs.map((job: any) => {
					// calculate numeric matchPercentage and matchLevel
					let matchPercentage = 70;
					if (typeof job.matchScore === "string") {
						matchPercentage = parseInt(job.matchScore.replace("%", "")) || 70;
					} else if (typeof job.matchScore === "number") {
						matchPercentage = job.matchScore;
					}

					let matchLevel = "Moderate";
					if (matchPercentage >= 90) matchLevel = "Excellent";
					else if (matchPercentage >= 80) matchLevel = "Strong";
					else if (matchPercentage >= 70) matchLevel = "Good";

					return {
						...job,
						matchPercentage,
						matchLevel,
						matchReason: [job.matchReason],
						isBookmarked: false,
						hasApplied: false,
					};
				});

				if (processedOpps.length > 0) {
					const cacheData = {
						hash: currentHash,
						jobs: processedOpps,
					};
					await prisma.aiCache.upsert({
						where: { userId },
						create: {
							userId,
							opportunities: cacheData,
							profileHash: currentHash,
							source: "providers",
						},
						update: { opportunities: cacheData, generatedAt: new Date(), source: "providers" },
					});

					// Trigger Notification
					notificationService
						.create({
							userId,
							module: "OPPORTUNITIES",
							priority: "SUCCESS",
							type: "OPPORTUNITIES_GENERATED",
							title: "New Opportunities Found",
							message: `Found ${processedOpps.length} new career opportunities matching your profile.`,
							actionType: "VIEW_OPPORTUNITIES",
							actionUrl: "/opportunities",
						})
						.catch((e) => console.error(e));
				} else {
					console.log(`[OPPORTUNITIES] Empty results not cached for user ${userId}`);
				}
			}
		}

		if (userId && processedOpps.length > 0) {
			const jobIds = processedOpps.map((j) => String(j.id));

			for (const opp of processedOpps) {
				await prisma.opportunity.upsert({
					where: { id: String(opp.id) },
					create: {
						id: String(opp.id),
						title: opp.title,
						company: opp.company,
						location: opp.location || "Remote",
						workMode: opp.location?.toLowerCase().includes("remote") ? "Remote" : "Onsite",
						type: opp.type || "Job",
						applyUrl: opp.applyUrl,
						description: opp.description?.substring(0, 500) || "",
						source: opp.source,
					},
					update: {
						title: opp.title,
						company: opp.company,
					},
				});
			}

			const bookmarks = await prisma.opportunityBookmark.findMany({
				where: { userId, opportunityId: { in: jobIds } },
			});
			const applications = await prisma.opportunityApplication.findMany({
				where: { userId, opportunityId: { in: jobIds } },
			});

			const bookmarkedIds = new Set(bookmarks.map((b) => b.opportunityId));
			const appliedIds = new Set(applications.map((a) => a.opportunityId));

			processedOpps = processedOpps.map((opp) => ({
				...opp,
				isBookmarked: bookmarkedIds.has(String(opp.id)),
				hasApplied: appliedIds.has(String(opp.id)),
			}));
		}

		let finalOpps = processedOpps;

		if (search) {
			const s = search.toLowerCase();
			finalOpps = finalOpps.filter(
				(o) => o.title.toLowerCase().includes(s) || o.company.toLowerCase().includes(s),
			);
		}
		if (type && type !== "All") {
			finalOpps = finalOpps.filter((o) => o.type === type);
		}
		if (location && location !== "All") {
			finalOpps = finalOpps.filter((o) =>
				o.location?.toLowerCase().includes(location.toLowerCase()),
			);
		}
		if (remote === "true") {
			finalOpps = finalOpps.filter(
				(o) => o.workMode === "Remote" || o.location?.toLowerCase().includes("remote"),
			);
		}

		if (sortBy === "Highest Match") {
			finalOpps.sort((a, b) => {
				return b.matchPercentage - a.matchPercentage;
			});
		} else if (sortBy === "Deadline Soon") {
			finalOpps.sort((a, b) => {
				if (!a.deadline) return 1;
				if (!b.deadline) return -1;
				return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
			});
		}

		console.log(`[TRACE] After filtering: ${finalOpps.length}`);
		console.log(`[TRACE] Returned to controller: ${finalOpps.length}`);

		return finalOpps;
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
