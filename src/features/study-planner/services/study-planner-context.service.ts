import { prisma } from '../../../database';

export interface StudyPlannerContext {
  profile: any;
  skillGap: any;
  roadmap: any;
  placementPrep: any;
  learningResources: any;
  preferences: any;
}

export class StudyPlannerContextService {
  async buildContext(userId: string): Promise<StudyPlannerContext> {
    // 1. Profile
    const profile = await prisma.studentProfile.findUnique({
      where: { userId }
    });

    // 2. AI Cache (contains skillGap, roadmap, placement)
    const aiCache = await prisma.aiCache.findUnique({
      where: { userId }
    });

    const skillGap = aiCache?.skillGap || null;
    const roadmap = aiCache?.roadmap || null;
    const placementPrep = aiCache?.placement || null;

    // 3. Learning Resources (mocking fetch from learning resource service for context)
    // We could theoretically fetch recommended resources here based on missing skills.
    const learningResources = { 
       note: "Use the learning resources endpoint to suggest courses, articles, or videos." 
    };

    // 4. Study Preferences
    const preferences = await prisma.studyPreference.findUnique({
      where: { userId }
    });

    return {
      profile,
      skillGap,
      roadmap,
      placementPrep,
      learningResources,
      preferences: preferences || {
         hoursPerDay: 2,
         preferredStartTime: '18:00',
         studyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
         difficulty: 'Beginner',
         focusArea: 'General'
      }
    };
  }
}

export const studyPlannerContextService = new StudyPlannerContextService();
