import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types.js';
import { getPost } from '$lib/blog.js';
import { blog } from '$velite/index.js';

export const load: PageLoad = async ({ params }) => {
	const slug = params.slug;

	try {
		const postData = await getPost(slug);

		if (!postData.metadata.published) {
			error(404, `Blog post not found: ${slug}`);
		}

		return { 
			post: postData.metadata, 
			component: postData.component 
		};
	} catch (e) {
		console.error(e);
		error(404, 'Blog post not found');
	}
};

export const prerender = true;

export const entries: EntryGenerator = async () => {
	return blog.filter((p) => p.published).map((post) => ({ slug: post.slugAsParams }));
};
