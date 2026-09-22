import { resource } from 'omni-svelte/remote';
import { definePolicy, can } from 'omni-svelte/auth';
import { Post } from '#lib/schema';

// Define our authorization rules for posts
export const postPolicy = definePolicy(Post, {
	create: (user) => !!user,
	update: (user, post) => user?.id === post?.userId,
	remove: (user, post) => user?.id === post?.userId,
});

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
	authorize: async ({ user, operation, record }) => {
		// Public reads
		if (operation === 'list' || operation === 'get') return true;
		
		// The record is perfectly pre-fetched by resource.ts and passed right here!
		return can(user, operation, record, postPolicy);
	}
});
