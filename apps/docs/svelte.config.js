import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsx } from 'mdsx';
import { mdsxConfig } from './mdsx.config.js';

/** @type {import('omni-svelte').SvelteConfig} */
const config = {
	preprocess: [vitePreprocess(), mdsx(mdsxConfig)],
	kit: {
		adapter: adapter(),
		alias: {
			$content: '../../content',
			$velite: './.velite'
		},
		prerender: {
			handleMissingId: (details) => {
				if (details.id === '#') return;
				console.warn(details.message);
			},
			handleHttpError: (details) => {
				// TODO: remove once all referenced pages are added
				console.warn(details.message);
			},
			handleUnseenRoutes: 'ignore'
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
