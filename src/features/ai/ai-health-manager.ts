export interface ProviderStatus {
	available: boolean;
	errorCount: number;
	rateLimitCount: number;
	lastSuccess: Date | null;
	avgLatencyMs: number;
	latencySamples: number[];
}

export interface AIHealthStatus {
	providers: {
		groq: ProviderStatus;
		gemini: ProviderStatus;
		ollama: ProviderStatus;
	};
	currentProvider: string;
	lastSuccessfulProvider: string | null;
}

const status: AIHealthStatus = {
	providers: {
		groq: { available: true, errorCount: 0, rateLimitCount: 0, lastSuccess: null, avgLatencyMs: 0, latencySamples: [] },
		gemini: { available: true, errorCount: 0, rateLimitCount: 0, lastSuccess: null, avgLatencyMs: 0, latencySamples: [] },
		ollama: { available: true, errorCount: 0, rateLimitCount: 0, lastSuccess: null, avgLatencyMs: 0, latencySamples: [] },
	},
	currentProvider: 'groq',
	lastSuccessfulProvider: null,
};

export const aiHealthManager = {
	getStatus(): AIHealthStatus {
		return status;
	},

	recordSuccess(provider: 'groq' | 'gemini' | 'ollama', latencyMs: number) {
		const p = status.providers[provider];
		p.available = true;
		p.errorCount = 0;
		p.lastSuccess = new Date();
		
		p.latencySamples.push(latencyMs);
		if (p.latencySamples.length > 20) p.latencySamples.shift();
		p.avgLatencyMs = p.latencySamples.reduce((a, b) => a + b, 0) / p.latencySamples.length;

		status.currentProvider = provider;
		status.lastSuccessfulProvider = provider;
	},

	recordError(provider: 'groq' | 'gemini' | 'ollama', isRateLimit: boolean) {
		const p = status.providers[provider];
		if (isRateLimit) {
			p.rateLimitCount++;
		} else {
			p.errorCount++;
		}

		if (p.errorCount >= 3) {
			p.available = false;
		}
	},

	resetProvider(provider: 'groq' | 'gemini' | 'ollama') {
		const p = status.providers[provider];
		p.available = true;
		p.errorCount = 0;
		p.rateLimitCount = 0;
	}
};
