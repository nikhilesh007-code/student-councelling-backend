import { Router } from "express";
import { getRoadmapProgress, updatePhaseStatus } from "../controllers/progress-controller";
import { analyzeRoadmap, generateCareerRoadmap } from "../controllers/roadmap-controller";

export const roadmapRoutes: Router = Router();

roadmapRoutes.post("/generate", generateCareerRoadmap);
roadmapRoutes.post("/analyze", analyzeRoadmap);

roadmapRoutes.get("/progress", getRoadmapProgress);
roadmapRoutes.post("/progress", getRoadmapProgress); // support POST for easy body userId sending
roadmapRoutes.post("/phase/:phaseId/status", updatePhaseStatus);
