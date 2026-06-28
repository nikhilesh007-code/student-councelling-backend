import { aiService } from "../ai-service";
import { careerContextService } from "../../career/career-context.service";
import { NormalizedOpportunity } from "../../opportunities/providers/provider";

export async function evaluateOpportunities(
	userId: string,
	profile: any,
	jobs: NormalizedOpportunity[]
) {
	if (jobs.length < 10) {
		// Skip AI ranking to save tokens
		return jobs.map(job => ({
			...job,
			matchScore: "75%",
			matchReason: "Good potential match.",
			recommendedPreparation: "Review basics.",
			estimatedDifficulty: "Medium",
			type: job.contractType || "Job",
			duration: "",
			stipend: "",
			applyUrl: job.redirectUrl,
			requiredSkills: []
		}));
	}

	const topJobs = jobs.slice(0, 15);
	const start = Date.now();

	try {
		const context = await careerContextService.buildContext(userId);
		const targetCareer = context.targetCareer;
		
		const jobsPayload = topJobs.map(j => ({
			id: j.id,
			title: j.title,
			company: j.company,
			location: j.location,
			category: j.category
		}));

		const prompt = `Evaluate these 15 jobs for a user targeting: ${targetCareer}.
User Skills: ${context.normalizedSkills.join(", ")}

Jobs:
${JSON.stringify(jobsPayload)}

For each job ID, return a JSON object mapping the ID to its evaluation.
Make sure all "missingSkills" use CANONICAL SKILL NAMES (e.g. "Node.js", "Express.js", "JavaScript", "React", "TypeScript", "MongoDB", "Docker").
Format exactly like this (no markdown):
{
  "job_id_1": {
    "matchScore": "85%",
    "matchReason": "Strong match based on skills.",
    "recommendedPreparation": "Study system design.",
    "estimatedDifficulty": "High",
    "missingSkills": ["Docker"]
  }
}
`;

		const aiResponse = await aiService.generate(prompt, {
			feature: "Opportunities Ranking",
			responseFormat: "json",
			userId,
		});

		let text = aiResponse.response.trim();
		if (text.startsWith("```json")) {
			text = text.replace(/^```json/, "").replace(/```$/, "").trim();
		}

		const evaluations = JSON.parse(text);

		console.log(`[AI RANKING] Groq ranking duration: ${Date.now() - start}ms`);

		return topJobs.map(job => {
			const evalData = evaluations[job.id] || {};
			return {
				...job,
				matchScore: evalData.matchScore || "70%",
				matchReason: evalData.matchReason || "Matched by system.",
				recommendedPreparation: evalData.recommendedPreparation || "Review basics.",
				estimatedDifficulty: evalData.estimatedDifficulty || "Medium",
				type: job.contractType || "Job",
				duration: "",
				stipend: job.salaryMin ? `${job.salaryMin} - ${job.salaryMax}` : "",
				applyUrl: job.redirectUrl,
				requiredSkills: evalData.missingSkills || []
			};
		});

	} catch (error: any) {
		console.error(`[BACKGROUND ERROR] AI opportunity evaluation failed for user ${userId}:`, error.message);
		return topJobs.map(job => ({
			...job,
			matchScore: "70%",
			matchReason: "Fallback match.",
			recommendedPreparation: "",
			estimatedDifficulty: "Medium",
			type: job.contractType || "Job",
			applyUrl: job.redirectUrl,
			requiredSkills: []
		}));
	}
}
