import pkg from '../../../../packages/core/package.json';

const [major, minor] = pkg.version.split('.');

export const siteConfig = {
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
