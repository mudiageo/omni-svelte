import { sveltekit } from '@sveltejs/kit/vite';
import type { OmniConfig, SvelteConfig } from '$pkg';
import type { FSWatcher as ViteFSWatcher, Plugin, ResolvedConfig } from 'vite';
import type { FSWatcher } from 'chokidar';
import type { Schema } from '$pkg/schema/types';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import  { pathToFileURL } from 'url';
import { generateSchemaFiles, initializeSchemaConfig, setupSchemaWatcher } from './schema';
import { runtime_directory } from '../utils';
import { generateAuthConfig } from '../runtime/auth/generator.js';
import { omniMigrationsPlugin } from './migrations.js';

async function getOmniConfig(): Promise<OmniConfig | undefined>  {
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

      omniConfig = await getOmniConfig();

      // Initialize schema configuration
      const schemaConfig = await initializeSchemaConfig(omniConfig, config.root);
      if(schemaConfig) {
        omniConfig.schema = schemaConfig;
        // Load initial schemas
        if (schemaConfig.input?.patterns?.length) {
          const { discoverSchemas } = await import('./schema');
          schemasRef.current = await discoverSchemas(schemaConfig);
          
          if (schemaConfig.dev?.logLevel !== 'silent') {
            console.log(`📋 Discovered ${schemasRef.current.length} schemas:`, schemasRef.current.map(s => s.name));
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

              omniConfig = await getOmniConfig()
              const schemaConfig = await initializeSchemaConfig(omniConfig, config.root);
              if(schemaConfig) omniConfig.schema = schemaConfig

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
                '$auth': `${runtime_directory}/auth`,
              },
            },
          };
        },
}

const plugin_auth_codegen: Plugin = {
  name: 'vite-plugin-omni-auth-codegen',
  async configResolved(resolvedConfig) {
    // Generate Better Auth config internally
    const omniConfig = await getOmniConfig();
    if (omniConfig?.auth) await generateAuthConfig(omniConfig.auth);
  },
  configureServer(server){
    //watch for config changes
    server.watcher.add('svelte.config.js');

    server.watcher.on('change', async (file) => {
      if (file.endsWith('svelte.config.js')) {
        const omniConfig = await getOmniConfig();
        if (omniConfig?.auth)  await generateAuthConfig(omniConfig.auth);
      }
    });
  },
};

const plugin_auth_schema_sync: Plugin = {
  name: 'vite-plugin-omni-auth-schema-sync',
  async configResolved(resolvedConfig) {
    const omniConfig = await getOmniConfig();
    

  }

}
   
//In development use $pkg as import. During build replace with omni-svelte
const pkg = '$pkg';

function generateServerHooks(omniConfig: OmniConfig, userHooksServer: string | null) {
  const hooks = [];
  const imports = [];

  // Add framework core import
  imports.push(`import { createFrameworkHandler } from '${pkg}';`);
  
  // Generate feature-specific hooks based on config
  if (omniConfig.auth) {
    imports.push(`import { authHandle } from '${pkg}/runtime/auth/hook';`);
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
    omni(options),
    plugin_auth_codegen,
    // Run migrations after auth config and schema generation
    {
      name: 'omni:migrations-wrapper',
      async configResolved(resolvedConfig) {
        const omniConfig = await getOmniConfig();
        if (omniConfig) {
          // Apply migrations plugin
          const migrationsPlugin = omniMigrationsPlugin(omniConfig, resolvedConfig.root);
          if (migrationsPlugin.configResolved) {
            await migrationsPlugin.configResolved(resolvedConfig, undefined);
          }
          if (migrationsPlugin.buildStart) {
            await migrationsPlugin.buildStart.call(this, {});
          }
        }
      }
    }
  ];
}
// Export migrations functionality for manual use
export { runMigrations } from './migrations.js';
