import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { velitePlugin } from './velite.config.ts';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsx } from 'mdsx';
import { mdsxConfig } from './mdsx.config.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const veliteDirPath = path.join(__dirname, '.velite');
export const contentDirPath = path.join(__dirname, '../../content');
export const packagesDirPath = path.join(__dirname, '../../packages');
// export const ogDirPath = path.join(__dirname, "src/routes/og");

export default defineConfig({
	plugins: [
		tailwindcss(),
		velitePlugin(),
		sveltekit({
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
			},
			preprocess: [vitePreprocess(), mdsx(mdsxConfig)],
			extensions: ['.svelte', '.md']
		})
	],
	server: {
		fs: {
			allow: [veliteDirPath, contentDirPath, packagesDirPath]
		}
	}
});
