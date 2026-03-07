import { sveltekit } from '@sveltejs/kit/vite';
import type { OmniConfig, SvelteConfig } from '../types.js';
import type { FSWatcher as ViteFSWatcher, Plugin, ResolvedConfig } from 'vite';
import type { FSWatcher } from 'chokidar';
import type { Schema } from '../schema/types.js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { generateSchemaFiles, initializeSchemaConfig, setupSchemaWatcher } from './schema.js';
import { generateDrizzleConfig } from './drizzle-config.js';
import { runtime_directory } from '../utils/index.js';
import { generateAuthConfig } from '../runtime/auth/generator.js';
import { omniMigrationsPlugin } from './migrations.js';

export async function getOmniConfig(): Promise<OmniConfig | undefined> {
	// Read svelte.config.js to get omni configuration
	try {
		const configPath = resolve(process.cwd(), 'svelte.config.js');
		if (existsSync(configPath)) {
			const module = await import(pathToFileURL(configPath) + '?t=' + Date.now());
			let svelteConfig: SvelteConfig = module.default;
			return svelteConfig.omni;
		}
	} catch (error) {
		console.warn('Could not read svelte.config.js:', (error as Error).message);
	}
}
export function omni(options = {}): Plugin {
	let config: ResolvedConfig;
	let omniConfig: OmniConfig;
	let userHooksServer: string | null = null;
	let userHooksClient: string | null = null;
	let schemaWatcher: FSWatcher | null = null;
	const schemasRef = { current: [] as Schema[] }; // Use reference object for schemas

	return {
		name: 'omni-svelte',

		async configResolved(resolvedConfig) {
			config = resolvedConfig;

			omniConfig = ((await getOmniConfig()) ?? {}) as OmniConfig;

			// Initialize schema configuration
			const schemaConfig = await initializeSchemaConfig(omniConfig, config.root);
			if (schemaConfig) {
				omniConfig.schema = schemaConfig;
				// Load initial schemas
				if (schemaConfig.input?.patterns?.length) {
					const { discoverSchemas } = await import('./schema.js');
					schemasRef.current = await discoverSchemas(schemaConfig);

					if (schemaConfig.dev?.logLevel !== 'silent') {
						console.log(
							`📋 Discovered ${schemasRef.current.length} schemas:`,
							schemasRef.current.map((s) => s.name)
						);
					}
				}
			}

			// Check if user has existing hooks
			await loadUserHooks();
		},

		async buildStart() {
			// Generate schema files
			if (omniConfig.schema && omniConfig.schema.dev?.generateOnStart !== false) {
				await generateSchemaFiles(schemasRef.current, omniConfig.schema);
				// Auto-generate / update drizzle.config.ts based on schema output path
				await generateDrizzleConfig(config.root, omniConfig.schema, omniConfig);
			}
		},

		resolveId(id) {
			// Intercept hooks file imports
			if (id === 'src/hooks.server.js' || id === 'src/hooks.server.ts') {
				return 'virtual:omni-svelte/hooks.server.js';
			}
			if (id === 'src/hooks.client.js' || id === 'src/hooks.client.ts') {
				return 'virtual:omni-svelte/hooks.client.js';
			}

			// Handle relative imports from SvelteKit
			if (id.endsWith('/hooks.server.js') || id.endsWith('/hooks.server.ts')) {
				return 'virtual:omni-svelte/hooks.server.js';
			}
			if (id.endsWith('/hooks.client.js') || id.endsWith('/hooks.client.ts')) {
				return 'virtual:omni-svelte/hooks.client.js';
			}

			// Virtual module resolvers for user hooks only
			if (id === 'virtual:user-hooks/server') return id;
			if (id === 'virtual:user-hooks/client') return id;
		},

		load(id) {
			if (id.endsWith('hooks.server.ts') || id.endsWith('hooks.server.js')) {
				return generateServerHooks(omniConfig || options, userHooksServer);
			}
			if (id.endsWith('hooks.client.ts') || id.endsWith('hooks.client.js')) {
				return generateClientHooks(omniConfig || options, userHooksClient);
			}
			if (id === 'virtual:user-hooks/server') {
				return userHooksServer || 'export const handle = null;';
			}
			if (id === 'virtual:user-hooks/client') {
				return userHooksClient || 'export const handleError = null; export const handleFetch = null;';
			}
		},

		configureServer(server) {
			// Watch for config changes and user hooks changes
			server.watcher.add('svelte.config.js');
			server.watcher.add('src/hooks.server.ts');
			server.watcher.add('src/hooks.server.js');
			server.watcher.add('src/hooks.client.ts');
			server.watcher.add('src/hooks.client.js');

			// Set up schema file watching
			if (omniConfig.schema?.dev?.watch !== false) {
				schemaWatcher = setupSchemaWatcher(server, omniConfig.schema, schemasRef);
			}

			server.watcher.on('change', async (file) => {
				if (file.endsWith('svelte.config.js') || file.includes('hooks.')) {
					// Reload user hooks
					await loadUserHooks();

					// Invalidate virtual modules to trigger regeneration
					const serverModule = server.moduleGraph.getModuleById('virtual:omni-svelte/hooks.server.js');
					const clientModule = server.moduleGraph.getModuleById('virtual:omni-svelte/hooks.client.js');

					if (serverModule) server.reloadModule(serverModule);
					if (clientModule) server.reloadModule(clientModule);

					// Re-initialize schema config if svelte.config.js changed
					if (file.endsWith('svelte.config.js')) {
						omniConfig = ((await getOmniConfig()) ?? {}) as OmniConfig;
						const schemaConfig = await initializeSchemaConfig(omniConfig, config.root);
						if (schemaConfig) omniConfig.schema = schemaConfig;

						// Regenerate drizzle.config.ts if schema output paths changed
						if (omniConfig.schema) {
							await generateDrizzleConfig(config.root, omniConfig.schema, omniConfig);
						}

						if (omniConfig.schema?.dev?.watch !== false) {
							schemaWatcher = setupSchemaWatcher(server, omniConfig.schema, schemasRef);
						}
					}
				}
			});
		},

		closeBundle() {
			// Clean up watchers
			if (schemaWatcher) {
				schemaWatcher.close();
				schemaWatcher = null;
			}
		}
	};

	async function loadUserHooks() {
		const serverHooksPath = resolve(config.root, 'src/hooks.server.ts');
		const serverHooksJsPath = resolve(config.root, 'src/hooks.server.js');
		const clientHooksPath = resolve(config.root, 'src/hooks.client.ts');
		const clientHooksJsPath = resolve(config.root, 'src/hooks.client.js');

		userHooksServer = null;
		userHooksClient = null;

		if (existsSync(serverHooksPath)) {
			userHooksServer = readFileSync(serverHooksPath, 'utf-8');
		} else if (existsSync(serverHooksJsPath)) {
			userHooksServer = readFileSync(serverHooksJsPath, 'utf-8');
		}

		if (existsSync(clientHooksPath)) {
			userHooksClient = readFileSync(clientHooksPath, 'utf-8');
		} else if (existsSync(clientHooksJsPath)) {
			userHooksClient = readFileSync(clientHooksJsPath, 'utf-8');
		}
	}
}

