import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { omniSvelte } from 'omni-svelte/vite';
import { playwright } from '@vitest/browser-playwright';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';

export default defineConfig({
	plugins: [
		tailwindcss(),
		omniSvelte({
			preprocess: vitePreprocess(),
			kit: {
				adapter: adapter(),
				alias: {
					$pkg: 'src/package'
				}
			},
			database: {
				enabled: true,
				connection: { url: process.env.DATABASE_URL },
				schema: null
			},
			schema: {
				mode: 'files',
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
					}
				},
				dev: {
					watch: true,
					hotReload: true,
					generateOnStart: true,
					logLevel: 'info'
				}
			},
			auth: {
				enabled: true,
				sync: true,
				executionMode: 'import',
				appName: 'My App',
				baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
				basePath: '/api/auth',
				secret: process.env.BETTER_AUTH_SECRET,
				emailAndPassword: {
					enabled: true,
					requireEmailVerification: false,
					autoSignIn: true,
					minPasswordLength: 8
				},
				session: {
					expiresIn: 60 * 60 * 24 * 7,
					updateAge: 60 * 60 * 24
				},
				migrations: {
					autoMigrate: false,
					strategy: 'push'
				},
				plugins: {
					username: true,
					magicLink: true,
					twoFactor: true
				}
			}
		})
	],
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
