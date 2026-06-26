import { Router } from "express";
import multer from "multer";
import { resumeController } from "./resume-controller";

const router = Router();

// Store file in memory for direct parsing
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB
	},
});

router.post("/upload", upload.single("resume"), resumeController.upload);
router.post("/analyze", resumeController.analyze);
router.post("/analysis", resumeController.getAnalysis);
router.post("/match", resumeController.analyzeResumeMatch);

export const resumeRouter: Router = router;
