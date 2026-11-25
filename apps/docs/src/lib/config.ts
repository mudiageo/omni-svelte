import pkg from '../../../../packages/core/package.json';

const [major, minor] = pkg.version.split('.');

export const siteConfig = {
	name: 'OmniSvelte',
	title: 'OmniSvelte — SvelteKit, but with superpowers',
	description:
		'The batteries-included SvelteKit framework with database ORM, Better-Auth, schema-driven codegen, typed models, and virtual modules.',
	url: 'https://omnisvelte.dev',
	ogImage: '/og.png',
	author: 'OmniSvelte Team',
	twitterHandle: '@omnisvelte',
	keywords: [
		'SvelteKit',
		'Svelte 5',
		'OmniSvelte',
		'TypeScript',
		'ORM',
		'Drizzle',
		'Better Auth',
		'ActiveRecord',
		'Schema Codegen',
		'Full-Stack Framework'
	],
	version: `v${major}.${minor}`,
	releaseDate: 'Now',
	githubUrl: 'https://github.com/mudiageo/omni-svelte',
	discordUrl: 'https://discord.gg/omnisvelte'
};

export const bannerConfig = {
	enabled: true,
	message: 'OmniSvelte v0.2 is here! CLI suite, resource() API, and a cleaner config.',
	link: '/blog/release-0.2',
	linkLabel: 'Read the announcement'
};
