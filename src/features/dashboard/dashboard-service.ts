import { prisma } from "../../database";
import { progressService } from "../progress/progress-service";
import { calculateProfileCompletion } from "../users/services/profile-service";

export class DashboardService {
	async getDashboardSummary(userId: string) {
		// 1. Fetch Profile Data (Synchronous/Fast)
		let profileCompletion = 0;
		try {
			const profileData = await calculateProfileCompletion(userId);
			profileCompletion = profileData.percentage;
		} catch (e) {
			console.error("Dashboard: Profile fetch failed", e);
		}

		// 2. Fetch AI Cache (Read-only, no generation)
		let aiCache = null;
		try {
			aiCache = await prisma.aiCache.findUnique({ where: { userId } });
		} catch (e) {
			console.error("Dashboard: AiCache fetch failed", e);
		}

		// 3. Fetch Study Planner Stats (Fast DB Query)
		let studyStats: {
			completedTasks: number;
			studyHours: number;
			upcomingTasks: any[];
		} = {
			completedTasks: 0,
			studyHours: 0,
			upcomingTasks: [],
		};
		try {
			const now = new Date();
			const allTasks = await prisma.studyTask.findMany({
				where: { userId, isArchived: false },
				orderBy: { scheduledAt: "asc" },
			});

			const completedTasksArr = allTasks.filter((t: any) => t.status === "COMPLETED");
			const completed = completedTasksArr.length;

			const studyMinutes = completedTasksArr.reduce(
				(acc: number, t: any) => acc + (t.estimatedMinutes || 0),
				0,
			);
			const studyHours = Math.round((studyMinutes / 60) * 10) / 10;

			const upcoming = allTasks
				.filter((t: any) => t.status !== "COMPLETED" && t.scheduledAt >= now)
				.slice(0, 5)
				.map((t: any) => ({
					label: t.title,
					sub: t.skill,
					due: new Date(t.scheduledAt).toLocaleDateString(),
					dueColor: "#f97316",
					done: false,
					type: "STUDY",
				}));

			studyStats = { completedTasks: completed, studyHours, upcomingTasks: upcoming };
		} catch (e) {
			console.error("Dashboard: Study stats fetch failed", e);
		}

		// Parse Cached Data Safely
		const careerMatchData = (aiCache?.recommendation as any) || {};
		const recommendedCareers = careerMatchData?.topCareers || [];
		const careerMatchScore =
			recommendedCareers.length > 0 ? recommendedCareers[0].matchPercentage : null;

		const roadmapData = (aiCache?.roadmap as any) || {};
		const roadmapPhases = roadmapData?.phases || [];

		const skillGapData = (aiCache?.skillGap as any) || {};
		const readinessScore = skillGapData?.readinessScore || 0;

		// Generate AI Insight
		let aiInsight = null;
		if (skillGapData?.missingSkills?.length > 0) {
			const targetSkill = skillGapData.missingSkills[0].skill;
			aiInsight = {
				title: "Skill Focus Recommended",
				description: `Your profile is strong, but focusing on ${targetSkill} will dramatically improve your placement chances.`,
				metric: "+8% readiness",
				actionText: "Find Resources",
				actionLink: "/resources",
			};
		} else if (recommendedCareers.length > 0) {
			aiInsight = {
				title: "Career Match Detected",
				description: `You have a high affinity for ${recommendedCareers[0].title}. Start building a roadmap to specialize.`,
				metric: `${careerMatchScore}% match`,
				actionText: "Build Roadmap",
				actionLink: "/roadmap",
			};
		} else if (profileCompletion < 100) {
			aiInsight = {
				title: "Profile Incomplete",
				description: "AI struggles to provide accurate recommendations with incomplete data.",
				metric: "Missing data",
				actionText: "Update Profile",
				actionLink: "/profile",
			};
		} else {
			aiInsight = {
				title: "All Systems Go",
				description: "Your profile is fully optimized. Keep learning and completing tasks.",
				metric: "100% active",
				actionText: "Study Planner",
				actionLink: "/planner",
			};
		}

		// Opportunities data might be cached under opportunities or we can extract it if needed.
		const opportunitiesData = (aiCache?.opportunities as any) || {};
		const internships = opportunitiesData?.matches || [];

		// Calculate dynamic progress
		let roadmapCompleted = 0;
		const roadmapTotal = roadmapPhases.length;
		let roadmapProgress = 0;
		if (roadmapTotal > 0) {
			const firstIncomplete = roadmapPhases.findIndex((p: any) => !p.completed);
			roadmapCompleted = firstIncomplete === -1 ? roadmapTotal : firstIncomplete;
			roadmapProgress = Math.round((roadmapCompleted / roadmapTotal) * 100);
		}

		const overallProgress =
			Math.round((profileCompletion + readinessScore + roadmapProgress) / 3) || 0;

		// Build Roadmap Upcoming Tasks
		let roadmapTasks: any[] = [];
		if (roadmapPhases.length > 0) {
			const currentPhase = roadmapPhases.find((p: any) => !p.completed);
			if (currentPhase && currentPhase.steps) {
				roadmapTasks = currentPhase.steps
					.filter((s: any) => !s.completed)
					.slice(0, 3)
					.map((s: any) => ({
						label: s.title || s.step,
						sub: s.description?.substring(0, 50) + "...",
						due: "Current Phase",
						dueColor: "#00a878",
						done: false,
						type: "ROADMAP",
					}));
			}
		}

		// Merge tasks
		const upcomingTasks = [...studyStats.upcomingTasks, ...roadmapTasks].slice(0, 5);

		// Learning Resources
		let learningResources = [];
		try {
			const progressRes = await progressService.getDashboard(userId);
			learningResources = progressRes.dbData?.nextLearningSteps || [];
		} catch (e) {
			console.error("Dashboard: Progress Service fetch failed", e);
		}

		// Fetch Recent Activity (Notifications)
		let recentActivity: any[] = [];
		try {
			const notifs = await prisma.notification.findMany({
				where: { userId },
				orderBy: { createdAt: "desc" },
				take: 5,
			});
			recentActivity = notifs.map((n: any) => ({
				id: n.id,
				title: n.title,
				message: n.message,
				createdAt: n.createdAt,
				type: n.type,
				icon: n.icon || "notifications",
			}));
		} catch (e) {
			console.error("Dashboard: Recent activity fetch failed", e);
		}

		const hasPlannerTasks = studyStats.upcomingTasks.length > 0 || studyStats.completedTasks > 0;

		return {
			careerMatch: careerMatchScore,
			progress: overallProgress,
			progressDetails: {
				profile: profileCompletion,
				readiness: readinessScore,
				roadmap: roadmapProgress,
			},
			studyStats: {
				completedTasks: studyStats.completedTasks,
				studyHours: (studyStats as any).studyHours || 0,
				completedResources: 0,
			},
			upcomingTasks,
			aiInsight,
			recommendedCareers: recommendedCareers.slice(0, 3),
			internships: internships.slice(0, 3),
			learningResources: learningResources.slice(0, 3),
			recentActivity,
			onboarding: {
				profileCompleted: profileCompletion >= 80,
				careerGuidanceCompleted: recommendedCareers.length > 0,
				roadmapCompleted: roadmapPhases.length > 0,
				skillGapCompleted: !!skillGapData?.readinessScore,
				plannerCompleted: hasPlannerTasks,
				score: Math.round(
					(profileCompletion >= 80 ? 20 : 0) +
						(recommendedCareers.length > 0 ? 20 : 0) +
						(roadmapPhases.length > 0 ? 20 : 0) +
						(skillGapData?.readinessScore ? 20 : 0) +
						(hasPlannerTasks ? 20 : 0),
				),
			},
		};
	}
}

export const dashboardService = new DashboardService();
