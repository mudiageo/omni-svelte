import { defineConfig, defineCollection, s } from 'velite';
import { resolve } from 'node:path'

// Velite plugin for vite
export function velitePlugin() {
	let config: any;
	return {
		name: 'velite',
		configResolved(resolvedConfig: any) {
			config = resolvedConfig;
		},
		async buildStart() {
			const { build } = await import('velite');
			await build();

		},
		handleHotUpdate(ctx: any) {
		  const contentDir = resolve(config.root, '../../content')
			if (ctx.file.startsWith(contentDir)) {
				ctx.server.restart();
			}
		}
	};
}

const computedFields = <T extends { slug: string }>(data: T) => ({
	...data,
	slugAsParams: data.slug.split('/').slice(1).join('/')
});

const docs = defineCollection({
	name: 'Doc',
	pattern: 'docs/**/*.md',
	schema: s
		.object({
			title: s.string().max(99),
			description: s.string().max(999).optional(),
			published: s.boolean().default(true),
			featured: s.boolean().default(false),
			toc: s.boolean().default(true),
			section: s.string().optional(),
			order: s.number().default(999),
			slug: s.path(),
			component: s.boolean().default(false)
		})
		.transform(computedFields)
});

const blog = defineCollection({
	name: 'Post',
	pattern: 'blog/**/*.md',
	schema: s
		.object({
			title: s.string().max(99),
			description: s.string().max(999),
			date: s.isodate(),
			published: s.boolean().default(true),
			featured: s.boolean().default(false),
			author: s.string(),
			tags: s.array(s.string()).default([]),
			slug: s.path(),
			component: s.boolean().default(false)
		})
		.transform(computedFields)
});

export default defineConfig({
	root: '../../content',
	output: {
		data: '.velite',
		assets: 'static/assets',
		base: '/assets/',
		name: '[name]-[hash:8].[ext]',
	},
	collections: { docs, blog },
});