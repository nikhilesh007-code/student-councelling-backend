import { aiService } from '../../ai/ai-service';
import { studyPlannerContextService } from './study-planner-context.service';

export interface GeneratedTask {
  title: string;
  skill: string;
  topic: string;
  estimatedMinutes: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reason: string;
}

export interface GeneratedDayPlan {
  dayIndex: number; // 0 = today, 1 = tomorrow, etc.
  tasks: GeneratedTask[];
}

export class StudyPlannerAiService {
  private getSystemPrompt(): string {
    return `You are an expert AI Study Coach. Your goal is to generate a highly personalized study plan.

STRICT RULES:
1. ONLY return a valid JSON object matching the requested schema. No markdown formatting outside the JSON, no explanations.
2. Tasks MUST be derived ONLY from: Student Profile, Target Career, Skill Gap Analysis, Career Roadmap, Placement Preparation, and Learning Resources.
3. NEVER generate unrelated school subjects (e.g., general algebra, physics) unless they are explicitly required for the user's selected career.
4. DO NOT invent or hallucinate learning resource URLs or links. 
5. DO NOT exceed the user's daily preferred study hours (sum of estimatedMinutes per day must be <= preferred hours * 60).
6. Assign logical priorities (URGENT, HIGH, MEDIUM, LOW). Missing core skills are HIGH/URGENT.
7. Provide practical, actionable topics. Examples: 'React State Management', 'Build Authentication UI', 'Express Middleware'.
8. Do not repeat the exact same task topic multiple times in a week unless it's a practice session.
`;
  }

  async generatePlan(userId: string, planType: 'Daily' | 'Weekly' = 'Weekly'): Promise<GeneratedDayPlan[]> {
    const context = await studyPlannerContextService.buildContext(userId);
    
    const isDaily = planType === 'Daily';
    
    const scheduleInstruction = isDaily 
      ? `Generate ONLY today's study schedule (1 day, dayIndex 0).`
      : `Generate exactly 7 days of tasks (dayIndex 0 to 6). Distribute learning naturally across the week. Each day should contain realistic study sessions.`;

    const userPrompt = `
${scheduleInstruction}

Context:
- Target Career: ${context.profile?.selectedCareer || 'Not specified'}
- Missing Skills (Skill Gap Analysis): ${JSON.stringify(context.skillGap || [])}
- Career Roadmap Focus: ${JSON.stringify(context.roadmap || [])}
- Placement Preparation: ${JSON.stringify(context.placementPrep || [])}
- Learning Resources: ${JSON.stringify(context.learningResources || [])}
- Preferences: ${context.preferences.hoursPerDay} hours/day, difficulty: ${context.preferences.difficulty}.
- Focus Area: ${context.preferences.focusArea || 'General'}

Output format (JSON only):
{
  "plan": [
    {
      "dayIndex": 0,
      "tasks": [
        {
          "title": "Specific Actionable Title (e.g. React State Management)",
          "skill": "skill name",
          "topic": "specific actionable description of what to do",
          "estimatedMinutes": 60,
          "priority": "HIGH",
          "reason": "Why this task was selected based on the user's profile and roadmap"
        }
      ]
    }
  ]
}`;

    const response = await aiService.generate(userPrompt, {
      userId,
      feature: 'study-planner',
      systemPrompt: this.getSystemPrompt(),
      responseFormat: 'json',
      temperature: 0.2
    });

    try {
      const parsed = JSON.parse(response.response);
      return parsed.plan || [];
    } catch (e) {
      console.error('Failed to parse AI study plan output:', e);
      return [];
    }
  }
}

export const studyPlannerAiService = new StudyPlannerAiService();
