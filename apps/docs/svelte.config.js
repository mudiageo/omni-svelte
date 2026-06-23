import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsx } from 'mdsx';
import { mdsxConfig } from './mdsx.config.js';

/** @type {import('omni-svelte').SvelteConfig} */
const config = {
	preprocess: [mdsx(mdsxConfig), vitePreprocess()],
	kit: {
		adapter: adapter(),
		alias: {
			$content: './content',
			$velite: './.velite'
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;