import { Router } from "express";
import { generateCareerGuidance } from "../controllers/career-guidance-controller";

export const careerGuidanceRouter: Router = Router();

careerGuidanceRouter.post("/", generateCareerGuidance);
