import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database";
import { initOllama } from "./features/ai/ai-service";
import { initReminderScheduler } from "./features/study-planner/cron/reminder-scheduler";

async function bootstrap() {
	try {
		await prisma.$connect();
		console.log("[DB] PostgreSQL connected successfully");
		
		await initOllama();
		initReminderScheduler();

		app.listen(env.PORT, () => {
			console.log(`[SERVER] Backend listening on http://localhost:${env.PORT}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

bootstrap();
