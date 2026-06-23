import { Router } from "express";
import { analyzeSkillGap, analyzeSkillGapAi } from "../controllers/skill-gap-controller";

export const skillGapRouter: Router = Router();

skillGapRouter.post("/analyze", analyzeSkillGap);
skillGapRouter.post("/analyze/ai", analyzeSkillGapAi);