import { Router } from "express";
import { opportunitiesController } from "../controllers/opportunities-controller";

const router: Router = Router();

router.post("/", (req, res) => {
	opportunitiesController.getOpportunities(req, res);
});
router.post("/bookmark", (req, res) => {
	opportunitiesController.toggleBookmark(req, res);
});
router.post("/applied", (req, res) => {
	opportunitiesController.markApplied(req, res);
});

export { router as opportunitiesRoutes };
