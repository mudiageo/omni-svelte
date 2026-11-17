// vp migrate: merged packages%2Fcore%2F.oxlintrc.json (33447270b9c5a7473a54c16d1cc10c8c).
import { defineConfig, configDefaults, lazyPlugins } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import { omniSvelte } from './src/vite/index.ts';
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
	plugins: lazyPlugins(() => [
		omniSvelte({
			preprocess: vitePreprocess(),
			kit: {
				adapter: adapter(),
				alias: {
					$pkg: 'src',
					'omni-svelte': 'src'
				},
				experimental: {
					// Disable remoteFunctions for the core package build to bypass a SvelteKit bug
					// where it erroneously tries to parse `jose/dist/.../remote.js` (a dependency of better-auth)
					// as a SvelteKit remote function container.
					remoteFunctions: false
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
				parsing: {
					strategy: 'ast'
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
	]),
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
		exclude: [...configDefaults.exclude, '**/.svelte-kit/**', '**/dist/**'],
		testTimeout: 15000,
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**', '**/.svelte-kit/**', '**/dist/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', '**/.svelte-kit/**', '**/dist/**']
				}
			}
		]
	}
});
