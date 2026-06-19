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
                userId,
            },
        });

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
            branch,
            year,
            cgpa,
            skills,
            interests,
            careerGoal,
        } = req.body;

        const profile = await prisma.studentProfile.update({
            where: {
                userId,
            },
            data: {
                branch,
                year,
                cgpa,
                skills,
                interests,
                careerGoal,
            },
        });

        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
        });
    }
}