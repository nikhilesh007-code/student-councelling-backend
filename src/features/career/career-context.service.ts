import { getOrInitializeProfile } from "../users/services/profile-service";
import { careerResolver } from "./career-resolver.service";
import { SkillNormalizer, CareerNormalizer } from "../../utils/normalizers";

export interface CareerContextData {
	targetCareer: string;
	normalizedSkills: string[];
	interests: string[];
	preferredDomains: string[];
	experienceLevel: string | null;
	rawProfile: any;
}

export class CareerContextService {
	/**
	 * Builds a shared context ensuring all skills and careers are normalized.
	 * Acts as the single source of truth for all modules.
	 */
	async buildContext(userId: string, explicitTargetCareer?: string): Promise<CareerContextData> {
		const profile = await getOrInitializeProfile(userId);

		// 1. Resolve Target Career
		let targetCareer = explicitTargetCareer;
		if (!targetCareer) {
			const resolved = await careerResolver.resolveTargetCareer(userId);
			targetCareer = resolved.career;
		}

		// Normalize Career
		targetCareer = CareerNormalizer.normalize(targetCareer);

		// 2. Normalize Skills
		const normalizedSkills = SkillNormalizer.normalizeArray(profile.skills || []);

		// 3. Extract other context
		let interests: string[] = [];
		if (typeof profile.interests === "string") {
			interests = (profile.interests as string).split(",").map((i) => i.trim());
		} else if (Array.isArray(profile.interests)) {
			interests = profile.interests;
		}

		const preferredDomains = profile.preferredDomains || [];
		const experienceLevel = profile.experienceLevel || null;

		return {
			targetCareer,
			normalizedSkills,
			interests,
			preferredDomains,
			experienceLevel,
			rawProfile: profile,
		};
	}
}

export const careerContextService = new CareerContextService();
