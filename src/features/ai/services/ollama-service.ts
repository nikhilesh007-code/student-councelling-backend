import ollama from 'ollama';

export interface CareerExplanationParams {
    userSkills: string[];
    interests: string[];
    careerGoal: string;
    recommendedCareer: string;
    matchPercentage: number;
    missingSkills: string[];
}

export interface SkillGapRoadmapParams {
    careerName: string;
    currentSkills: string[];
    missingSkills: string[];
    readinessScore: number;
}

export async function generateCareerExplanation(data: CareerExplanationParams) {
    const prompt = `
You are CareerAI.
Analyze why this career matches the user and provide actionable next steps.

User Profile:
- Skills: ${data.userSkills.join(', ')}
- Interests: ${data.interests.join(', ')}
- Goal: ${data.careerGoal}

Recommended Career: ${data.recommendedCareer}
Match: ${data.matchPercentage}%
Missing Skills: ${data.missingSkills.join(', ')}

Respond ONLY in valid JSON format, with no markdown formatting or extra text. Use exactly this schema:
{
  "aiExplanation": "Why this career is recommended, career outlook, and key strengths of the student.",
  "nextSteps": [
    "Step 1 to improve match score",
    "Step 2",
    "Step 3"
  ]
}
`;

    const modelName = "llama3:latest";
    const startTimeMs = performance.now();

    console.log(`[AI] Prompt:\n${prompt}`);

    try {
        const aiResponse = await ollama.chat({
            model: modelName,
            format: "json",
            messages: [{ role: "user", content: prompt }],
        });

        const endTimeMs = performance.now();
        const generationTime = ((endTimeMs - startTimeMs) / 1000).toFixed(2);
        
        console.log(`[AI] Response:\n${aiResponse.message.content}`);
        console.log(`[AI] Response Time: ${generationTime} seconds`);

        return JSON.parse(aiResponse.message.content);
    } catch (error) {
        console.error("[AI] Error generating career explanation:", error);
        return {
            aiExplanation: `Based on your profile, ${data.recommendedCareer} is a strong match. We couldn't generate a personalized explanation at this time.`,
            nextSteps: data.missingSkills.map(skill => `Learn ${skill}`)
        };
    }
}

export async function generateSkillGapRoadmap(data: SkillGapRoadmapParams) {
    const prompt = `
You are CareerAI.
Create a personalized learning roadmap to bridge the skill gap for this career.

Career: ${data.careerName}
Current Skills: ${data.currentSkills.join(', ')}
Missing Skills: ${data.missingSkills.join(', ')}
Readiness Score: ${data.readinessScore}%

Respond ONLY in valid JSON format, with no markdown formatting or extra text. Use exactly this schema:
{
  "roadmap": [
    { "step": 1, "title": "Step Title", "desc": "Step description", "color": "bg-emerald-500" }
  ],
  "projects": [
    "Project 1",
    "Project 2"
  ],
  "studyPlan": "Weekly study plan description",
  "estimatedTimeline": "e.g., 3 months"
}
`;

    const modelName = "llama3:latest";
    const startTimeMs = performance.now();

    console.log(`[AI] Prompt:\n${prompt}`);

    try {
        const aiResponse = await ollama.chat({
            model: modelName,
            format: "json",
            messages: [{ role: "user", content: prompt }],
        });

        const endTimeMs = performance.now();
        const generationTime = ((endTimeMs - startTimeMs) / 1000).toFixed(2);
        
        console.log(`[AI] Response:\n${aiResponse.message.content}`);
        console.log(`[AI] Response Time: ${generationTime} seconds`);

        return JSON.parse(aiResponse.message.content);
    } catch (error) {
        console.error("[AI] Error generating skill gap roadmap:", error);
        return {
            roadmap: data.missingSkills.map((skill, index) => ({
                step: index + 1,
                title: `Learn ${skill}`,
                desc: `Focus on mastering ${skill} fundamentals`,
                color: "bg-emerald-500"
            })),
            projects: ["Build a portfolio project"],
            studyPlan: "Focus 10 hours a week on missing skills.",
            estimatedTimeline: "3-6 months"
        };
    }
}

export interface SkillSimilarityParams {
    skillA: string;
    skillB: string;
}

export async function evaluateSkillSimilarity(data: SkillSimilarityParams): Promise<{ matchType: 'Related' | 'Missing'; score: number; reason: string }> {
    const prompt = `
You are CareerAI.
Evaluate the similarity and relationship between the following two skills:
Skill 1: ${data.skillA}
Skill 2: ${data.skillB}

Are they highly related (like TypeScript and JavaScript, React and Frontend Development) or completely unrelated?
If they are related, provide a score between 30 and 60 indicating the strength of the relationship.
If they are unrelated, provide a score of 0.

Respond ONLY in valid JSON format, with no markdown formatting or extra text. Use exactly this schema:
{
  "matchType": "Related" | "Missing",
  "score": number, // 30-60 if related, 0 if missing
  "reason": "A short 1-sentence explanation of the relationship, or why they are unrelated."
}
`;

    const modelName = "llama3:latest";

    try {
        const aiResponse = await ollama.chat({
            model: modelName,
            format: "json",
            messages: [{ role: "user", content: prompt }],
        });

        const parsed = JSON.parse(aiResponse.message.content);
        if (parsed.score > 0 && parsed.score < 30) parsed.score = 30;
        if (parsed.score > 60) parsed.score = 60;
        
        return {
            matchType: parsed.score > 0 ? 'Related' : 'Missing',
            score: parsed.score || 0,
            reason: parsed.reason || "No explanation provided."
        };
    } catch (error) {
        console.error("[AI] Error evaluating skill similarity:", error);
        return {
            matchType: 'Missing',
            score: 0,
            reason: "Could not evaluate similarity due to an error."
        };
    }
}
