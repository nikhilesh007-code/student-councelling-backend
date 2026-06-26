import crypto from "crypto";
import pdfParse from "pdf-parse";
import { prisma } from "../../database";
import { aiService } from "../ai/ai-service";

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
		// Wait, the user said "Generate ATS analysis ONLY using the parsed JSON. Do NOT use raw resume text if parsed data already exists."
		const analysisPrompt = `You are an expert ATS system and tech recruiter.
Evaluate the candidate's resume strictly based on this parsed JSON data. DO NOT use raw formatting.

Parsed Resume Data:
${JSON.stringify(parsedData, null, 2)}

Generate a single valid JSON object exactly matching this schema:
{
  "overallScore": 85,
  "atsScore": 82,
  "recruiterImpression": "2 sentence summary of what a recruiter would think.",
  "executiveSummary": "1 paragraph executive summary of the candidate's profile.",
  "structure": "1 sentence evaluation of organization.",
  "writingQuality": "1 sentence evaluation of grammar and impact metrics.",
  "formatting": "1 sentence evaluation of ATS readability.",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingSections": ["string"],
  "improvements": ["string"],
  "keywordSuggestions": ["string"],
  "finalVerdict": "1 sentence final verdict on the resume's readiness."
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

		// Save parsed data and wipe out all downstream caches to force JIT regeneration for other modules
		const [analysis] = await prisma.$transaction([
			prisma.resumeAnalysis.upsert({
				where: { userId },
				update: {
					fileName,
					fileSize: fileSizeMb,
					resumeText: cleanedText,
					parsedData: parsedData,
					atsScore: analysisResult.atsScore || 0,
					overallScore: analysisResult.overallScore || 0,
					strengths: analysisResult.strengths || [],
					weaknesses: analysisResult.weaknesses || [],
					improvements: analysisResult.improvements || [],
					missingSections: analysisResult.missingSections || [],
					structure: analysisResult.structure || "Not evaluated",
					writingQuality: analysisResult.writingQuality || "Not evaluated",
					formatting: analysisResult.formatting || "Not evaluated",
					recruiterImpression: analysisResult.recruiterImpression || "Not evaluated",
					summary: "See executive summary",
					executiveSummary: analysisResult.executiveSummary || "Not evaluated",
					keywordSuggestions: analysisResult.keywordSuggestions || [],
					finalVerdict: analysisResult.finalVerdict || "Not evaluated",
					careerFit: "Analysis pending...",
					matchedSkills: [],
					missingSkills: [],
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
					atsScore: analysisResult.atsScore || 0,
					overallScore: analysisResult.overallScore || 0,
					strengths: analysisResult.strengths || [],
					weaknesses: analysisResult.weaknesses || [],
					improvements: analysisResult.improvements || [],
					missingSections: analysisResult.missingSections || [],
					structure: analysisResult.structure || "Not evaluated",
					writingQuality: analysisResult.writingQuality || "Not evaluated",
					formatting: analysisResult.formatting || "Not evaluated",
					recruiterImpression: analysisResult.recruiterImpression || "Not evaluated",
					summary: "See executive summary",
					executiveSummary: analysisResult.executiveSummary || "Not evaluated",
					keywordSuggestions: analysisResult.keywordSuggestions || [],
					finalVerdict: analysisResult.finalVerdict || "Not evaluated",
					careerFit: "Analysis pending...",
					matchedSkills: [],
					missingSkills: [],
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
		return analysis;
	}

	async getAnalysis(userId: string) {
		return await prisma.resumeAnalysis.findUnique({
			where: { userId },
		});
	}
}

export const resumeOrchestrator = new ResumeOrchestrator();