const plugin_auth_resolver: Plugin = {
	name: 'vite-plugin-omni-auth-resolver',
	config() {
		return {
			resolve: {
				alias: {
					'$auth/server': `${runtime_directory}/auth/auth.server.js`,
					'$auth/client': `${runtime_directory}/auth/client.svelte.js`,
					$auth: `${runtime_directory}/auth`
				}
			}
		};
	}
};

/**
 * Virtual module plugin for omni-svelte path aliases.
 * Resolves $models, $schema, $validation, $db from user-configured paths.
 *
 * Access boundaries:
 * - $models  → server-only (contains DB queries)
 * - $schema  → server-only (Drizzle table definitions)
 * - $db      → server-only (raw database connection)
 * - $validation → universal (pure Zod schemas, safe for client/server)
 */
const SERVER_ONLY_MODULES = ['$db', '$schema', '$models'];

const VIRTUAL_PREFIX = '\0virtual:omni:';

const plugin_omni_virtual_aliases: Plugin = {
	name: 'vite-plugin-omni-virtual-aliases',

	async config(userConfig) {
		// Register sub-path aliases so direct imports like `$models/posts.model` also work,
		// resolving straight to the configured output directory on disk for IDE navigation.
		const omniConfig = await getOmniConfig();
		const root = userConfig.root || process.cwd();
		const out = omniConfig?.schema?.output;

		const modelsPath = out?.model?.path
			? resolve(root, out.model.path)
			: resolve(root, 'src/lib/db/models');
		const drizzlePath = out?.drizzle?.path
			? resolve(root, out.drizzle.path)
			: resolve(root, 'src/lib/db/server/schema.ts');
		const zodPath = out?.zod?.path
			? resolve(root, out.zod.path)
			: resolve(root, 'src/lib/db/validation');

		return {
			resolve: {
				alias: [
					// Sub-path: $models/posts.model → src/lib/db/models/posts.model.ts (real file, IDE-friendly)
					{ find: /^\$models\/(.+)$/, replacement: `${modelsPath}/$1` },
					// Sub-path: $validation/posts → src/lib/db/validation/posts.ts (real file)
					{ find: /^\$validation\/(.+)$/, replacement: `${zodPath}/$1` }
				]
			}
		};
	},

	async configResolved(resolvedConfig) {
		const omniConfig = await getOmniConfig();
		if (!omniConfig?.schema) return;

		const root = resolvedConfig.root;
		const out = omniConfig.schema.output;

		// Derive paths relative to $lib (which maps to src/lib via SvelteKit tsconfig).
		// We MUST use non-relative specifiers inside `declare module` blocks - TypeScript
		// forbids relative imports in ambient module declarations
		const libDir = resolve(root, 'src/lib');

		const modelsAbsPath = out?.model?.path
			? resolve(root, out.model.path)
			: resolve(root, 'src/lib/db/models');
		const modelsFormat = out?.model?.format ?? 'per-schema';
		const drizzleAbsPath = out?.drizzle?.path
			? resolve(root, out.drizzle.path)
			: resolve(root, 'src/lib/db/server/schema.ts');
		const zodAbsPath = out?.zod?.path
			? resolve(root, out.zod.path)
			: resolve(root, 'src/lib/db/validation');
		const zodFormat = out?.zod?.format ?? 'per-schema';

		// Convert absolute paths → $lib/... specifiers (non-relative, valid in ambient modules)
		const toLibAlias = (absPath: string) =>
			'$lib/' +
			absPath
				.replace(libDir, '')
				.replace(/^[\\/]/, '')
				.replace(/\\/g, '/')
				.replace(/\.ts$/, '');

		const modelsAlias = toLibAlias(modelsAbsPath);
		const drizzleAlias = toLibAlias(drizzleAbsPath);
		const zodAlias = toLibAlias(zodAbsPath);

		const modelsIndex = modelsFormat === 'single-file' ? modelsAlias : `${modelsAlias}/index`;
		const zodIndex = zodFormat === 'single-file' ? zodAlias : `${zodAlias}/index`;

		const content = [
			`// Auto-generated by omni-svelte. Do not edit manually.`,
			`// Re-generated only when omniConfig.schema.output paths change.`,
			`// NOTE: ambient declare modules must use non-relative specifiers (TS rule).`,
			`//       All paths below use the \$lib alias resolved by SvelteKit's tsconfig.`,
			``,
			`// SERVER-ONLY: Models (contain database queries)`,
			`declare module '$models' { export * from '${modelsIndex}'; }`,
			`declare module '$models/*' { const mod: any; export = mod; }`,
			``,
			`// SERVER-ONLY: Drizzle schema table definitions`,
			`declare module '$schema' { export * from '${drizzleAlias}'; }`,
			``,
			`// SERVER-ONLY: Raw database connection`,
			`declare module '$db' {`,
			`  import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';`,
			`  export const db: PostgresJsDatabase;`,
			`}`,
			``,
			`// UNIVERSAL: Zod validation schemas (safe for client and server)`,
			`declare module '$validation' { export * from '${zodIndex}'; }`,
			`declare module '$validation/*' { const mod: any; export = mod; }`
		].join('\n');

		const dtsPath = resolve(root, 'src/omni-env.d.ts');
		const existing = existsSync(dtsPath) ? readFileSync(dtsPath, 'utf-8') : '';
		if (existing.trim() !== content.trim()) {
			const { writeFileSync } = await import('fs');
			writeFileSync(dtsPath, content, 'utf-8');
		}
	},

	resolveId(id) {
		// Barrel imports: $models, $schema, $validation, $db
		if (id === '$models' || id === '$schema' || id === '$validation' || id === '$db') {
			return VIRTUAL_PREFIX + id.slice(1); // e.g. \0virtual:omni:models
		}
		// Sub-path imports: $models/posts → resolve directly to the file on disk
		// This allows: import { Posts } from '$models/posts.model'
		// We do NOT intercept these here - they fall through to Vite's normal alias handling below.
	},

	async load(id) {
		if (!id.startsWith(VIRTUAL_PREFIX)) return;

		const key = id.slice(VIRTUAL_PREFIX.length); // e.g. 'models', 'schema', 'validation', 'db'
		const omniConfig = await getOmniConfig();
		const root = process.cwd();
		const out = omniConfig?.schema?.output;

		if (key === 'db') {
			return `import { database } from 'omni-svelte/database';\nexport { database as db };\nexport default database;`;
		}

		if (key === 'schema') {
			const drizzlePath = out?.drizzle?.path
				? resolve(root, out.drizzle.path)
				: resolve(root, 'src/lib/db/server/schema.ts');
			return `export * from '${drizzlePath.replace(/\\/g, '/')}';`;
		}

		if (key === 'models') {
			const modelsPath = out?.model?.path
				? resolve(root, out.model.path)
				: resolve(root, 'src/lib/db/models');
			const format = out?.model?.format ?? 'per-schema';
			if (format === 'single-file') {
				return `export * from '${modelsPath.replace(/\\/g, '/')}';`;
			}
			// Per-schema: list all model files and barrel them
			if (existsSync(modelsPath)) {
				const { readdirSync } = await import('fs');
				const files = readdirSync(modelsPath).filter(
					(f) => f.endsWith('.model.ts') || f.endsWith('.model.js')
				);
				const exports = files
					.map((f) => `export * from '${(modelsPath + '/' + f).replace(/\\/g, '/')}';`)
					.join('\n');
				return exports || `// No model files found in ${modelsPath}`;
			}
			return `// Models directory not yet generated: ${modelsPath}`;
		}

		if (key === 'validation') {
			const zodPath = out?.zod?.path
				? resolve(root, out.zod.path)
				: resolve(root, 'src/lib/db/validation');
			const format = out?.zod?.format ?? 'per-schema';
			if (format === 'single-file') {
				return `export * from '${zodPath.replace(/\\/g, '/')}';`;
			}
			if (existsSync(zodPath)) {
				const { readdirSync } = await import('fs');
				const files = readdirSync(zodPath).filter(
					(f) =>
						f.endsWith('.validation.ts') ||
						f.endsWith('.validation.js') ||
						f.endsWith('.ts') ||
						f.endsWith('.js')
				);
				const exports = files
					.map((f) => `export * from '${(zodPath + '/' + f).replace(/\\/g, '/')}';`)
					.join('\n');
				return exports || `// No validation files found in ${zodPath}`;
			}
			return `// Validation directory not yet generated: ${zodPath}`;
		}
	},

	// Warn if a server-only virtual module is imported from a client context
	transform(code, id) {
		if (id.includes('+page.ts') || id.includes('+layout.ts')) {
			for (const mod of SERVER_ONLY_MODULES) {
				if (code.includes(`from '${mod}'`) || code.includes(`from "${mod}"`)) {
					this.warn(`[omni-svelte] "${mod}" is server-only but imported in a universal context (${id}). Use "+page.server.ts" or "+layout.server.ts" instead.`);
				}
			}
		}
	}
};

