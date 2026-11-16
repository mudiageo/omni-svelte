import type { PageServerLoad } from './$types.js';
import { User } from '$lib/db/models/auth/user';

export const load: PageServerLoad = async () => {
	try {
		// Load users with inverse relations: notes and profile
		// Using the read-only User model derived from Better Auth
		const users = await User.query()
			.with(['notes', 'profile'])
			.limit(10)
			.get();

		return {
			users,
			status: 'ok'
		};
	} catch (error: any) {
		// In environments without a live database connection (e.g. CI build/test),
		// return fixture state so the route loads cleanly
		return {
			users: [],
			status: 'offline',
			message: error?.message || 'Database not connected'
		};
	}
};
