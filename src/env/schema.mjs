// @ts-check
import {z} from 'zod';

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
	DB_URL: z.string().url(),
	NODE_ENV: z.enum(['development', 'test', 'production']),
	LICHESS_CLIENT_ID: z.string(),
	//CHESSCOM_CLIENT_ID: z.string(),
	SECRET_COOKIE_PASSWORD: z.string(),
	//STRIPE_SECRET_KEY: z.string(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
	//NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 * @type {{ [k in keyof z.infer<typeof clientSchema>]: z.infer<typeof clientSchema>[k] | undefined }}
 */
export const clientEnv = {
	//NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
	//	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};