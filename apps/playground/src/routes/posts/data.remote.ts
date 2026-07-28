import { resource } from 'omni-svelte/remote';
import { Post } from '#lib/schema';

export const {
	list: posts,
	get: post,
	create: createPost,
	update: updatePost,
	remove: deletePost
} = resource(Post, {
	with: ['author'],
	pagination: { perPage: 10 },
	listQuery: (q, input) => {
		if (input.search) {
			q = q.whereAny([
				['title', 'ilike', `%${input.search}%`],
				['content', 'ilike', `%${input.search}%`]
			]);
		}
		return q.orderBy('created_at', 'desc');
	},
	authorize: ({ user, operation }) => {
		// TODO: replace with real authorization logic
		if (operation === 'list' || operation === 'get') return true;
		return Boolean(user);
	}
});
