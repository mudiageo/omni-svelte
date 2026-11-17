// vp migrate: merged apps%2Fplayground%2F.oxlintrc.json (52ebc9bd2218a5a07ba9f710d64a3e1a).
import { defineConfig, lazyPlugins } from 'vite-plus';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from 'vite-plus/test/browser-playwright';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';

export default defineConfig({
	lint: {
		plugins: ['unicorn'],
		categories: {
			correctness: 'off'
		},
		env: {
			builtin: true
		},
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
	plugins: lazyPlugins(async () => {
		const { omniSvelte } = await import('omni-svelte/vite');
		return [
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
		];
	}),
	test: {
		// Vitest v4 compatibility: preserve mock call history.
		// Remove after tests no longer rely on calls from setup or earlier tests.
		// https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
		// https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
		clearMocks: false,
		// Vitest v4 compatibility: keep separate Vite servers for inline projects.
		// Remove when plugins and config hooks can run once for shared projects.
		// https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
		// https://vitest.dev/guide/migration/#inline-projects-share-the-vite-server-by-default
		sharedViteServer: false,
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