const plugin_auth_codegen: Plugin = {
	name: 'vite-plugin-omni-auth-codegen',
	async configResolved(resolvedConfig) {
		// Generate Better Auth config internally
		const omniConfig = await getOmniConfig();
		if (omniConfig?.auth) await generateAuthConfig(omniConfig.auth);
	},
	configureServer(server) {
		//watch for config changes
		server.watcher.add('svelte.config.js');

		server.watcher.on('change', async (file) => {
			if (file.endsWith('svelte.config.js')) {
				const omniConfig = await getOmniConfig();
				if (omniConfig?.auth) await generateAuthConfig(omniConfig.auth);
			}
		});
	}
};

const plugin_auth_schema_sync: Plugin = {
	name: 'vite-plugin-omni-auth-schema-sync',
	async configResolved(resolvedConfig) {
		const omniConfig = await getOmniConfig();
	}
};

//In development use $pkg as import. During build replace with omni-svelte
const pkg = 'omni-svelte';

function generateServerHooks(omniConfig: OmniConfig, userHooksServer: string | null) {
	const hooks = [];
	const imports = [];

	// Add framework core import
	imports.push(`import { createFrameworkHandler } from '${pkg}';`);

	// Generate feature-specific hooks based on config
	if (omniConfig.auth) {
		imports.push(`import { authHandle } from '${pkg}/auth';`);
		hooks.push('authHandle');
	}

	if (omniConfig.database?.enabled) {
		imports.push(`import { databaseHook, initDb } from '${pkg}';`);
		hooks.push('databaseHook');
	}

	if (omniConfig.logging?.enabled) {
		imports.push(`import { loggingHook } from '${pkg}/logging';`);
		hooks.push('loggingHook');
	}

	if (omniConfig.cors?.enabled) {
		imports.push(`import { corsHook } from '${pkg}/cors';`);
		hooks.push('corsHook');
	}

	// If user has existing hooks, create a virtual module for them
	let userHooksImport = '';
	let userHooksHandler = 'null';

	if (userHooksServer) {
		// Create a virtual module for user hooks
		userHooksImport = `import { handle as userHandle } from 'virtual:user-hooks/server';`;
		userHooksHandler = 'userHandle';
	}

	const handleFunction = `
export async function handle({ event, resolve }) {
const frameworkHandler = createFrameworkHandler({
hooks: [${hooks.join(', ')}],
config: ${JSON.stringify(omniConfig, null, 2)},
userHandle: ${userHooksHandler}
});

return frameworkHandler({ event, resolve });
}`;

	const initFunction = omniConfig.database?.enabled ? `
export async function init() {
await initDb(${JSON.stringify(omniConfig.database, null, 2)})
}` : '';

	return `${imports.join('\n')}\n${userHooksImport}\n\n${handleFunction}\n\n${initFunction}`;
}

