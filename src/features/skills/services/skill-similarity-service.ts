export type MatchType = "Exact" | "Partial" | "Related" | "Missing";

export interface SkillMatchDetails {
	requiredSkill: string;
	matchType: MatchType;
	matchedWith?: string;
	score: number;
	reason?: string;
}

const PREDEFINED_RELATIONSHIPS: Record<string, string[]> = {
	javascript: [
		"typescript",
		"frontend development",
		"web development",
		"node.js",
		"react",
		"vue",
		"angular",
	],
	typescript: [
		"javascript",
		"frontend development",
		"web development",
		"node.js",
		"angular",
		"react",
	],
	react: [
		"frontend development",
		"web development",
		"javascript",
		"typescript",
		"next.js",
		"react native",
	],
	reactjs: [
		"react",
		"frontend development",
		"web development",
		"javascript",
		"typescript",
		"next.js",
		"react native",
	],
	"node.js": ["express", "backend development", "javascript", "typescript", "web development"],
	nodejs: [
		"node.js",
		"express",
		"backend development",
		"javascript",
		"typescript",
		"web development",
	],
	express: [
		"node.js",
		"backend development",
		"javascript",
		"typescript",
		"web development",
		"express.js",
	],
	mongodb: ["database design", "nosql", "backend development", "databases", "database"],
	sql: ["postgresql", "mysql", "database design", "relational databases", "databases", "database"],
	postgresql: ["sql", "database design", "relational databases", "databases", "database"],
	mysql: ["sql", "database design", "relational databases", "databases", "database"],
	python: [
		"machine learning",
		"data science",
		"backend development",
		"data analysis",
		"artificial intelligence",
		"ai",
		"deep learning",
		"pandas",
		"numpy",
		"tensorflow",
		"pytorch",
	],
	"machine learning": [
		"python",
		"data science",
		"artificial intelligence",
		"ai",
		"deep learning",
		"statistics",
		"tensorflow",
		"pytorch",
	],
	tensorflow: ["machine learning", "python", "deep learning", "ai", "artificial intelligence"],
	pytorch: ["machine learning", "python", "deep learning", "ai", "artificial intelligence"],
	"data structures": [
		"algorithms",
		"problem solving",
		"competitive programming",
		"computer science fundamentals",
	],
	algorithms: [
		"data structures",
		"problem solving",
		"competitive programming",
		"computer science fundamentals",
	],
	java: ["spring boot", "backend development", "object oriented programming", "oop"],
	"c++": [
		"c",
		"object oriented programming",
		"oop",
		"competitive programming",
		"systems programming",
	],
	"c#": [".net", "backend development", "object oriented programming", "oop"],
	html: ["css", "frontend development", "web development", "web design"],
	css: [
		"html",
		"frontend development",
		"web development",
		"web design",
		"tailwind css",
		"bootstrap",
	],
	"cloud computing": ["aws", "azure", "gcp", "google cloud", "devops"],
	aws: ["cloud computing", "amazon web services", "devops"],
	docker: ["kubernetes", "devops", "containerization"],
	kubernetes: ["docker", "devops", "container orchestration"],
};

function normalizeSkill(skill: string): string {
	return skill
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9+#]/g, "");
}

function checkPartialMatch(required: string, userSkill: string): boolean {
	const r = normalizeSkill(required);
	const u = normalizeSkill(userSkill);

	if (r.length > 2 && u.length > 2 && (r.includes(u) || u.includes(r))) {
		return true;
	}
	return false;
}

export async function matchSkills(
	requiredSkills: string[],
	userSkills: string[],
): Promise<SkillMatchDetails[]> {
	const results: SkillMatchDetails[] = [];
	const normalizedUserSkillsRaw = userSkills.map((s) => s.toLowerCase().trim());
	const normalizedUserSkills = userSkills.map(normalizeSkill);

	for (const reqSkill of requiredSkills) {
		const normReqRaw = reqSkill.toLowerCase().trim();
		const normReq = normalizeSkill(reqSkill);

		// 1. Exact Match (100%)
		if (normalizedUserSkillsRaw.includes(normReqRaw) || normalizedUserSkills.includes(normReq)) {
			const index =
				normalizedUserSkillsRaw.indexOf(normReqRaw) !== -1
					? normalizedUserSkillsRaw.indexOf(normReqRaw)
					: normalizedUserSkills.indexOf(normReq);

			results.push({
				requiredSkill: reqSkill,
				matchType: "Exact",
				matchedWith: userSkills[index],
				score: 100,
				reason: "Exact match found in your profile.",
			});
			continue;
		}

		let bestMatch: SkillMatchDetails | null = null;

		// Compare against every user skill to find the best partial/related match
		for (let i = 0; i < userSkills.length; i++) {
			const userSkill = userSkills[i];
			const normUserRaw = normalizedUserSkillsRaw[i];
			const normUser = normalizedUserSkills[i];

			// 2. Partial Match (e.g., 75%)
			if (checkPartialMatch(normReqRaw, normUserRaw) || checkPartialMatch(normReq, normUser)) {
				const score = 75;
				if (!bestMatch || score > bestMatch.score) {
					bestMatch = {
						requiredSkill: reqSkill,
						matchType: "Partial",
						matchedWith: userSkill,
						score,
						reason: `"${userSkill}" is considered a partial match for "${reqSkill}".`,
					};
				}
				continue;
			}

			// 3. Related Skill Match - Predefined Dictionary (e.g., 60%)
			const relatedReq =
				PREDEFINED_RELATIONSHIPS[normReqRaw] || PREDEFINED_RELATIONSHIPS[normReq] || [];
			const relatedUser =
				PREDEFINED_RELATIONSHIPS[normUserRaw] || PREDEFINED_RELATIONSHIPS[normUser] || [];

			if (
				relatedReq.some((r) => r === normUserRaw || normalizeSkill(r) === normUser) ||
				relatedUser.some((r) => r === normReqRaw || normalizeSkill(r) === normReq)
			) {
				const score = 60;
				if (!bestMatch || score > bestMatch.score) {
					bestMatch = {
						requiredSkill: reqSkill,
						matchType: "Related",
						matchedWith: userSkill,
						score,
						reason: `"${userSkill}" is closely related to "${reqSkill}".`,
					};
				}
			}
		}

		if (bestMatch) {
			results.push(bestMatch);
		} else {
			results.push({
				requiredSkill: reqSkill,
				matchType: "Missing",
				score: 0,
				reason: `You are missing the "${reqSkill}" skill.`,
			});
		}
	}

	return results;
}
