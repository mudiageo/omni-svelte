import type { PageServerLoad } from './$types';
import { Profile, Post } from '#lib/schema';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// Test direct model queries
		const totalProfiles = await Profile.query().count();
		const totalPosts = await Post.query().count();

		// Test using locals.query for registered models
		const recentProfiles = await locals.query
			.model(Profile)
			.where('active', true)
      .with(['user'])
			.orderBy('created_at', 'desc')
			.limit(5)
			.get();

		const publishedPosts = await locals.query
			.model(Post)
			.where('published', true)
			.with(['author']) // author is now a belongsTo -> profileSchema
			.latest()
			.limit(3)
			.get();

		// Test aggregation
		const stats = await Post.query().aggregate({
			total: { fn: 'count' },
			published: { fn: 'count', column: 'published' }
		});

		return {
			stats: {
				totalProfiles,
				totalUsers: totalProfiles,
				totalPosts,
				publishedPosts: stats.published
			},
			recentProfiles: recentProfiles.map((profile) => profile.toJSON()),
			recentUsers: recentProfiles.map((profile) => profile.toJSON()),
			publishedPosts: publishedPosts.map((post) => post.toJSON())
		};
	} catch (error) {
		console.error('Database error:', error);

		return {
			stats: {
				totalProfiles: 0,
				totalUsers: 0,
				totalPosts: 0,
				publishedPosts: 0
			},
			recentProfiles: [],
			recentUsers: [],
			publishedPosts: [],
			error: 'Failed to load data from database'
		};
	}
};