import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import { auth } from '$auth/server';
import { User } from '#lib/schema';

export const load: PageServerLoad = async ({ request, locals }) => {
	// Require an authenticated session before reading user records
	let session = null;
	try {
		session = (locals as any)?.session ?? (await auth.api.getSession({ headers: request.headers }));
	} catch {
		// Better Auth might not be connected in offline/test environments
	}

	if (!session) {
		error(401, 'Sign in first: this demo uses your Better Auth session');
	}

	try {
		// Load users with inverse relations: notes and profile
		// Using the read-only User model derived from Better Auth
		const users = await (User as any).query().with(['notes', 'profile']).limit(10).get();

		return {
			users,
			status: 'ok'
		};
	} catch (err: any) {
		// In environments without a live database connection (e.g. CI build/test),
		// return fixture state so the route loads cleanly
		return {
			users: [],
			status: 'offline',
			message: err?.message || 'Database not connected'
		};
	}
};
