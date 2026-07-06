import { env } from "../../../config/env";
import type { IOpportunityProvider, NormalizedOpportunity } from "./provider";

export class AdzunaProvider implements IOpportunityProvider {
	name = "Adzuna";

	async searchJobs(profile: any): Promise<NormalizedOpportunity[]> {
		try {
			const targetCareer = profile.targetCareer || "Software Engineer";
			const synonym = targetCareer.toLowerCase().includes("software engineer")
				? "Developer"
				: "Software Engineer";

			const skillsQuery = (profile.skills || []).slice(0, 3).join(" ");

			const queries = [
				{ name: "Target Career", query: targetCareer },
				{ name: "Synonym", query: synonym },
			];

			if (skillsQuery) {
				queries.push({ name: "Skills", query: skillsQuery });
			}

			const allJobsMap = new Map<string, NormalizedOpportunity>();

			for (const q of queries) {
				const encodedQuery = encodeURIComponent(q.query);
				const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${env.ADZUNA_APP_ID}&app_key=${env.ADZUNA_APP_KEY}&results_per_page=10&what=${encodedQuery}`;

				try {
					const response = await fetch(url);
					if (!response.ok) {
						console.error(`Adzuna API Error for query '${q.query}': ${response.statusText}`);
						continue;
					}

					const data = (await response.json()) as any;
					const results = data.results || [];

					console.log(
						`[PROVIDER] Adzuna | Query: "${q.query}" (${q.name}) | Fetched: ${results.length}`,
					);

					for (const job of results) {
						const jobId = String(job.id);
						if (!allJobsMap.has(jobId)) {
							allJobsMap.set(jobId, {
								id: jobId,
								title: job.title,
								company: job.company?.display_name || "Unknown Company",
								location: job.location?.display_name || "India",
								description: job.description || "",
								salaryMin: job.salary_min,
								salaryMax: job.salary_max,
								contractType: job.contract_time || job.contract_type || "Job",
								category: job.category?.label || "Unknown",
								redirectUrl: job.redirect_url,
								source: "Adzuna",
								postedDate: job.created,
								skills: [],
							});
						}
					}
				} catch (err: any) {
					console.error(`[PROVIDER ERROR] Adzuna failed on query '${q.query}':`, err.message);
				}
			}

			return Array.from(allJobsMap.values());
		} catch (error: any) {
			console.error(`[PROVIDER ERROR] Adzuna critical failure:`, error.message);
			return [];
		}
	}
}
