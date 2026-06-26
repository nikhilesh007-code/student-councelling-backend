import { Router } from "express";
import { progressController } from "./progress-controller";

export const progressRoutes: Router = Router();

progressRoutes.post("/analyze", progressController.analyzeProgress.bind(progressController));
