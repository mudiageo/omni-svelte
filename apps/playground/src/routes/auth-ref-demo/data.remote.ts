import { query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { resource } from 'omni-svelte/remote';
import { auth } from '$auth/server';
import { Note } from '#lib/notes.schema';
import { Post, Profile } from '#lib/schema';

/** Session ids the client needs to fill the auth foreign keys (user.id, session.id). */
export const getContext = query(async () => {
	const { request } = getRequestEvent();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) error(401, 'Sign in first: this demo uses your Better Auth session');
	return { userId: session.user.id, sessionId: session.session.id };
});

// NOTE (demo only): ownerId / sessionId / userId are supplied by the client on create.
// A real app would set them server-side from the session.
type Ctx = { user?: { id: string } | null; operation: string; input?: unknown; record?: any };
const signedIn = ({ user }: Ctx) => Boolean(user);

// Profile: integer PK, text FK -> auth.user
export const {
	list: profiles,
	create: createProfile
} = resource(Profile, {
	only: ['list', 'create'],
	mutationMode: 'command',
	authorize: signedIn
});

// Notes: text FKs -> auth.user (thunk) and auth.session (string key)
export const {
	list: notes,
	create: createNote,
	remove: deleteNote
} = resource(Note, {
	only: ['list', 'create', 'remove'],
	mutationMode: 'command',
	pagination: { perPage: 20 },
	authorize: ({ user, operation, record }: Ctx) => {
		if (!user) return false;
		// `record` is pre-fetched by the framework for get/update/remove
		if (operation === 'remove') return record?.ownerId === user.id;
		return true;
	}
});

// Posts: integer FK -> profiles AND text FK -> auth.user on the same row
export const {
	list: posts,
	create: createPost
} = resource(Post, {
	only: ['list', 'create'],
	mutationMode: 'command',
	pagination: { perPage: 20 },
	authorize: signedIn
});