import type { Request, Response } from 'express'
import { prisma } from '../../../database'
import { matchSkills } from '../../skills/services/skill-similarity-service'
import ollama from 'ollama'

export async function getAllCareers(req: Request, res: Response) {
  try {
    const { userId } = req.query;

    let userSkills: string[] = [];
    let userInterests: string[] = [];

    if (userId && typeof userId === 'string') {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { skills: true, interests: true }
      });
      if (profile) {
        userSkills = profile.skills;
        
        if (typeof profile.interests === 'string') {
          userInterests = (profile.interests as string).split(',').map((i: string) => i.trim());
        } else if (Array.isArray(profile.interests)) {
          userInterests = profile.interests;
        }
      }
    }

    const careers = await prisma.career.findMany({
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    const enrichedCareersPromises = careers.map(async career => {
      const requiredSkills = career.skills.map(s => s.skill.name);
      
      let matchScore = 0;
      let missingSkills: string[] = requiredSkills;
      let matchedSkills: string[] = [];

      if (userSkills.length > 0 && requiredSkills.length > 0) {
        const skillMatches = await matchSkills(requiredSkills, userSkills);
        let totalScore = 0;
        
        for (const match of skillMatches) {
            totalScore += match.score;
            if (match.matchType === 'Exact' || match.matchType === 'Partial' || match.matchType === 'Related') {
                if (match.matchedWith) {
                    matchedSkills.push(match.matchedWith);
                }
            } else if (match.matchType === 'Missing') {
                missingSkills.push(match.requiredSkill);
            }
        }
        
        matchScore = Math.round(totalScore / requiredSkills.length);
        missingSkills = requiredSkills.filter(s => !skillMatches.some(m => m.requiredSkill === s && m.matchType !== 'Missing'));
        matchedSkills = [...new Set(matchedSkills)];
      }

      return {
        id: career.id,
        name: career.name,
        description: career.description,
        salaryRange: career.salaryRange,
        requiredSkills,
        matchScore,
        missingSkills,
        matchedSkills
      };
    });

    let enrichedCareers = await Promise.all(enrichedCareersPromises);

    // Sort by match score descending
    enrichedCareers.sort((a, b) => b.matchScore - a.matchScore);

    // AI Refinement Reranker (Top 10)
    if (userInterests.length > 0 && enrichedCareers.length > 0) {
        const topCareers = enrichedCareers.slice(0, 10);
        
        const prompt = `
You are CareerAI.
Rank the following careers based strictly on how well they align with the user's interests.
User Interests: ${userInterests.join(', ')}

Careers to rank:
${topCareers.map((c, i) => `${i + 1}. ${c.name}`).join('\n')}

Return ONLY a valid JSON array of the career names, ordered from most relevant to least relevant. No markdown formatting or extra text.
["Career A", "Career B"]
`;
        try {
            const aiResponse = await ollama.chat({
                model: "llama3:latest",
                format: "json",
                messages: [{ role: "user", content: prompt }]
            });
            
            const rankedNames: string[] = JSON.parse(aiResponse.message.content);
            
            if (Array.isArray(rankedNames) && rankedNames.length > 0) {
                // Apply a bonus to the matchScore based on AI ranking
                topCareers.forEach(c => {
                    const rankIndex = rankedNames.findIndex(name => name.toLowerCase() === c.name.toLowerCase());
                    if (rankIndex !== -1) {
                        // Max bonus of 15 points for rank 0, linearly decreasing
                        const bonus = Math.max(0, 15 - (rankIndex * 2));
                        c.matchScore = Math.min(100, c.matchScore + bonus);
                    }
                });
                
                // Re-sort after applying bonus
                enrichedCareers.sort((a, b) => b.matchScore - a.matchScore);
            }
        } catch (error) {
            console.error("[AI] Failed to rerank careers:", error);
            // Ignore error and fall back to purely deterministic sorting
        }
    }

    res.status(200).json({
      success: true,
      data: enrichedCareers
    });
  } catch (error) {
    console.error('Failed to get careers:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve careers' });
  }
}

export async function getCareerById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const career = await prisma.career.findUnique({
      where: { id: id as string },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!career) {
      return res.status(404).json({ success: false, message: 'Career not found' });
    }

    const formattedCareer = {
      ...career,
      requiredSkills: (career as any).skills.map((s: any) => s.skill.name)
    };
    
    // remove relation array to clean up response
    delete (formattedCareer as any).skills;

    res.status(200).json({
      success: true,
      data: formattedCareer
    });
  } catch (error) {
    console.error('Failed to get career:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve career' });
  }
}
