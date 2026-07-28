import { z } from 'omni-svelte/validation';
import { form, query } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { Post, User } from '#lib/schema';

export const getUsers = query(async () => {
	const users = await User.query().where('active', true).orderBy('name', 'asc').get();
	return users.map((user) => ({
		id: user.getAttribute('id') as number,
		name: user.getAttribute('name') as string
	}));
});

export const createPost = form(
z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  content: z.string().min(10, "Content must be at least 10 characters long"),
  user_id: z.string().transform((val) => parseInt(val, 10)),
  published: z.boolean().default(false).optional()
}),
	async (data) => {
		// Verify user exists
		const user = await User.find(data.user_id);
		if (!user) {
			error(400, 'Selected user not found');
		}

		// Create post
		const post = await Post.create({
			title: data.title,
			content: data.content,
			user_id: data.user_id,
			published: data.published
		});
console.log(post)
		redirect(303, `/posts/${post.id}`);
	}
);
