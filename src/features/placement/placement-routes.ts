import { Router } from "express";
import { placementController } from "./placement-controller";

const placementRouter: Router = Router();

placementRouter.post("/dashboard", placementController.getDashboard);

export { placementRouter };