function generateClientHooks(omniConfig: OmniConfig, userHooksClient: string | null) {
	const hooks = [];
	const imports = [];

	imports.push(`import { createClientHandler } from '${pkg}/client';`);

	// Generate client-side hooks based on config

	if (omniConfig.analytics?.enabled) {
		imports.push(`import { analyticsHook } from '${pkg}/analytics';`);
		hooks.push('analyticsHook');
	}

	if (omniConfig.errorReporting?.enabled) {
		imports.push(`import { errorReportingHook } from '${pkg}/error-reporting';`);
		hooks.push('errorReportingHook');
	}

	// Handle user client hooks
	let userHooksImport = '';
	let userHooksHandler = 'null';

	if (userHooksClient) {
		userHooksImport = `import * as userHooks from 'virtual:user-hooks/client';`;
		userHooksHandler = 'userHooks';
	}

	const hookFunctions = `
export async function handleError({ error, event }) {
const handler = createClientHandler({
hooks: [${hooks.join(', ')}],
config: ${JSON.stringify(omniConfig, null, 2)},
userHooks: ${userHooksHandler}
});

return handler.handleError({ error, event });
}

export async function handleFetch({ event, request, fetch }) {
const handler = createClientHandler({
hooks: [${hooks.join(', ')}],
config: ${JSON.stringify(omniConfig, null, 2)},
userHooks: ${userHooksHandler}
});

return handler.handleFetch({ event, request, fetch });
}`;

	return `${imports.join('\n')}\n${userHooksImport}\n\n${hookFunctions}`;
}

// Wrapper function that includes SvelteKit plugin
export function omniSvelte(options = {}) {
	return [
		sveltekit(),
		plugin_auth_resolver,
		plugin_omni_virtual_aliases,
		omni(options),
		plugin_auth_codegen,
		// Run migrations after auth config and schema generation
		{
			name: 'omni:migrations-wrapper',
			async configResolved(resolvedConfig: ResolvedConfig) {
				const omniConfig = await getOmniConfig();
				if (omniConfig) {
					const migrationsPlugin = omniMigrationsPlugin(omniConfig, resolvedConfig.root);
					const configResolvedHook = typeof migrationsPlugin.configResolved === 'function'
						? migrationsPlugin.configResolved
						: (migrationsPlugin.configResolved as any)?.handler;
					if (configResolvedHook) await configResolvedHook.call(this, resolvedConfig);

					const buildStartHook = typeof migrationsPlugin.buildStart === 'function'
						? migrationsPlugin.buildStart
						: (migrationsPlugin.buildStart as any)?.handler;
					if (buildStartHook) await buildStartHook.call(this, {});
				}
			}
		}
	];
}
// Export migrations functionality for manual use
export { runMigrations } from './migrations.js';
