import { type IRouter, Router } from "express";
import { aiHealthManager } from "./ai-health-manager";

const router: IRouter = Router();

router.get("/status", (req, res) => {
	res.json(aiHealthManager.getStatus());
});

export { router as aiRouter };
