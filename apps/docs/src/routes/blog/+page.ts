import type { PageLoad } from './$types.js';
import { blog } from '$velite/index.js';

export const load: PageLoad = async () => {
	// Filter unpublished and sort by date descending
	const sortedBlog = [...blog]
		.filter((post) => post.published)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	
	return {
		posts: sortedBlog
	};
};

export const prerender = true;
