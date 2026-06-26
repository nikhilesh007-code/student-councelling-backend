import type { AIOptions, AIResponse } from './types';
import { RateLimitError } from './types';
import { getAIConfig } from './config';
import crypto from 'crypto';
import { aiHealthManager } from './ai-health-manager';
import { GoogleGenAI } from '@google/genai';
import ollama from 'ollama';

const activeUserRequests = new Map<string, Promise<AIResponse>>();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const FALLBACK_OLLAMA_MODEL = "llama3:latest";

export async function initOllama() {
	try {
		const res = await ollama.list();
		const installedModels = res.models.map(m => m.name);
		
		let selectedModel = null;
		if (installedModels.includes(DEFAULT_OLLAMA_MODEL)) {
			selectedModel = DEFAULT_OLLAMA_MODEL;
		} else if (installedModels.includes(FALLBACK_OLLAMA_MODEL)) {
			selectedModel = FALLBACK_OLLAMA_MODEL;
		}
		
	} catch (e: any) {
		console.error(`[OLLAMA] Failed to connect to Ollama during startup: ${e.message}`);
	}
}

async function executeGroqRequest(prompt: string, options?: AIOptions): Promise<string> {
	const config = getAIConfig();
	if (!config.groqApiKey) throw new Error("GROQ_API_KEY not configured");

	const apiKey = config.groqApiKey;
	const timeoutMs = options?.timeoutMs ?? 20000;
	const model = options?.model ?? config.model;
	const baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

	const messages: Array<{ role: string; content: string }> = [];
	if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
	messages.push({ role: 'user', content: prompt });

	const body: any = {
		model,
		messages,
		max_completion_tokens: 1200,
		temperature: options?.temperature !== undefined ? options.temperature : 0.3
	};

	if (options?.responseFormat === 'json') {
		body.response_format = { type: 'json_object' };
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		console.log(`[GROQ] Request sent`);
		const groqStart = Date.now();
		const response = await fetch(baseUrl, {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			if (response.status === 429) throw new RateLimitError("Groq Rate Limit");
			if ([502, 503].includes(response.status)) {
				const error = new Error(`Groq Server Error ${response.status}`);
				(error as any).isNetworkError = true;
				throw error;
			}
			throw new Error(`Groq Error: ${response.status}`);
		}

		const data: any = await response.json();
		const content = data?.choices?.[0]?.message?.content;
		if (!content) throw new Error("Empty response from Groq");
		console.log(`[GROQ] Response received (${Date.now() - groqStart}ms)`);
		return content.trim();
	} catch (error: any) {
		clearTimeout(timeoutId);
		if (error.name === 'AbortError') throw new Error("Timeout");
		if (error.cause || error.message.includes("fetch")) {
			(error as any).isNetworkError = true;
		}
		throw error;
	}
}

async function executeGeminiRequest(prompt: string, options?: AIOptions): Promise<string> {
	const config = getAIConfig();
	if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

	const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
	const model = "gemini-2.5-flash"; // default fallback model
	
	const controller = new AbortController();
	const timeoutMs = options?.timeoutMs ?? 20000;
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	let finalPrompt = prompt;
	if (options?.systemPrompt) {
		finalPrompt = `SYSTEM INSTRUCTION: ${options.systemPrompt}\n\nUSER PROMPT: ${prompt}`;
	}
	
	try {
		console.log(`[GEMINI] Request sent`);
		const geminiStart = Date.now();
		// GenAI SDK might not fully support AbortController but we try wrapping the promise
		const requestPromise = ai.models.generateContent({
			model,
			contents: finalPrompt,
			config: {
				temperature: options?.temperature !== undefined ? options.temperature : 0.3,
				responseMimeType: options?.responseFormat === 'json' ? "application/json" : "text/plain"
			}
		});

		// Timeout race
		const response = await Promise.race([
			requestPromise,
			new Promise((_, reject) => {
				controller.signal.addEventListener('abort', () => reject(new Error("Timeout")));
			})
		]) as any;

		clearTimeout(timeoutId);
		const content = response.text;
		if (!content) throw new Error("Empty response from Gemini");
		console.log(`[GEMINI] Response received (${Date.now() - geminiStart}ms)`);
		return content.trim();
	} catch (error: any) {
		clearTimeout(timeoutId);
		if (error.message?.includes('429')) throw new RateLimitError("Gemini Rate Limit");
		if (error.message?.includes('503') || error.message?.includes('502')) {
			(error as any).isNetworkError = true;
		}
		throw error;
	}
}

async function executeOllamaRequest(prompt: string, options?: AIOptions): Promise<string> {
	// Re-verify model availability before request
	const res = await ollama.list();
	const installedModels = res.models.map(m => m.name);
	
	let modelToUse: string | null = null;
	if (installedModels.includes(DEFAULT_OLLAMA_MODEL)) {
		modelToUse = DEFAULT_OLLAMA_MODEL;
	} else if (installedModels.includes(FALLBACK_OLLAMA_MODEL)) {
		modelToUse = FALLBACK_OLLAMA_MODEL;
	}
	
	if (!modelToUse) {
		throw new Error(`No configured Ollama models found. Installed models: ${installedModels.length > 0 ? installedModels.join(', ') : 'None'}`);
	}

	console.log(`[OLLAMA] Using model ${modelToUse}`);
	const ollamaStart = Date.now();

	const messages = [];
	if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
	messages.push({ role: 'user', content: prompt });

	const format = options?.responseFormat === 'json' ? 'json' : undefined;

	// NO ABORT CONTROLLER. We wait for Ollama until it finishes.
	try {
		const response = await ollama.chat({
			model: modelToUse,
			messages,
			format: format as any,
			options: {
				temperature: options?.temperature !== undefined ? options.temperature : 0.3
			}
		});

		const content = response.message?.content;
		if (!content) throw new Error("Empty response from Ollama");
		console.log(`[OLLAMA] Response received (${Date.now() - ollamaStart}ms)`);
		return content.trim();
	} catch (error: any) {
		throw error;
	}
}

async function executeWithRetry(
	providerName: 'groq' | 'gemini',
	executeFn: (prompt: string, options?: AIOptions) => Promise<string>,
	prompt: string,
	options?: AIOptions
): Promise<{ content: string; latencyMs: number }> {
	let retries = 0;
	const maxRetries = 3;
	const startTime = Date.now();

	while (retries <= maxRetries) {
		try {
			const attemptStart = Date.now();
			const content = await executeFn(prompt, options);
			const latencyMs = Date.now() - startTime;
			aiHealthManager.recordSuccess(providerName, Date.now() - attemptStart);
			return { content, latencyMs };
		} catch (error: any) {
			const isRateLimit = error instanceof RateLimitError;
			const isNetworkError = error.isNetworkError || false;
			const isTimeout = error.message === "Timeout";

			aiHealthManager.recordError(providerName, isRateLimit);

			const healthStatus = aiHealthManager.getStatus().providers[providerName];
			if (!healthStatus.available) {
				console.warn(`[AI_ORCH] Provider ${providerName} is marked offline due to too many errors.`);
				throw error; // Give up and let fallback happen
			}

			if (isRateLimit || isNetworkError || isTimeout) {
				if (retries < maxRetries) {
					retries++;
					// Attempt 1 -> wait 2s -> Attempt 2 -> wait 4s -> Attempt 3 -> wait 8s
					const backoff = Math.pow(2, retries) * 1000;
					await sleep(backoff);
					continue;
				}
			}
			throw error;
		}
	}
	throw new Error(`Unexpected failure loop in ${providerName}`);
}

async function executeOrchestratedRequest(prompt: string, options?: AIOptions): Promise<AIResponse> {
	const featureName = options?.feature || 'Unknown Feature';
	console.log(`[AI] Starting Generation for ${featureName}`);
	const reqId = crypto.randomUUID().substring(0, 8);
	const startTotal = Date.now();

	// 1. Groq
	if (aiHealthManager.getStatus().providers.groq.available) {
		try {
			const { content, latencyMs } = await executeWithRetry('groq', executeGroqRequest, prompt, options);
			return { provider: 'Groq', fallbackUsed: false, response: content, durationMs: latencyMs, source: 'groq' };
		} catch (e: any) {
			console.warn(`[AI_ORCH] | ID: ${reqId} | Groq failed completely: ${e.message}`);
		}
	}

	// 2. Gemini
	if (aiHealthManager.getStatus().providers.gemini.available) {
		try {
			const { content, latencyMs } = await executeWithRetry('gemini', executeGeminiRequest, prompt, options);
			return { provider: 'Gemini', fallbackUsed: true, response: content, durationMs: latencyMs, source: 'gemini' };
		} catch (e: any) {
			console.warn(`[AI_ORCH] | ID: ${reqId} | Gemini failed completely: ${e.message}`);
		}
	}

	// 3. Ollama (Local)
	const ollamaStart = Date.now();
	try {
		const content = await executeOllamaRequest(prompt, options);
		const latencyMs = Date.now() - ollamaStart;
		aiHealthManager.recordSuccess('ollama', latencyMs);
		return { provider: 'Ollama', fallbackUsed: true, response: content, durationMs: latencyMs, source: 'ollama' };
	} catch (e: any) {
		aiHealthManager.recordError('ollama', false);
		console.error(`[ERROR] Ollama failed: ${e.message}`);
	}

	// 4. Graceful Fallback if all fail
	console.error(`[ERROR] FATAL: ALL AI PROVIDERS FAILED`);
	return {
		provider: 'Fallback',
		fallbackUsed: true,
		durationMs: Date.now() - startTotal,
		response: JSON.stringify({ success: false, message: "AI temporarily unavailable." }),
		source: 'fallback'
	};
}

export async function generate(prompt: string, options?: AIOptions): Promise<AIResponse> {
	const userId = options?.userId;
	const lockKey = userId ? `${userId}-${options?.feature || 'general'}` : null;

	if (lockKey) {
		if (activeUserRequests.has(lockKey)) {
			return activeUserRequests.get(lockKey)!;
		}

		const requestPromise = executeOrchestratedRequest(prompt, options).finally(() => {
			activeUserRequests.delete(lockKey);
		});

		activeUserRequests.set(lockKey, requestPromise);
		return requestPromise;
	}

	return executeOrchestratedRequest(prompt, options);
}

export const aiService = { generate };
