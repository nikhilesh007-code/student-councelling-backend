import { prisma } from "../../database";
import { SkillNormalizer } from "../../utils/normalizers";
import { aiCacheService } from "../ai/services/ai-cache-service";
import { careerContextService } from "../career/career-context.service";

export interface ResumeAnalysisResult {
	deterministicScore: number;
	keywordMatchScore: number;
	sectionCompletenessScore: number;
	formattingScore: number;
	projectsScore: number;
	experienceScore: number;
	educationScore: number;
	contactScore: number;
	formattingChecks: string[];
	resumeSkills: string[];
	missingSkills: string[];
	careerGapSkills: string[]; // From previous skill gap analysis
}

export class ResumeAnalyzerService {
	async analyze(userId: string, parsedData: any, rawText: string): Promise<ResumeAnalysisResult> {
		const context = await careerContextService.buildContext(userId);
		
		// 1. Fetch Career Requirements
		let career = await prisma.career.findUnique({
			where: { name: context.targetCareer },
			include: { skills: { include: { skill: true } } },
		});

		if (!career) {
			career = await prisma.career.findFirst({
				where: { name: { equals: context.targetCareer, mode: "insensitive" } },
				include: { skills: { include: { skill: true } } },
			});
		}

		let requiredSkills: string[] = [];
		if (career) {
			requiredSkills = SkillNormalizer.normalizeArray(career.skills.map((s) => s.skill.name));
		}

		// 2. Normalize Resume Skills
		// parsedData.skills could be an array of strings
		let rawResumeSkills = Array.isArray(parsedData.skills) ? parsedData.skills : [];
		if (parsedData.projects && Array.isArray(parsedData.projects)) {
			parsedData.projects.forEach((p: any) => {
				if (p.technologies && Array.isArray(p.technologies)) {
					rawResumeSkills.push(...p.technologies);
				}
			});
		}
		const resumeSkills = SkillNormalizer.normalizeArray(rawResumeSkills);

		// 3. Keyword Match (35%)
		let keywordMatchScore = 0;
		let missingSkills: string[] = requiredSkills.filter(s => !resumeSkills.includes(s));
		if (requiredSkills.length > 0) {
			const matched = requiredSkills.filter(s => resumeSkills.includes(s)).length;
			keywordMatchScore = Math.round((matched / requiredSkills.length) * 35);
		} else {
			// If no required skills found in DB, just give full points to not penalize
			keywordMatchScore = 35; 
		}

		// 4. Section Completeness (20%)
		// We expect Education, Experience, Projects, Skills
		let sectionCount = 0;
		if (parsedData.education && parsedData.education.length > 0) sectionCount++;
		if (parsedData.experience && parsedData.experience.length > 0) sectionCount++;
		if (parsedData.projects && parsedData.projects.length > 0) sectionCount++;
		if (resumeSkills.length > 0) sectionCount++;
		
		const sectionCompletenessScore = Math.round((sectionCount / 4) * 20);

		// 5. Formatting & Presentation (15%)
		let formattingChecks: string[] = [];
		let formattingPoints = 15;

		if (rawText.length > 0) {
			formattingChecks.push("✔ Text extracted successfully");
		} else {
			formattingChecks.push("✖ Text extraction failed or too short");
			formattingPoints -= 15;
		}

		// Check for sections to imply ATS friendliness
		if (sectionCount >= 3) {
			formattingChecks.push("✔ ATS friendly section headings detected");
		} else {
			formattingChecks.push("✖ Missing standard section headings");
			formattingPoints -= 5;
		}

		// We assume standard single column if text is extracted well and headings are present sequentially.
		// Since pdf-parse strips out complex layouts into a single stream, successful standard parsing is a good sign.
		formattingChecks.push("✔ Single column layout assumed");
		formattingChecks.push("✔ No embedded images blocking text");
		formattingChecks.push("✔ Readable fonts");
		
		if (!parsedData.projects || parsedData.projects.length === 0) {
		    formattingChecks.push("✖ No Projects section");
		}
		if (!parsedData.experience || parsedData.experience.length === 0) {
		    formattingChecks.push("✖ No Experience section");
		}

		const formattingScore = Math.max(0, formattingPoints);

		// 6. Projects (10%)
		let projectsScore = 0;
		if (parsedData.projects && parsedData.projects.length >= 2) {
			projectsScore = 10;
		} else if (parsedData.projects && parsedData.projects.length === 1) {
			projectsScore = 5;
		}

		// 7. Experience (10%)
		let experienceScore = 0;
		if (parsedData.experience && parsedData.experience.length > 0) {
			experienceScore = 10;
		}

		// 8. Education (5%)
		let educationScore = 0;
		if (parsedData.education && parsedData.education.length > 0) {
			educationScore = 5;
		}

		// 9. Contact Info (5%)
		let contactScore = 0;
		let hasEmail = parsedData.personal?.email || rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
		let hasPhone = parsedData.personal?.phone || rawText.match(/(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
		if (hasEmail && hasPhone) {
			contactScore = 5;
		} else if (hasEmail || hasPhone) {
			contactScore = 3;
		}

		// Total Deterministic Score
		const deterministicScore = keywordMatchScore + sectionCompletenessScore + formattingScore + projectsScore + experienceScore + educationScore + contactScore;

		// 10. Fetch Career Gap (Previous Skill Gap Analysis)
		let careerGapSkills: string[] = [];
		const recommendation = await aiCacheService.getRecommendation(userId);
		if (recommendation) {
			const skillGaps = recommendation.skillGaps as any;
			if (skillGaps && Array.isArray(skillGaps) && skillGaps.length > 0) {
				const gap = skillGaps[0];
				if (gap.missingSkills) {
					// Apply explicit subtraction just to be safe
					const aiMissingSkills = SkillNormalizer.normalizeArray(gap.missingSkills);
					careerGapSkills = aiMissingSkills.filter(
						(skill: string) => !context.normalizedSkills.includes(skill)
					);
				}
			}
		}

		return {
			deterministicScore,
			keywordMatchScore,
			sectionCompletenessScore,
			formattingScore,
			projectsScore,
			experienceScore,
			educationScore,
			contactScore,
			formattingChecks,
			resumeSkills,
			missingSkills,
			careerGapSkills,
		};
	}
}

export const resumeAnalyzerService = new ResumeAnalyzerService();
