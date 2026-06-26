import { Router } from "express";
import { getLearningResources } from "../controllers/resources-controller";

export const resourcesRoutes: Router = Router();

resourcesRoutes.post("/", getLearningResources);
