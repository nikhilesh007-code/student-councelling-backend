import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { auth } from "./auth";
import { env } from "./config/env";
import { registerSwaggerDocs } from "./docs/swagger";
import { healthRouter } from "./features/health/routes/health-routes";
import { profileRouter } from "./features/users/routes/profile-routes";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { skillGapRouter } from "./features/skill-gap-analysis/routes/skill-gap-routes";
import { careerGuidanceRouter } from "./features/career-guidance/routes/career-guidance-routes";

const app: Express = express();

app.use(
	cors({
		origin: env.BETTER_AUTH_URL,
		credentials: true,
	}),
);

registerSwaggerDocs(app);

// Express 5
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRouter);
app.use("/api/profile", profileRouter);
app.use("/api/skill-gap", skillGapRouter);
app.use("/api/career-guidance", careerGuidanceRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
