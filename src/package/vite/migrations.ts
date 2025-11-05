import type { Plugin } from 'vite';
import type { OmniConfig } from '../config/types';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { read, write_if_changed } from '../utils/filesystem.js';

/**
 * Vite plugin for automatic database migrations
 * Runs after schema generation to sync database with generated schemas
 */
export function omniMigrationsPlugin(omniConfig: OmniConfig, root: string): Plugin {
  let hasRun = false;
  let configResolved = false;

  return {
    name: 'omni:migrations',
    enforce: 'post', // Run after other plugins including SvelteKit

    // Wait for all plugins to be configured (including SvelteKit aliases)
    configResolved() {
      configResolved = true;
    },

    async buildStart() {
      // Wait for config to be resolved before running migrations
      if (!configResolved || hasRun) return;
      
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
          if (errorMsg.includes('password authentication failed') || 
              errorMsg.includes('ECONNREFUSED') || 
              errorMsg.includes('ECONNRESET')) {
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
  }

  try {
    // Dynamic import drizzle-kit
    const { pushSchema, generateMigration, generateDrizzleJson } = await import('drizzle-kit/api');
    
    // Get database instance
    const { getDatabase } = await import('../database');
    const db = getDatabase();
    
    // Import auth schema
    const authSchemaModule = await import(pathToFileURL(authSchemaPath).href);
    const schemaImports: Record<string, unknown> = {};
    
    // Collect all exported tables from auth schema
    for (const [key, value] of Object.entries(authSchemaModule)) {
      if (key !== 'default') {
        schemaImports[key] = value;
      }
    }
    
    if (strategy === 'push') {
      // Push schema directly to database
      if (verbose) console.log('   🚀 Pushing schema to database...');
      const result = await pushSchema(schemaImports, db);
      
      if (result.warnings.length > 0) {
        console.warn('   ⚠️  Warnings:');
        result.warnings.forEach(w => console.warn(`      - ${w}`));
      }
      
      if (result.hasDataLoss) {
        console.warn('   ⚠️  This migration may result in data loss!');
      }
      
      if (verbose) console.log(`   📝 Executing ${result.statementsToExecute.length} statement(s)...`);
      await result.apply();
      
      if (verbose) console.log('   ✅ Schema pushed successfully');
      
    } else {
      // Generate migration files
      if (verbose) console.log('   📝 Generating migration files...');
      
      // Generate current snapshot
      const currentSnapshot = generateDrizzleJson(schemaImports);
      
      // Try to get previous snapshot (if exists)
      const snapshotPath = resolve(root, '.omni/auth-snapshot.json');
      let prevSnapshot = currentSnapshot;
      
      if (existsSync(snapshotPath)) {
        prevSnapshot = JSON.parse(read(snapshotPath));
      }
      
      // Generate migration SQL
      const statements = await generateMigration(prevSnapshot, currentSnapshot);
      
      if (statements.length > 0) {
        if (verbose) {
          console.log(`   ✅ Generated ${statements.length} migration statement(s)`);
          console.log('   ℹ️  Run migrations with: drizzle-kit migrate');
        }
        
        // Save current snapshot for next migration
        write_if_changed(snapshotPath, JSON.stringify(currentSnapshot, null, 2));
      } else {
        if (verbose) console.log('   ✅ No migration needed');
      }
    }
  } catch (error) {
    // Re-throw to be handled by caller
    throw error;
  }
}

export { runMigrations };
