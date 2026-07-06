import type { Request, Response } from "express";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { aiService } from "../../ai/ai-service";

export const extractedSkillsSchema = z.object({
	extractedSkills: z.array(z.string()).describe("List of exact skills found in the resume"),
	suggestedSkills: z
		.array(z.string())
		.describe(
			"List of complementary or missing skills that the user might have based on the context, or should learn",
		),
	userType: z
		.enum(["Student", "Working Professional"])
		.describe(
			"Guess whether the user is a Student or Working Professional based on their experience",
		),
	yearsOfExperience: z
		.number()
		.optional()
		.describe("Total years of experience found in the resume, if applicable"),
	university: z
		.string()
		.optional()
		.describe("The name of the university the user attends/attended"),
	degree: z
		.string()
		.optional()
		.describe("The name of the degree the user is pursuing/has completed"),
	cgpa: z.number().optional().describe("The CGPA of the user, if mentioned"),
	currentJobTitle: z.string().optional().describe("The user's current or most recent job title"),
	companyName: z.string().optional().describe("The user's current or most recent company"),
});

export async function parseResume(req: Request, res: Response): Promise<void> {
	try {
		if (!req.file) {
			res.status(400).json({ success: false, message: "No resume file uploaded" });
			return;
		}

		const fileBuffer = req.file.buffer;
		const mimeType = req.file.mimetype;

		if (mimeType !== "application/pdf" && !mimeType.includes("document")) {
			res
				.status(400)
				.json({ success: false, message: "Only PDF or Word documents are supported." });
			return;
		}

		let parsedText = "";
		try {
			const data = await pdfParse(fileBuffer);
			parsedText = data.text;
		} catch (e) {
			res.status(400).json({ success: false, message: "Could not parse PDF text." });
			return;
		}

		const prompt =
			"Extract all technical and soft skills from this resume. Also, suggest up to 5 complementary skills the user should consider adding to their profile. Guess their user type (Student or Working Professional), university, degree, cgpa, current job title, company name, and years of experience.";

		const aiResponse = await aiService.generate(`Resume Text:\n\n${parsedText}\n\n${prompt}`, {
			responseFormat: "json",
		});

		const textResponse = aiResponse.response;
		if (!textResponse) {
			res.status(500).json({ success: false, message: "Failed to parse resume from AI" });
			return;
		}

		let rawText = textResponse.trim();
		if (rawText.startsWith("```json")) {
			rawText = rawText
				.replace(/^```json/, "")
				.replace(/```$/, "")
				.trim();
		}

		const data = JSON.parse(rawText);

		res.locals.dataSource = aiResponse.provider;
		res.locals.cacheHit = false;

		res.status(200).json({
			success: true,
			data,
			_ai: {
				provider: aiResponse.provider,
				fallbackUsed: aiResponse.fallbackUsed,
				durationMs: aiResponse.durationMs,
			},
		});
	} catch (error) {
		console.error("[RESUME PARSER ERROR]", error);
		res.status(500).json({
			success: false,
			message: "An error occurred while parsing the resume.",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}
