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
	message: 'OmniSvelte v0.1 is out! Database, Auth & Schema generation are now stable.',
	link: '/blog/release-0.1',
	linkLabel: 'Read the announcement'
};
