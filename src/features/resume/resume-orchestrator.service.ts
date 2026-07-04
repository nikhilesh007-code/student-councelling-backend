import crypto from "crypto";
import pdfParse from "pdf-parse";
import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";
import { resumeAnalyzerService } from "./resume-analyzer.service";
import { notificationService } from "../notifications/services/notification.service";

export class ResumeOrchestrator {
	async extractText(fileBuffer: Buffer): Promise<string> {
		try {
			const data = await pdfParse(fileBuffer);
			const text = data.text;
			if (!text || text.trim().length < 50) {
				throw new Error(
					"Could not extract enough readable text from the document. Please ensure it is a valid text-based PDF.",
				);
			}
			return text;
		} catch (error) {
			const reason = error instanceof Error ? error.message : "Unknown error";
			console.error(`[ERROR] Failed to parse PDF: ${reason}`);
			throw new Error("Failed to extract text from the provided PDF document.");
		}
	}

	private cleanText(rawText: string): string {
		let text = rawText;
		
		// 1. Remove page numbers (e.g. Page 1 of 2, 1/2, simply a number at the end/start of a line)
		text = text.replace(/^Page \d+( of \d+)?$/gmi, "");
		text = text.replace(/^\d+\/\d+$/gmi, "");

		// 2. Normalize whitespace but preserve single newlines for structure
		text = text.replace(/[ \t]+/g, " ");

		// 3. Remove excessive blank lines (more than 2 consecutive)
		text = text.replace(/\n{3,}/g, "\n\n");

		// 4. Remove obvious repeated headers/footers (heuristic: short lines appearing identically)
		const lines = text.split("\n");
		const seenLines = new Map<string, number>();
		const cleanedLines = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.length > 0 && trimmed.length < 50) {
				const count = seenLines.get(trimmed) || 0;
				if (count > 0) {
					// Likely a repeated header/footer, skip it
					continue;
				}
				seenLines.set(trimmed, count + 1);
			}
			cleanedLines.push(line);
		}

		return cleanedLines.join("\n").trim();
	}

	async processResume(
		userId: string,
		resumeText: string,
		providedTargetCareer: string | undefined,
		fileName: string,
		fileSizeMb: string,
	) {
		const existingAnalysis = await prisma.resumeAnalysis.findUnique({ where: { userId } });

		// Clean the text robustly
		const cleanedText = this.cleanText(resumeText);

		let parsedData: any = null;

		// Use cached parsedData if the resume text hasn't changed
		if (existingAnalysis && existingAnalysis.resumeText === cleanedText && existingAnalysis.parsedData && Object.keys(existingAnalysis.parsedData).length > 0) {
			parsedData = existingAnalysis.parsedData;
		} else {
			// Step 1: Robust Parsing Call
			const parsingPrompt = `You are a world-class resume parser. Extract the raw resume text into highly structured JSON.
Requirements:
- Support single-column, two-column, ATS, Canva, Word, and LaTeX templates.
- Recognize equivalent headings (e.g., "Tech Stack" -> skills, "Academic Projects" -> projects).
- Return empty arrays [] for missing sections. NEVER return null. Do NOT throw errors.
- Extract into exactly this JSON format:
{
  "personal": {"name": "", "email": "", "phone": ""},
  "summary": "",
  "education": [{"institution": "", "degree": "", "year": "", "cgpa": ""}],
  "skills": [""],
  "experience": [{"company": "", "role": "", "duration": "", "description": ""}],
  "projects": [{"name": "", "technologies": [""], "description": ""}],
  "certifications": [""],
  "achievements": [""],
  "languages": [""]
}

Raw Resume Text:
${cleanedText}

Return ONLY valid JSON.`;

			try {
				const response = await aiService.generate(parsingPrompt, {
					feature: "Resume Parsing",
					responseFormat: "json",
					userId,
				});

				const cleaned = response.response.replace(/```json/gi, "").replace(/```/g, "").trim();
				parsedData = JSON.parse(cleaned);

				// Ensure all fields exist as arrays/strings
				parsedData = {
					personal: parsedData.personal || { name: "", email: "", phone: "" },
					summary: parsedData.summary || "",
					education: Array.isArray(parsedData.education) ? parsedData.education : [],
					skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
					experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
					projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
					certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
					achievements: Array.isArray(parsedData.achievements) ? parsedData.achievements : [],
					languages: Array.isArray(parsedData.languages) ? parsedData.languages : [],
				};
			} catch (e) {
				const reason = e instanceof Error ? e.message : "Unknown error";
				console.error(`[ERROR] Failed to parse resume with AI: ${reason}`);
				// Fallback so it never breaks
				parsedData = {
					personal: { name: "", email: "", phone: "" },
					summary: "",
					education: [],
					skills: [],
					experience: [],
					projects: [],
					certifications: [],
					achievements: [],
					languages: [],
				};
			}
		}

		// Step 2: Quality Analysis Call (Always run to get fresh feedback or use the same if we want)
		// Run deterministic analysis first
		const deterministicData = await resumeAnalyzerService.analyze(userId, parsedData, cleanedText);

		const analysisPrompt = `You are an expert ATS system and tech recruiter.
Evaluate the candidate's resume based on the parsed JSON data and the calculated deterministic metrics.

Parsed Resume Data:
${JSON.stringify(parsedData, null, 2)}

Deterministic ATS Score: ${deterministicData.deterministicScore}
Keyword Match Score: ${deterministicData.keywordMatchScore} / 35
Section Completeness Score: ${deterministicData.sectionCompletenessScore} / 20
Formatting Score: ${deterministicData.formattingScore} / 15
Projects Score: ${deterministicData.projectsScore} / 10
Experience Score: ${deterministicData.experienceScore} / 10
Education Score: ${deterministicData.educationScore} / 5
Contact Score: ${deterministicData.contactScore} / 5

Missing Skills (Target Career):
${deterministicData.missingSkills.join(", ") || "None"}

Formatting Checks:
${deterministicData.formattingChecks.join("\n")}

Career Gap Skills from prior analysis:
${deterministicData.careerGapSkills.join(", ") || "None"}

INSTRUCTIONS:
1. You may adjust the Deterministic ATS Score by AT MOST ±5 points if you believe the overall resume quality warrants it. Output this as "finalAtsScore".
2. Explain your reasoning for the adjustment (or lack thereof) in "scoreAdjustmentReasoning".
3. Write qualitative feedback explaining the formatting, structure, and missing skills to the user.
4. If there are missing skills or Career Gap Skills, explicitly mention how their absence affects their target career readiness.
5. Separately calculate "overallQualityScore" — a holistic 0-100 rating of writing quality, achievements, impact, and professionalism. This must be an independent judgment, NOT a copy of the ATS score.

Generate a single valid JSON object exactly matching this schema:
{
  "finalAtsScore": ${deterministicData.deterministicScore},
  "overallQualityScore": "<integer 0-100 rating the resume's OVERALL quality — writing, achievements, impact, professionalism. Judge this independently from the ATS score above. It should reflect a different judgment, not just repeat the same number.>",
  "scoreAdjustmentReasoning": "1 sentence explaining the ±5 adjustment based on qualitative factors.",
  "recruiterImpression": "2 sentence summary of what a recruiter would think.",
  "executiveSummary": "1 paragraph executive summary of the candidate's profile.",
  "structure": "1 sentence evaluation of organization based on the formatting checks.",
  "writingQuality": "1 sentence evaluation of grammar and impact metrics.",
  "formatting": "1 sentence evaluation of ATS readability based on the formatting checks.",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvements": ["string"]
}
Return ONLY valid JSON. Do not include markdown blocks.`;

		let analysisResult;
		try {
			const response = await aiService.generate(analysisPrompt, {
				feature: "Resume Quality Analysis",
				responseFormat: "json",
				userId,
			});

			const cleaned = response.response.replace(/```json/gi, "").replace(/```/g, "").trim();
			analysisResult = JSON.parse(cleaned);
		} catch (e: any) {
			console.error(`[ERROR] Failed to analyze parsed resume: ${e.message || "Unknown error"}`);
			if (e.name === "RateLimitError") {
				throw new Error("We're currently experiencing high traffic. Please try uploading again.");
			}
			throw new Error("Failed to analyze parsed resume data with AI.");
		}

		// The AI may return this as a number or a numeric string — Number() handles both safely.
		// If it's missing or invalid, we fall back to the deterministic score so it's never blank.
		const computedOverallScore = Number(analysisResult.overallQualityScore) || deterministicData.deterministicScore;

		// Save parsed data and wipe out all downstream caches to force JIT regeneration for other modules
		const [analysis] = await prisma.$transaction([
			prisma.resumeAnalysis.upsert({
				where: { userId },
				update: {
					fileName,
					fileSize: fileSizeMb,
					resumeText: cleanedText,
					parsedData: parsedData,
					atsScore: analysisResult.finalAtsScore || deterministicData.deterministicScore,
					overallScore: computedOverallScore,
					strengths: analysisResult.strengths || [],
					weaknesses: analysisResult.weaknesses || [],
					improvements: analysisResult.improvements || [],
					missingSections: [], // Handled by deterministic formatting checks in UI ideally, but leaving empty here
					structure: analysisResult.structure || "Not evaluated",
					writingQuality: analysisResult.writingQuality || "Not evaluated",
					formatting: analysisResult.formatting || "Not evaluated",
					recruiterImpression: analysisResult.recruiterImpression || "Not evaluated",
					summary: "See executive summary",
					executiveSummary: analysisResult.executiveSummary || "Not evaluated",
					keywordSuggestions: deterministicData.missingSkills || [],
					finalVerdict: analysisResult.scoreAdjustmentReasoning || "Not evaluated",
					careerFit: "Analysis pending...",
					matchedSkills: deterministicData.resumeSkills || [],
					missingSkills: deterministicData.missingSkills || [],
					suggestedProjects: [],
					recommendedCertifications: [],
					analyzedAt: new Date(),
				},
				create: {
					userId,
					fileName,
					fileSize: fileSizeMb,
					resumeText: cleanedText,
					parsedData: parsedData,
					atsScore: analysisResult.finalAtsScore || deterministicData.deterministicScore,
					overallScore: computedOverallScore,
					strengths: analysisResult.strengths || [],
					weaknesses: analysisResult.weaknesses || [],
					improvements: analysisResult.improvements || [],
					missingSections: [],
					structure: analysisResult.structure || "Not evaluated",
					writingQuality: analysisResult.writingQuality || "Not evaluated",
					formatting: analysisResult.formatting || "Not evaluated",
					recruiterImpression: analysisResult.recruiterImpression || "Not evaluated",
					summary: "See executive summary",
					executiveSummary: analysisResult.executiveSummary || "Not evaluated",
					keywordSuggestions: deterministicData.missingSkills || [],
					finalVerdict: analysisResult.scoreAdjustmentReasoning || "Not evaluated",
					careerFit: "Analysis pending...",
					matchedSkills: deterministicData.resumeSkills || [],
					missingSkills: deterministicData.missingSkills || [],
					suggestedProjects: [],
					recommendedCertifications: [],
				},
			}),
			prisma.aiCache.updateMany({
				where: { userId },
				data: {
					placement: {},
					roadmapAnalysis: {},
					progress: {},
					resumeMatch: {},
				},
			}),
		]);

		console.log(`[RESUME] Resume parsed successfully for user ${userId}`);

		// Trigger Notification
		const finalScore = analysisResult.finalAtsScore || deterministicData.deterministicScore;
		notificationService.create({
			userId,
			module: 'RESUME',
			priority: finalScore >= 80 ? 'SUCCESS' : 'INFO',
			type: 'RESUME_ANALYZED',
			title: 'Resume analysis complete',
			message: `Your resume received an ATS score of ${finalScore}%.`,
			actionType: 'VIEW_RESUME',
			actionUrl: '/resume'
		}).catch(e => console.error(e));

		return analysis;
	}

	async getAnalysis(userId: string) {
		return await prisma.resumeAnalysis.findUnique({
			where: { userId },
		});
	}
}

export const resumeOrchestrator = new ResumeOrchestrator();
