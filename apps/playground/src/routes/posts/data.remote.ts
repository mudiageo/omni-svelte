import { resource } from 'omni-svelte/remote';
import { definePolicy, can } from 'omni-svelte/auth';
import { Post } from '#lib/schema';

// Define our authorization rules for posts
export const postPolicy = definePolicy(Post, {
	create: (user) => !!user,
	
	// We know update receives the form object
	update: async (user, input: any) => {
		const dbPost = await Post.find(input.id);
		return user?.id === dbPost?.userId;
	},
	
	// We know remove receives the raw scalar ID
	remove: async (user, id: any) => {
		const dbPost = await Post.find(id);
		return user?.id === dbPost?.userId;
	}
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
	authorize: async ({ user, operation, input }) => {
		// Public reads
		if (operation === 'list' || operation === 'get') return true;
		
		// Pass the raw input directly to the policy
		return can(user, operation, input as any, postPolicy);
	}
});
