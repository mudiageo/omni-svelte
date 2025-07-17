import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$pkg: 'src/package'			
		}
	},
	omni: {
		database: {
			enabled: true,
			connection: { url: process.env.DATABASE_URL },
			schema: null
		}
	}
};

export default config;
