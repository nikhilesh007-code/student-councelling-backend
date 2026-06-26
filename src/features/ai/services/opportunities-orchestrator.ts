import crypto from "crypto";
import { prisma } from "../../../database";
import { aiService } from "../ai-service";
import { careerResolver } from "../../career/career-resolver.service";
import {
	type OpportunitiesResponse,
	OpportunitiesResponseSchema,
	type StudentProfileParams,
} from "./schemas";

export async function generateAndCacheOpportunities(
	userId: string,
	profile: StudentProfileParams,
	currentHash: string,
) {
	let source = "gemini";
	let opportunitiesResponse: OpportunitiesResponse | null = null;

	try {

		// Get AI Cache to extract recommendations and skill gaps
		const aiCache = await prisma.aiCache.findUnique({ where: { userId } });
		const recommendation = aiCache?.recommendation as any;
		const skillGap = aiCache?.skillGap as any;

		const { career: targetCareer } = await careerResolver.resolveTargetCareer(userId);
		const missingSkills = skillGap?.[0]?.missingSkills || [];

		const prompt = `You are an expert tech recruiter and AI recommendation engine.
Analyze the user's profile and generate a highly personalized list of exactly 8-10 opportunities (Internships, Jobs, Hackathons, Scholarships, Competitions).

User Profile Context:
- Target Career: ${targetCareer}
- Current Skills: ${profile.skills.join(", ")}
- Missing Skills (Skill Gap): ${missingSkills.join(", ")}
- Preferred Work Mode: ${profile.preferredDomains?.includes("Remote") ? "Remote" : "Flexible"}

Instructions:
1. ONLY generate opportunities that are directly relevant to "${targetCareer}". Do NOT hallucinate unrelated roles.
2. Ensure realistic data for companies (e.g. Google, Microsoft, NVIDIA, HackAura, local startups). 
3. Calculate a realistic "matchScore" (e.g. "95%", "88%", "72%") based on how well their current skills align with the required skills, and penalize missing skills. Do NOT make every score the same.
4. Provide a "matchReason" explaining exactly why this opportunity is a good fit and what skills they are missing for it.
5. Provide "recommendedPreparation" indicating what they need to study.
6. Provide "estimatedDifficulty" (e.g., "High", "Medium", "Low").
7. Ensure "type" is strictly one of: "Internship", "Job", "Hackathon", "Scholarship", "Competition".
8. Include realistic applyUrls (e.g., https://careers.google.com/).

Return ONLY a single valid JSON object that matches this exact structure:
{
  "opportunities": [
    {
      "title": "string",
      "company": "string",
      "companyLogo": "string or omit if unknown",
      "location": "string",
      "workMode": "string (Remote, Hybrid, Onsite)",
      "type": "string",
      "duration": "string",
      "stipend": "string",
      "deadline": "ISO date string or omit",
      "applyUrl": "string",
      "requiredSkills": ["string"],
      "description": "string",
      "eligibility": "string",
      "matchScore": "string (e.g. 91%)",
      "matchReason": "string",
      "recommendedPreparation": "string",
      "estimatedDifficulty": "string"
    }
  ]
}`;

		const aiResponse = await aiService.generate(prompt, {
			feature: "Opportunities Matching",
			responseFormat: "json",
			userId,
		});

		let text = aiResponse.response.trim();
		if (text.startsWith("```json")) {
			text = text
				.replace(/^```json/, "")
				.replace(/```$/, "")
				.trim();
		}

		const parsedJson = JSON.parse(text);
		opportunitiesResponse = OpportunitiesResponseSchema.parse(parsedJson);
		source = aiResponse.provider.toLowerCase();

		if (aiResponse.fallbackUsed) {
		}
	} catch (error: any) {
		console.error(
			`[BACKGROUND ERROR] AI opportunity generation failed for user ${userId}:`,
			error.message,
		);
		return null;
	}

	if (opportunitiesResponse) {
		try {
			await prisma.aiCache.update({
				where: { userId },
				data: {
					opportunities: opportunitiesResponse as any,
				},
			});
			console.log(
				`[BACKGROUND] Opportunities Cache updated for user ${userId} with source ${source}`,
			);

			// Upsert into global Opportunity table
			for (const opp of opportunitiesResponse.opportunities) {
				// Deterministic ID logic
				const slug = `${opp.title}-${opp.company}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				const hashId = crypto.createHash("md5").update(slug).digest("hex").substring(0, 16);

				await prisma.opportunity.upsert({
					where: { id: hashId },
					create: {
						id: hashId,
						title: opp.title,
						company: opp.company,
						companyLogo: opp.companyLogo || null,
						location: opp.location,
						workMode: opp.workMode,
						type: opp.type,
						duration: opp.duration,
						stipend: opp.stipend,
						deadline: opp.deadline ? new Date(opp.deadline) : null,
						applyUrl: opp.applyUrl,
						requiredSkills: opp.requiredSkills,
						description: opp.description,
						eligibility: opp.eligibility,
						source: source,
					},
					update: {
						title: opp.title,
						companyLogo: opp.companyLogo || null,
						workMode: opp.workMode,
						type: opp.type,
						duration: opp.duration,
						stipend: opp.stipend,
						deadline: opp.deadline ? new Date(opp.deadline) : null,
						applyUrl: opp.applyUrl,
						requiredSkills: opp.requiredSkills,
						description: opp.description,
						eligibility: opp.eligibility,
					},
				});
			}

			return opportunitiesResponse;
		} catch (error) {
			console.error(
				`[BACKGROUND ERROR] Failed to update opportunities cache for user ${userId}:`,
				error,
			);
		}
	}
	return null;
}
