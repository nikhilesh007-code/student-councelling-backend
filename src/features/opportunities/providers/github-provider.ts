import { IOpportunityProvider, NormalizedOpportunity } from "./provider";

export class GithubProvider implements IOpportunityProvider {
	name = "GitHub";

	async searchJobs(profile: any): Promise<NormalizedOpportunity[]> {
		// Stub for future implementation
		return [];
	}
}
