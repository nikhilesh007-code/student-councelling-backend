import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";
import { env } from "../config/env";
import { prisma } from "../database";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: [
		env.BETTER_AUTH_URL?.replace(/\/$/, ""),
		env.FRONTEND_URL?.replace(/\/$/, ""),
		"http://localhost:5173"
	].filter(Boolean) as string[],
	emailAndPassword: {
		enabled: true,
	},

	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			mapProfileToUser: (profile) => ({
				emailVerified: true,
			}),
		},
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
	},
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
		}
	},
	plugins: [openAPI()],
});
