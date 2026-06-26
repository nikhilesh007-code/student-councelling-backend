export interface AIOptions {
	/** Expected response format */
	responseFormat?: "json" | "text";

	/** Temperature for response generation (0-2) */
	temperature?: number;

	/** Request timeout in milliseconds */
	timeoutMs?: number;

	/** Override the default model for this request */
	model?: string;

	/** System prompt for chat-style interactions */
	systemPrompt?: string;

	/** Name of the feature requesting AI (used for logging) */
	feature?: string;

	/** User ID to deduplicate concurrent requests */
	userId?: string;
}

export class RateLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RateLimitError";
	}
}
export interface AIResponse {
	/** Which provider ultimately served this response */
	provider: string;

	/** Whether a fallback provider was used (always false now) */
	fallbackUsed: boolean;

	/** The raw text response from the AI */
	response: string;

	/** Total time taken for the successful request in milliseconds */
	durationMs: number;

	/** The source name */
	source?: string;
}
