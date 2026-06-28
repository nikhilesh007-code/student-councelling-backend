export interface NormalizedOpportunity {
	id: string;
	title: string;
	company: string;
	location: string;
	description: string;
	salaryMin?: number;
	salaryMax?: number;
	contractType?: string;
	category?: string;
	redirectUrl: string;
	source: string;
	postedDate: string;
	skills: string[];
}

export interface IOpportunityProvider {
	name: string;
	searchJobs(profile: any): Promise<NormalizedOpportunity[]>;
}
