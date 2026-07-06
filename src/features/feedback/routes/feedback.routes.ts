import { type Router as ExpressRouter, Router } from "express";
import { feedbackController, uploadFeedbackImage } from "../controllers/feedback.controller";

const router: ExpressRouter = Router();

// Create new feedback report (supports image upload)
router.post(
	"/",
	uploadFeedbackImage.single("attachment"),
	feedbackController.createFeedback.bind(feedbackController),
);

// Get user's feedback reports
router.get("/my", feedbackController.getMyFeedback.bind(feedbackController));

// Delete a feedback report
router.delete("/:id", feedbackController.deleteFeedback.bind(feedbackController));

export default router;
