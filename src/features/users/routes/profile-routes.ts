import { Router } from "express";
import multer from "multer";
import {
	createProfile,
	getProfile,
	updateProfile,
	updateTargetCareer,
} from "../controllers/profile-controller";
import { parseResume } from "../controllers/resume-controller";

export const profileRouter: Router = Router();

const upload = multer({ storage: multer.memoryStorage() });

profileRouter.post("/", createProfile);
profileRouter.get("/:userId", getProfile);
profileRouter.put("/", updateProfile);
profileRouter.post("/target-career", updateTargetCareer);
profileRouter.post("/resume", upload.single("resume"), parseResume);
