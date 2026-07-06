import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { auth } from "./auth";
import { env } from "./config/env";
import { registerSwaggerDocs } from "./docs/swagger";
import { aiRouter } from "./features/ai/ai-routes";
import { customAuthRoutes } from "./features/auth/routes/auth-routes";
import { careerGuidanceRouter } from "./features/career-guidance/routes/career-guidance-routes";
import { chatRouter } from "./features/chat/routes/chat-routes";
import { dashboardRoutes } from "./features/dashboard/routes/dashboard-routes";
import feedbackRoutes from "./features/feedback/routes/feedback.routes";
import { healthRouter } from "./features/health/routes/health-routes";
import { resourcesRoutes } from "./features/learning-resources/routes/resources-routes";
import notificationRoutes from "./features/notifications/routes/notification.routes";
import { opportunitiesRoutes } from "./features/opportunities/routes/opportunities-routes";
import { placementRouter } from "./features/placement/placement-routes";
import { progressRoutes } from "./features/progress/progress-routes";
import { resumeRouter } from "./features/resume/resume-routes";
import { roadmapRoutes } from "./features/roadmap/routes/roadmap-routes";
import { skillGapRouter } from "./features/skill-gap-analysis/routes/skill-gap-routes";
import studyPlannerRoutes from "./features/study-planner/routes/study-planner.routes";
import { profileRouter } from "./features/users/routes/profile-routes";
import { attachDebugMetadata } from "./middleware/debug-metadata";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
	cors({
		origin: (origin, callback) => {
			const allowedOrigins = [
				env.BETTER_AUTH_URL?.replace(/\/$/, ""),
				env.FRONTEND_URL?.replace(/\/$/, ""),
				"http://localhost:5173",
				"http://localhost:5174",
			].filter(Boolean);

			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				console.log("[CORS] Blocked origin:", origin);
				// To prevent complete block during debugging, allow it but log
				callback(null, true);
			}
		},
		credentials: true,
	}),
);

// Security Headers
app.use(helmet({
	crossOriginResourcePolicy: false,
}));

// Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 500, // limit each IP to 500 requests per windowMs
});
app.use(limiter);

registerSwaggerDocs(app);
// Express 5
// Express 5
app.use("/api/auth", customAuthRoutes);
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
import path from "path";

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
	if (!req.originalUrl.includes("/api/auth/get-session") && process.env.NODE_ENV !== "production") {
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
