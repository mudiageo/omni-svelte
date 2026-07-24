import { blog as allPosts } from '$velite/index.js';
import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import { transformPath } from './docs.js';

type PostMetadata = (typeof allPosts)[number];
type PostResolver = () => Promise<{ default: Component; metadata: PostMetadata }>;

function getPostMetadata(slug: string): PostMetadata | undefined {
	return allPosts.find((post) => post.slugAsParams === slug);
}

export async function getPost(
	slug: string
): Promise<{ component: Component; metadata: PostMetadata }> {
	const modules = import.meta.glob('../../../../content/blog/**/*.md');
	let match: { path?: string; resolver?: PostResolver } = {};

	for (const [path, resolver] of Object.entries(modules)) {
		if (transformPath(path) === slug) {
			match = { path, resolver: resolver as unknown as PostResolver };
			break;
		}
	}

	const post = await match?.resolver?.();
	const metadata = getPostMetadata(slug);

	if (!post || !metadata) {
		error(404, 'Could not find the blog post.');
	}

	return {
		component: post.default,
		metadata
	};
}
