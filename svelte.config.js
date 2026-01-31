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
		},
		auth: {
			// Core Settings
			enabled: true,
			sync: true,
			executionMode: 'import', // 'import' | 'node' | 'bin' | 'package-manager'
			
			// Basic Configuration
			appName: 'My App',
			baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
			basePath: '/api/auth',
			secret: process.env.BETTER_AUTH_SECRET,
			
			// Email & Password Authentication
			emailAndPassword: {
				enabled: true,
				requireEmailVerification: false,
				autoSignIn: true,
				minPasswordLength: 8,
			},
			
			// Session Configuration
			session: {
				expiresIn: 60 * 60 * 24 * 7, // 7 days
				updateAge: 60 * 60 * 24, // Update every 24 hours
			},
			
			// Database Migrations
			migrations: {
				autoMigrate: false,
				strategy: 'push' // 'push' for dev, 'migrate' for production
			},
			
			// Plugins (enable as needed)
			plugins: {
				username: true,
				magicLink: true,
				twoFactor: true,
				passkey: true,
			}
		}
	}
};

export default config;
