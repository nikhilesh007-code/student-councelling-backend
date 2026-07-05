import { prisma } from '../../../database';
import { studyPlannerAiService, GeneratedDayPlan } from './study-planner-ai.service';
import { StudyPriority, StudyTaskStatus } from '@prisma/client';

export class StudyPlannerService {
  /**
   * Generates a 7-day study plan and saves it to the database.
   * Ensures it doesn't overwrite completed tasks.
   */
  async generatePlan(userId: string, prefsPayload: any) {
    const planType = prefsPayload?.planType || 'Weekly';
    const replaceExisting = prefsPayload?.replaceExisting !== false; // Default true

    const toLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = prefsPayload?.startDate || toLocalDateString(new Date());
    const [year, month, day] = startDateStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Archive existing plans if replacing
    if (replaceExisting) {
      const activePlans = await prisma.studyPlan.findMany({
        where: { userId, isActive: true },
        select: { id: true }
      });
      for (const p of activePlans) {
        await this.archivePlan(userId, p.id);
      }
      
      // Also archive orphan tasks just in case
      const orphanTasks = await prisma.studyTask.findMany({ where: { userId, planId: null, isArchived: false } });
      if (orphanTasks.length > 0) {
        const orphanIds = orphanTasks.map(t => t.id);
        await prisma.$transaction([
          prisma.studyTask.updateMany({ where: { id: { in: orphanIds } }, data: { isArchived: true } }),
          prisma.notification.deleteMany({ where: { userId, taskId: { in: orphanIds } } })
        ]);
      }
    }

    const aiPlan = await studyPlannerAiService.generatePlan(userId, planType);
    
    // 2. Fetch preferred start time
    const startTimeStr = prefsPayload?.preferredStartTime || '09:00';
    const [hours, minutes] = startTimeStr.split(':').map(Number);

    const tasksToCreate: any[] = [];

    for (const day of aiPlan) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(startDate.getDate() + day.dayIndex);
      scheduledDate.setHours(hours, minutes, 0, 0);

      let currentOffsetMinutes = 0;

      for (const task of day.tasks) {
        const taskTime = new Date(scheduledDate.getTime() + currentOffsetMinutes * 60000);
        
        tasksToCreate.push({
          userId,
          title: task.title || `Study: ${task.skill}`,
          description: task.topic + (task.reason ? `\n\nReason: ${task.reason}` : ''),
          skill: task.skill,
          scheduledAt: taskTime,
          estimatedMinutes: task.estimatedMinutes || 60,
          priority: (task.priority as StudyPriority) || StudyPriority.MEDIUM,
          status: StudyTaskStatus.PENDING
        });

        currentOffsetMinutes += (task.estimatedMinutes || 60) + 15; // 15 min break
      }
    }

    if (tasksToCreate.length > 0) {
      await prisma.$transaction(async (tx) => {
        const plan = await tx.studyPlan.create({
          data: {
            userId,
            title: `${planType} Study Plan`,
            type: planType.toUpperCase(),
            isActive: true
          }
        });

        const tasksWithPlan = tasksToCreate.map(t => ({ ...t, planId: plan.id }));
        await tx.studyTask.createMany({ data: tasksWithPlan });
      });
    }

    return this.getTasks(userId);
  }

  async getTasks(userId: string) {
    const plan = await prisma.studyPlan.findFirst({
      where: { userId, isActive: true },
    });
    
    return {
      plan,
      tasks: await prisma.studyTask.findMany({
        where: { userId, isArchived: false },
        orderBy: { scheduledAt: 'asc' }
      })
    };
  }

  async archivePlan(userId: string, planId: string) {
    const plan = await prisma.studyPlan.findFirst({ where: { id: planId, userId } });
    if (!plan) throw new Error('Plan not found');

    const tasks = await prisma.studyTask.findMany({ where: { planId, userId }, select: { id: true } });
    const taskIds = tasks.map(t => t.id);

    await prisma.$transaction([
      prisma.studyPlan.update({ where: { id: planId }, data: { isActive: false } }),
      prisma.studyTask.updateMany({ where: { planId, userId }, data: { isArchived: true } }),
      ...(taskIds.length > 0 ? [prisma.notification.deleteMany({ where: { userId, taskId: { in: taskIds } } })] : [])
    ]);

    return { success: true };
  }

  async updateTaskStatus(userId: string, taskId: string, status: StudyTaskStatus) {
    const data: any = { status };
    if (status === StudyTaskStatus.COMPLETED) {
      data.completedAt = new Date();
    }
    
    const task = await prisma.studyTask.update({
      where: { id: taskId, userId },
      data
    });

    if (status === StudyTaskStatus.COMPLETED) {
      // Check if all today's tasks are completed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const remainingToday = await prisma.studyTask.count({
        where: {
          userId,
          scheduledAt: { gte: today, lt: tomorrow },
          status: { in: [StudyTaskStatus.PENDING, StudyTaskStatus.IN_PROGRESS] }
        }
      });

      if (remainingToday === 0) {
        const { notificationService } = require('../../notifications/services/notification.service');
        await notificationService.createNotification({
          userId,
          type: 'DAILY_GOAL_MET',
          title: '🎉 Daily Goal Completed!',
          message: 'You have finished all your scheduled study tasks for today. Great job!',
          actionUrl: '/planner',
          icon: 'workspace_premium',
          module: 'STUDY',
          priority: 'ACHIEVEMENT'
        });
      }
    }

    return task;
  }

  async getStatistics(userId: string) {
    const tasks = await prisma.studyTask.findMany({
      where: { userId, isArchived: false }
    });

    let totalStudyMinutes = 0;
    let completedCount = 0;
    let todayCompletedCount = 0;
    let todayRemainingCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const task of tasks) {
      if (task.status === StudyTaskStatus.COMPLETED) {
        totalStudyMinutes += task.estimatedMinutes;
        completedCount++;
      }

      if (task.scheduledAt >= today && task.scheduledAt < tomorrow) {
        if (task.status === StudyTaskStatus.COMPLETED) {
          todayCompletedCount++;
        } else if (task.status === StudyTaskStatus.PENDING || task.status === StudyTaskStatus.IN_PROGRESS) {
          todayRemainingCount++;
        }
      }
    }

    const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    const studyHours = parseFloat((totalStudyMinutes / 60).toFixed(1));

    // Weekly progress
    const weeklyProgress = {
      target: 15, // from preferences ideally
      current: studyHours
    };

    return {
      studyHours,
      completedTasks: completedCount,
      completionRate,
      weeklyProgress,
      todayCompleted: todayCompletedCount,
      todayRemaining: todayRemainingCount
    };
  }

  async setPreferences(userId: string, prefs: any) {
    return prisma.studyPreference.upsert({
      where: { userId },
      update: prefs,
      create: { userId, ...prefs }
    });
  }
}

export const studyPlannerService = new StudyPlannerService();
