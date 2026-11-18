// vp migrate: merged apps%2Fdocs%2F.oxlintrc.json (6195c651168afb384abe059df1b6c884).
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, lazyPlugins } from 'vite-plus';
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
	lint: {
		plugins: ['unicorn'],
		categories: {
			correctness: 'off'
		},
		env: {
			builtin: true
		},
		ignorePatterns: ['.svelte-kit/**', 'dist/**', 'node_modules/**'],
		rules: {
			'vite-plus/prefer-vite-plus-imports': 'error'
		},
		overrides: [
			{
				files: ['*.svelte', '**/*.svelte'],
				rules: {
					'no-inner-declarations': 'off',
					'no-self-assign': 'off'
				},
				jsPlugins: [],
				globals: {
					$state: 'readonly',
					$derived: 'readonly',
					$effect: 'readonly',
					$props: 'readonly',
					$bindable: 'readonly',
					$inspect: 'readonly',
					$host: 'readonly'
				}
			}
		],
		options: {
			typeAware: false,
			typeCheck: false
		},
		jsPlugins: [
			{
				name: 'vite-plus',
				specifier: 'vite-plus/oxlint-plugin'
			}
		]
	},
	plugins: lazyPlugins(() => [
		tailwindcss(),
		velitePlugin(),
		sveltekit({
			adapter: adapter(),
			alias: {
				'#lib': path.resolve(__dirname, 'src/lib'),
				'#lib/*': path.resolve(__dirname, 'src/lib/*'),
				$content: path.resolve(__dirname, '../../content'),
				$velite: path.resolve(__dirname, './.velite')
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
	]),
	resolve: {
		alias: {
			'#lib': path.resolve(__dirname, 'src/lib'),
			'#lib/*': path.resolve(__dirname, 'src/lib/*')
		}
	},
	server: {
		fs: {
			allow: [veliteDirPath, contentDirPath, packagesDirPath]
		}
	}
});
