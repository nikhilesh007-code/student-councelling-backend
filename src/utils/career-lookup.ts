import { prisma } from "../database";
import { matchSkills } from "../features/skills/services/skill-similarity-service";

const FALLBACK_MAPPINGS: Record<string, string> = {
    "ai engineer": "Machine Learning Engineer",
    "ml engineer": "Machine Learning Engineer",
    "software developer": "Developer",
    "full stack developer": "Developer"
};

export async function resolveCareer(careerGoalInput: string | null, userSkills: string[] = []) {
    const originalInput = careerGoalInput || "";
    const lowerInput = originalInput.toLowerCase();

    let targetSearch = originalInput;

    for (const [key, value] of Object.entries(FALLBACK_MAPPINGS)) {
        if (lowerInput.includes(key)) {
            targetSearch = value;
            break;
        }
    }

    const allCareers = await prisma.career.findMany({
        include: { skills: { include: { skill: true } } }
    });

    let career = null;

    if (targetSearch.trim()) {
        career = allCareers.find(c => 
            c.name.toLowerCase().includes(targetSearch.toLowerCase()) || 
            targetSearch.toLowerCase().includes(c.name.toLowerCase())
        ) || null;
    }

    if (!career) {
        if (userSkills.length > 0) {
            console.log(`[Warning] Career goal '${originalInput}' not found. Computing dynamic fallback based on skills.`);
            let bestScore = -1;
            let bestCareer = null;

            for (const c of allCareers) {
                const requiredSkills = c.skills.map(s => s.skill.name);
                if (requiredSkills.length === 0) continue;

                const skillMatches = await matchSkills(requiredSkills, userSkills);
                let totalScore = 0;
                for (const match of skillMatches) {
                    totalScore += match.score;
                }
                const avgScore = Math.round(totalScore / requiredSkills.length);

                if (avgScore > bestScore) {
                    bestScore = avgScore;
                    bestCareer = c;
                }
            }

            if (bestCareer) {
                console.log(`[Info] Dynamically resolved fallback career to '${bestCareer.name}' with score ${bestScore}%`);
                career = bestCareer;
            }
        }

        if (!career) {
            console.warn(`[Warning] Career goal '${originalInput}' not found and no skills matched. Falling back to 'Developer'.`);
            career = await prisma.career.findFirst({
                where: { name: { equals: "Developer", mode: 'insensitive' } },
                include: { skills: { include: { skill: true } } }
            });
            
            if (!career) {
                // Ultimate fallback if Developer is not in db
                career = allCareers[0] || null;
            }
        }
    }

    return career;
}
