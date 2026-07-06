export class SkillNormalizer {
	static normalize(skill: string): string {
		const lower = skill.toLowerCase().trim();

		if (lower === "node" || lower === "nodejs" || lower === "node js" || lower === "node.js")
			return "Node.js";
		if (lower === "js" || lower === "javascript") return "JavaScript";
		if (lower === "ts" || lower === "typescript") return "TypeScript";
		if (lower === "reactjs" || lower === "react.js" || lower === "react") return "React";
		if (lower === "nextjs" || lower === "next.js" || lower === "next") return "Next.js";
		if (lower === "express" || lower === "express.js" || lower === "expressjs") return "Express.js";
		if (lower === "mongo" || lower === "mongodb") return "MongoDB";
		if (lower === "sql") return "SQL";
		if (lower === "mysql") return "MySQL";
		if (lower === "postgres" || lower === "postgresql") return "PostgreSQL";
		if (lower === "aws cloud" || lower === "aws") return "AWS";
		if (lower === "git hub" || lower === "github") return "GitHub";
		if (lower === "ai" || lower === "artificial intelligence") return "Artificial Intelligence";
		if (lower === "ml" || lower === "machine learning") return "Machine Learning";
		if (lower === "rest api" || lower === "rest") return "REST API";
		if (lower === "docker") return "Docker";
		if (lower === "python") return "Python";

		// Capitalize words for fallback
		return skill.replace(/\b\w/g, (l) => l.toUpperCase()).trim();
	}

	static normalizeArray(skills: string[]): string[] {
		if (!skills || !Array.isArray(skills)) return [];
		const normalized = skills.map((s) => SkillNormalizer.normalize(s));
		return Array.from(new Set(normalized));
	}
}

export class CareerNormalizer {
	static normalize(career: string): string {
		const lower = career.toLowerCase().trim();

		if (lower === "full stack" || lower === "full stack developer") return "Full Stack Developer";
		if (lower === "frontend" || lower === "frontend developer" || lower === "front-end developer")
			return "Frontend Developer";
		if (lower === "backend" || lower === "backend developer" || lower === "back-end developer")
			return "Backend Developer";
		if (lower === "software engineer" || lower === "swe") return "Software Engineer";
		if (
			lower === "ai engineer" ||
			lower === "ai/ml engineer" ||
			lower === "machine learning engineer"
		)
			return "AI/ML Engineer";
		if (lower === "data scientist" || lower === "data science") return "Data Scientist";
		if (lower === "devops" || lower === "devops engineer") return "DevOps Engineer";

		// Capitalize words for fallback
		return career.replace(/\b\w/g, (l) => l.toUpperCase()).trim();
	}
}
