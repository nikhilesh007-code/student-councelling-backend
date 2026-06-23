import type { Request, Response } from "express";
import { prisma } from "../../../database";

export async function createProfile(req: Request, res: Response) {
    try {
        const {
            userId,
            branch,
            year,
            cgpa,
            skills,
            interests,
            careerGoal,
        } = req.body;

        const profile = await prisma.studentProfile.create({
            data: {
                userId,
                branch,
                year,
                cgpa,
                skills,
                interests,
                careerGoal,
            },
        });

        res.status(201).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create profile",
        });
    }
}

export async function getProfile(req: Request, res: Response) {
    try {
        const { userId } = req.params;

        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId: userId as string,
            },
            include: { user: true }
        });

        if (profile) {
            // Flatten name so frontend can use it easily
            (profile as any).name = (profile as any).user?.name;
        }

        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch profile",
        });
    }
}
export async function updateProfile(req: Request, res: Response) {
    try {
        const {
            userId,
            name,
            branch,
            year,
            cgpa,
            skills,
            interests,
            careerGoal,
            phone,
            bio,
            github,
            linkedin,
        } = req.body;

        if (name) {
            await prisma.user.update({
                where: { id: userId },
                data: { name },
            });
        }

        const profile = await prisma.studentProfile.upsert({
            where: {
                userId,
            },
            create: {
                userId,
                branch,
                year,
                cgpa,
                skills,
                interests,
                careerGoal,
                phone,
                bio,
                github,
                linkedin,
            },
            update: {
                branch,
                year,
                cgpa,
                skills,
                interests,
                careerGoal,
                phone,
                bio,
                github,
                linkedin,
            },
            include: { user: true }
        });

        // Invalidate AI cache when profile changes
        try {
            if (prisma.aiCache) {
                await prisma.aiCache.delete({ where: { userId } });
                console.log(`[AI CACHE INVALIDATED] for ${userId}`);
            }
        } catch (cacheError) {
            console.error(`[AI CACHE INVALIDATION FAILED] for ${userId}`, cacheError);
        }

        (profile as any).name = profile.user?.name;

        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error("Failed to update profile", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
        });
    }
}