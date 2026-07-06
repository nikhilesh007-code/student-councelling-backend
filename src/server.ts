import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database";
import { initReminderScheduler } from "./features/study-planner/cron/reminder-scheduler";

async function bootstrap() {
	try {
		await prisma.$connect();
		console.log("[DB] PostgreSQL connected successfully");

		initReminderScheduler();

		app.listen(env.PORT as number, "0.0.0.0", () => {
			console.log(`[SERVER] Backend listening on port ${env.PORT}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

bootstrap();
