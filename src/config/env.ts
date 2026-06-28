import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.coerce.number().default(3000),
	DATABASE_URL: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.string().url(),
	FRONTEND_URL: z.string().url().default("http://localhost:5173"),
	GOOGLE_CLIENT_ID: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string().min(1),
	GEMINI_API_KEY: z.string().min(1).optional(),
	GROQ_API_KEY: z.string().min(1).optional(),
	OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
	OLLAMA_MODEL: z.string().optional(),
	ADZUNA_APP_ID: z.string().min(1),
	ADZUNA_APP_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
