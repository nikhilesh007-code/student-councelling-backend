/**
 * AI-specific configuration.
 * Loads Groq API key from environment variables.
 */

export interface AIConfig {
	groqApiKey?: string;
	geminiApiKey?: string;
	model: string;
}

export const AI_MODEL = "llama-3.1-8b-instant";

let _config: AIConfig | null = null;

export function getAIConfig(): AIConfig {
	if (_config) return _config;

	_config = {
		groqApiKey: process.env.GROQ_API_KEY || undefined,
		geminiApiKey: process.env.GEMINI_API_KEY || undefined,
		model: AI_MODEL,
	};

	return _config;
}
