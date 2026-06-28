import axios from 'axios';
import { SkillNormalizer } from "../../../utils/normalizers";

export interface LearningResource {
	title: string;
	provider: string; // "YouTube", "Official Documentation", "roadmap.sh", "freeCodeCamp", "MDN", etc.
	type: "Video" | "Official Docs" | "Roadmap" | "Course" | "Practice" | string;
	topic: string;
	url: string;
	thumbnail?: string;
	duration?: string;
	description: string;
    difficulty?: string;
}

// In-memory cache for YouTube API results
// Maps normalized topic -> { data: LearningResource[], timestamp: number }
const youtubeCache = new Map<string, { data: LearningResource[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class LearningResourceService {
	/**
	 * Normalizes specific topics into broader categories to save API calls
	 * and provide better general resources.
	 */
	static normalizeTopic(topic: string): string {
		// First pass it through the global skill normalizer to ensure standard aliases (e.g., NodeJS -> Node.js)
		const standardSkill = SkillNormalizer.normalize(topic);
		
		const lower = standardSkill.toLowerCase();
		if (lower.includes('react') || lower.includes('redux') || lower.includes('context api')) return 'React';
		if (lower.includes('node') || lower.includes('express') || lower.includes('nestjs')) return 'Node.js';
		if (lower.includes('mongo') || lower.includes('mongoose')) return 'MongoDB';
		if (lower.includes('typescript') || lower.includes('ts')) return 'TypeScript';
		if (lower.includes('javascript') || lower.includes('js') || lower.includes('es6')) return 'JavaScript';
		if (lower.includes('python') || lower.includes('django') || lower.includes('flask') || lower.includes('fastapi')) return 'Python';
		if (lower.includes('java ') || lower.includes('spring') || lower.includes('hibernate')) return 'Java';
		if (lower.includes('sql') || lower.includes('postgres') || lower.includes('mysql')) return 'SQL';
		if (lower.includes('docker') || lower.includes('kubernetes') || lower.includes('container')) return 'Docker';
		if (lower.includes('aws') || lower.includes('cloud')) return 'AWS';
		if (lower.includes('system design') || lower.includes('architecture')) return 'System Design';
		if (lower.includes('html') || lower.includes('css') || lower.includes('tailwind')) return 'Frontend Fundamentals';
        if (lower.includes('git') || lower.includes('github') || lower.includes('version control')) return 'Git';
        if (lower.includes('c++') || lower.includes('cpp')) return 'C++';
        if (lower.includes('c#') || lower.includes('.net')) return 'C#';

        return standardSkill;
	}

	/**
	 * Fetches deterministic static resources based on the normalized topic.
	 */
	static getStaticResources(normalizedTopic: string): LearningResource[] {
		const resources: LearningResource[] = [];
		const lower = normalizedTopic.toLowerCase();

		// Universal mappings
		resources.push({
			title: `${normalizedTopic} Interactive Course`,
			provider: 'freeCodeCamp',
			type: 'Course',
			topic: normalizedTopic,
			url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(normalizedTopic)}`,
			description: `Free tutorials, courses, and practice for ${normalizedTopic}.`,
            difficulty: 'Beginner'
		});

		// Specific Official Docs
		const docsMap: Record<string, string> = {
			'react': 'https://react.dev/learn',
			'node.js': 'https://nodejs.org/en/docs/',
			'typescript': 'https://www.typescriptlang.org/docs/',
			'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
            'frontend fundamentals': 'https://developer.mozilla.org/en-US/',
			'python': 'https://docs.python.org/3/',
			'java': 'https://docs.oracle.com/en/java/',
			'mongodb': 'https://www.mongodb.com/docs/',
			'sql': 'https://www.w3schools.com/sql/',
			'docker': 'https://docs.docker.com/',
			'aws': 'https://docs.aws.amazon.com/',
            'git': 'https://git-scm.com/doc',
		};

		if (docsMap[lower]) {
			resources.push({
				title: `${normalizedTopic} Official Documentation`,
				provider: lower === 'javascript' || lower === 'frontend fundamentals' ? 'MDN Web Docs' : 'Official Docs',
				type: 'Official Docs',
				topic: normalizedTopic,
				url: docsMap[lower],
				description: `The official, authoritative documentation for ${normalizedTopic}.`,
                difficulty: 'Intermediate'
			});
		}

		return resources;
	}

	/**
	 * Fetches video tutorials from YouTube API with caching.
	 */
	static async getYouTubeVideos(normalizedTopic: string): Promise<LearningResource[]> {
		const apiKey = process.env.YOUTUBE_API_KEY;
		if (!apiKey) {
			console.warn('[LearningResourceService] YOUTUBE_API_KEY is not set. Skipping YouTube search.');
			return [];
		}

		// Check cache
		const cached = youtubeCache.get(normalizedTopic);
		if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
			console.log(`[LearningResourceService] Cache hit for YouTube: ${normalizedTopic}`);
			return cached.data;
		}

		try {
			console.log(`[LearningResourceService] Fetching from YouTube API: ${normalizedTopic}`);
			const query = `${normalizedTopic} full course tutorial`;
			
			// 1. Search for videos
			const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
				params: {
					part: 'snippet',
					q: query,
					type: 'video',
					maxResults: 3,
					order: 'relevance',
					key: apiKey
				}
			});

			const videos = searchResponse.data.items || [];
			if (videos.length === 0) return [];

			// 2. Fetch video details for duration (optional but good for UX)
			const videoIds = videos.map((v: any) => v.id.videoId).join(',');
			const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
				params: {
					part: 'contentDetails',
					id: videoIds,
					key: apiKey
				}
			});

			const detailsMap = new Map();
			(detailsResponse.data.items || []).forEach((item: any) => {
				detailsMap.set(item.id, item.contentDetails?.duration);
			});

			const results: LearningResource[] = videos.map((video: any) => {
				// Parse ISO 8601 duration (e.g., PT1H30M)
				let durationStr = 'Video';
				const rawDuration = detailsMap.get(video.id.videoId);
				if (rawDuration) {
					const match = rawDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
					if (match) {
						const h = parseInt(match[1] || '0');
						const m = parseInt(match[2] || '0');
						if (h > 0) durationStr = `${h}h ${m}m`;
						else durationStr = `${m}m`;
					}
				}

				return {
					title: video.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
					provider: video.snippet.channelTitle,
					type: 'Video',
					topic: normalizedTopic,
					url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
					thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
					duration: durationStr,
					description: video.snippet.description || `Video tutorial by ${video.snippet.channelTitle}`,
                    difficulty: 'Beginner to Intermediate'
				};
			});

			// Save to cache
			youtubeCache.set(normalizedTopic, { data: results, timestamp: Date.now() });

			return results;
		} catch (error: any) {
			console.error(`[LearningResourceService] YouTube API Error for ${normalizedTopic}:`, error.message);
			return []; // Graceful fallback
		}
	}

	/**
	 * Main entry point: aggregates resources for a list of raw topics.
	 */
	static async getAggregatedResources(rawTopics: string[]): Promise<LearningResource[]> {
		// 1. Normalize topics and remove duplicates
		const normalizedTopics = Array.from(new Set(rawTopics.map(t => this.normalizeTopic(t))));
		
		const allResources: LearningResource[] = [];
		const seenUrls = new Set<string>();

		// 2. Fetch resources for each normalized topic
		for (const topic of normalizedTopics) {
			// Get static resources
			const staticRes = this.getStaticResources(topic);
			
			// Get YouTube videos
			const ytRes = await this.getYouTubeVideos(topic);

			const combined = [...staticRes, ...ytRes];

			// Deduplicate by URL
			for (const res of combined) {
				if (!seenUrls.has(res.url)) {
					seenUrls.add(res.url);
					allResources.push(res);
				}
			}
		}

		return allResources;
	}
}
