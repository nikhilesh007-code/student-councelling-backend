import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { auth } from "./auth";
import { env } from "./config/env";
import { registerSwaggerDocs } from "./docs/swagger";
import { careerGuidanceRouter } from "./features/career-guidance/routes/career-guidance-routes";
import { chatRouter } from "./features/chat/routes/chat-routes";
import { healthRouter } from "./features/health/routes/health-routes";
import { resourcesRoutes } from "./features/learning-resources/routes/resources-routes";
import { opportunitiesRoutes } from "./features/opportunities/routes/opportunities-routes";
import { placementRouter } from "./features/placement/placement-routes";
import { progressRoutes } from "./features/progress/progress-routes";
import { resumeRouter } from "./features/resume/resume-routes";
import { roadmapRoutes } from "./features/roadmap/routes/roadmap-routes";
import { skillGapRouter } from "./features/skill-gap-analysis/routes/skill-gap-routes";
import { profileRouter } from "./features/users/routes/profile-routes";
import { attachDebugMetadata } from "./middleware/debug-metadata";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { aiRouter } from "./features/ai/ai-routes";
import studyPlannerRoutes from "./features/study-planner/routes/study-planner.routes";
import notificationRoutes from "./features/notifications/routes/notification.routes";
import feedbackRoutes from "./features/feedback/routes/feedback.routes";
import { dashboardRoutes } from "./features/dashboard/routes/dashboard-routes";
import { customAuthRoutes } from "./features/auth/routes/auth-routes";

const app: Express = express();
app.set("trust proxy", 1);
console.log("APP.TS LOADED");

app.use(
	cors({
		origin: [env.BETTER_AUTH_URL, env.FRONTEND_URL, "http://localhost:5174"],
		credentials: true,
	}),
);

registerSwaggerDocs(app);
console.log("SWAGGER REGISTERED");
// Express 5
app.use("/api/auth", customAuthRoutes);
app.all(
  "/api/auth/{*any}",
  (req, _res, next) => {
    console.log("BETTER AUTH HIT:", req.method, req.originalUrl);
    next();
  },
  toNodeHandler(auth)
);
console.log("BETTER AUTH REGISTERED");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
import path from "path";
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
	if (!req.originalUrl.includes("/api/auth/get-session")) {
		console.log(`[API] ${req.method} ${req.originalUrl}`);
	}
	next();
});
app.use(attachDebugMetadata);

app.use("/api/health", healthRouter);
app.use("/api/profile", profileRouter);
app.use("/api/skill-gap", skillGapRouter);
app.use("/api/career-guidance", careerGuidanceRouter);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/learning-resources", resourcesRoutes);
app.use("/api/opportunities", opportunitiesRoutes);
app.use("/api/resume", resumeRouter);
app.use("/api/placement", placementRouter);
app.use("/api/progress", progressRoutes);

app.use("/api/chat", chatRouter);
app.use("/api/ai", aiRouter);
app.use("/api/study-planner", studyPlannerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export { app };
