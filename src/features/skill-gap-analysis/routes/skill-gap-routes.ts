import { Router } from "express";
import { analyzeSkillGap } from "../controllers/skill-gap-controller";

export const skillGapRouter: Router = Router();

skillGapRouter.post("/analyze", analyzeSkillGap);
