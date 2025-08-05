import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('./src/package').SvelteConfig} */
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
		},
		schema: {
			mode: 'files', // Generate files only
			input: {
				patterns: ['src/**/*.schema.ts', 'src/lib/schema.ts'],
				exclude: ['**/node_modules/**', '**/*.test.ts']
			},
			output: {
				directory: './src/lib/generated',
				drizzle: { 
					path: './src/lib/db/server/schema.ts', 
					format: 'single-file' 
				},
				zod: { 
					path: './src/lib/db/validation', 
					format: 'per-schema' 
				},
				model: { 
					path: './src/lib/db/models', 
					format: 'per-schema',
					includeTypes: true,
					includeCrud: true
				},
			},
			dev: {
				watch: true,
				hotReload: true,
				generateOnStart: true,
				logLevel: 'info'
			}		
		}
	}
};

export default config;
