import type { Plugin, ResolvedConfig } from 'vite';
import type { OmniConfig } from '../config/types.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { read, write_if_changed } from '../utils/filesystem.js';
import { loadEnv } from 'vite';

/**
 * Vite plugin for automatic database migrations
 * Runs after schema generation to sync database with generated schemas
 */
export function omniMigrationsPlugin(omniConfig: OmniConfig, root: string): Plugin {
	let hasRun = false;
	let resolvedConfig: ResolvedConfig;

	return {
		name: 'omni:migrations',
		enforce: 'post', // Run after other plugins including SvelteKit

		// Capture resolved config with loaded env vars
		configResolved(config) {
			resolvedConfig = config;

			// Load environment variables from .env files
			const mode = config.mode || 'development';
			const envDir = config.envDir || root;
			const loadedEnv = loadEnv(mode, envDir, '');

			// Merge loaded env into process.env
			Object.assign(process.env, loadedEnv);
		},

		async buildStart() {
			// Only run once
			if (hasRun) return;

			const migrationsConfig = omniConfig?.auth?.migrations;
			const verbose = omniConfig?.schema?.dev?.logLevel !== 'silent';

			// Skip if auto-migrate is disabled
			if (migrationsConfig?.autoMigrate === false) {
				if (verbose) {
					console.log('⏭️  Auto-migration disabled, skipping...');
				}
				return;
			}

			try {
				await runMigrations(root, migrationsConfig?.strategy || 'push', verbose);
				hasRun = true;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);

				if (verbose) {
					console.warn('⚠️  Migration failed:', errorMsg);

					// Provide helpful error messages
					if (
						errorMsg.includes('password authentication failed') ||
						errorMsg.includes('ECONNREFUSED') ||
						errorMsg.includes('ECONNRESET')
					) {
						console.warn('   💡 Database connection error. Check your DATABASE_URL');
						console.warn('   💡 Migrations will run automatically when database is available');
					} else {
						console.warn('   💡 You can run migrations manually with: npx drizzle-kit push');
					}
				}
			}
		}
	};
}

/**
 * Run database migrations using drizzle-kit
 * @param root - Project root directory
 * @param strategy - Migration strategy: 'push' (for dev) or 'migrate' (for prod)
 * @param verbose - Enable verbose logging
 */
async function runMigrations(
	root: string,
	strategy: 'push' | 'migrate',
	verbose: boolean
): Promise<void> {
	// Check for DATABASE_URL
	if (!process.env.DATABASE_URL) {
		if (verbose) {
			console.log('⏭️  No DATABASE_URL configured, skipping migrations');
		}
		return;
	}

	// Check if auth schema exists
	const authSchemaPath = resolve(root, '.omni/auth-schema.ts');
	if (!existsSync(authSchemaPath)) {
		if (verbose) {
			console.log('⏭️  No auth schema found, skipping migrations');
		}
		return;
	}

	if (verbose) {
		console.log('🗄️  Running database migrations...');
		console.log(
			'   📍 Using DATABASE_URL:',
			process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')
		); // Hide password
	}

	try {
		// Dynamically import drizzle-kit and database dependencies
		const drizzleKit = await import('drizzle-kit/api');
		const { drizzle } = await import('drizzle-orm/postgres-js');
		const postgres = (await import('postgres')).default;

		// Import auth schema
		const authSchemaModule = await import(pathToFileURL(authSchemaPath).href);
		const schemaImports: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(authSchemaModule)) {
			if (key !== 'default') {
				schemaImports[key] = value;
			}
		}

		if (verbose) {
			console.log('   📊 Schema tables:', Object.keys(schemaImports).join(', '));
		}

		// Create postgres client and drizzle instance
		// Note: drizzle instance needs schema for pushSchema to work correctly
		const client = postgres(process.env.DATABASE_URL!);

		// Test connection before proceeding
		try {
			await client`SELECT 1`;
		} catch (connError: any) {
			await client.end();
			throw new Error(`Database connection failed: ${connError.message}`);
		}

		const db = drizzle(client, { schema: schemaImports }) as any;

		if (verbose) {
			console.log('   🚀 Pushing schema to database...');
		}

		// Call pushSchema with correct signature: (imports, drizzleInstance)
		const result = await drizzleKit.pushSchema(schemaImports, db);

		await client.end();

		if (result.hasDataLoss) {
			if (verbose) {
				console.warn('   ⚠️  Migration may result in data loss!');
				result.warnings.forEach((w: string) => console.warn('      -', w));
			}
		}

		if (verbose && result.statementsToExecute?.length > 0) {
			console.log('   ✅ Schema synchronized successfully');
			console.log(`   📝 Executed ${result.statementsToExecute.length} statement(s)`);
		} else if (verbose) {
			console.log('   ✅ Schema already up to date');
		}
	} catch (error) {
		// Re-throw to be handled by caller
		throw error;
	}
}

export { runMigrations };
