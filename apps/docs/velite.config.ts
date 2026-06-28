import { defineConfig, defineCollection, s } from 'velite';
// import { rehypeCode } from 'rehype-code';
// import rehypeSlug from 'rehype-slug';
// import rehypeAutolinkHeadings from 'rehype-autolink-headings';

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
			await build({ config: 'velite.config.ts', clean: true });
		},
		handleHotUpdate(ctx: any) {
			if (ctx.file.startsWith(config.root + '/content/')) {
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
		clean: true
	},
	collections: { docs, blog },
	mdx: {
		// rehypePlugins: [
		// 	rehypeSlug,
		// 	[rehypeAutolinkHeadings, { behavior: 'wrap' }],
		// 	[rehypeCode, { themes: { light: 'github-light', dark: 'github-dark' } }]
		// ]
	}
});