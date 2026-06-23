import { Router } from "express";
import { generateCareerGuidance, generateCareerGuidanceAi } from "../controllers/career-guidance-controller";

export const careerGuidanceRouter: Router = Router();

careerGuidanceRouter.post("/", generateCareerGuidance);
careerGuidanceRouter.post("/ai", generateCareerGuidanceAi);