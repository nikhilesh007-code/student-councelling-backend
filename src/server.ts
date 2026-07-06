import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database";
import { initOllama } from "./features/ai/ai-service";
import { initReminderScheduler } from "./features/study-planner/cron/reminder-scheduler";

async function bootstrap() {
	try {
		await prisma.$connect();
		console.log("[DB] PostgreSQL connected successfully");

		// Don't let Ollama failure stop the server
		try {
			await initOllama();
		} catch (err) {
			console.warn("[OLLAMA] Skipping Ollama initialization:", err);
		}

		initReminderScheduler();

		app.listen(env.PORT, () => {
			console.log(`[SERVER] Backend listening on port ${env.PORT}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

bootstrap();