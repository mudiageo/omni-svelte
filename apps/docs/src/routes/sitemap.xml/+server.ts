import type { RequestHandler } from './$types.js';
import { docs as allDocs, blog as allPosts } from '$velite/index.js';
import { siteConfig } from '#lib/config.js';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const baseUrl = siteConfig.url;

	const staticPages = [
		{ loc: '', changefreq: 'daily', priority: '1.0' },
		{ loc: '/blog', changefreq: 'daily', priority: '0.8' },
		{ loc: '/showcase', changefreq: 'weekly', priority: '0.7' },
		{ loc: '/roadmap', changefreq: 'weekly', priority: '0.7' }
	];

	const docPages = (allDocs || [])
		.filter((doc) => doc.published !== false)
		.map((doc) => ({
			loc: `/docs/${doc.slugAsParams}`,
			changefreq: 'weekly',
			priority: '0.9'
		}));

	const blogPages = (allPosts || [])
		.filter((post) => post.published !== false)
		.map((post) => ({
			loc: `/blog/${post.slugAsParams}`,
			lastmod: post.date ? new Date(post.date).toISOString().split('T')[0] : undefined,
			changefreq: 'monthly',
			priority: '0.7'
		}));

	const allUrls = [...staticPages, ...docPages, ...blogPages];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
	.map((url) => {
		const lines = [
			'  <url>',
			`    <loc>${baseUrl}${url.loc}</loc>`,
			url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
			`    <changefreq>${url.changefreq}</changefreq>`,
			`    <priority>${url.priority}</priority>`,
			'  </url>'
		].filter(Boolean);
		return lines.join('\n');
	})
	.join('\n')}
</urlset>`.trim();

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
