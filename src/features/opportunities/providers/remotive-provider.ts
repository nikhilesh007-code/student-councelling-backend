import { IOpportunityProvider, NormalizedOpportunity } from "./provider";

export class RemotiveProvider implements IOpportunityProvider {
	name = "Remotive";

	async searchJobs(profile: any): Promise<NormalizedOpportunity[]> {
		// Stub for future implementation
		return [];
	}
}
