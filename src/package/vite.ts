import { sveltekit } from '@sveltejs/kit/vite';
import type { SvelteConfig, OmniConfig } from '$pkg';
import type { Plugin } from 'vite';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import  { pathToFileURL } from 'url';

export function omni(options = {}): Plugin {
  let config;
  let svelteConfig: SvelteConfig;
  let userHooksServer: string | null = null;
  let userHooksClient: string | null = null;
  
  return {
    name: 'omni-svelte',
    
    async configResolved(resolvedConfig) {
      config = resolvedConfig;
      
      // Read svelte.config.js to get omni configuration
      try {
        const configPath = resolve(config.root, 'svelte.config.js');
        if (existsSync(configPath)) {
          const module = await import(pathToFileURL(configPath) + '?t=' + Date.now());
          svelteConfig = module.default;
        }
      } catch (error) {
        console.warn('Could not read svelte.config.js:', error.message);
      }
      
      // Check if user has existing hooks
      const serverHooksPath = resolve(config.root, 'src/hooks.server.ts');
      const serverHooksJsPath = resolve(config.root, 'src/hooks.server.js');
      const clientHooksPath = resolve(config.root, 'src/hooks.client.ts');
      const clientHooksJsPath = resolve(config.root, 'src/hooks.client.js');
      
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
      if (id === 'virtual:user-hooks/server') {
        return id;
      }
      if (id === 'virtual:user-hooks/client') {
        return id;
      }
      
    },
    
    load(id) {
      if (id.endsWith('hooks.server.ts')) {
        return generateServerHooks(svelteConfig?.omni || options, userHooksServer);
      }
      if (id.endsWith('hooks.server.ts')) {
        return generateClientHooks(svelteConfig?.omni || options, userHooksClient);
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
      
      server.watcher.on('change', (file) => {
        if (file.endsWith('svelte.config.js') || file.includes('hooks.')) {
          // Invalidate virtual modules to trigger regeneration
          const serverModule = server.moduleGraph.getModuleById('virtual:omni-svelte/hooks.server.js');
          const clientModule = server.moduleGraph.getModuleById('virtual:omni-svelte/hooks.client.js');
          
          if (serverModule) {
            server.reloadModule(serverModule);
          }
          if (clientModule) {
            server.reloadModule(clientModule);
          }
        }
      });
    }
  };
}

    //In development use $pkg as import. During build replace with omni-svelte
    const pkg = '$pkg';

  function generateServerHooks(omniConfig: OmniConfig, userHooksServer: string | null) {
    const hooks = [];
    const imports = [];

    // Add framework core import
    imports.push(`import { createFrameworkHandler } from '${pkg}';`);
    
    // Generate feature-specific hooks based on config
    if (omniConfig.auth?.enabled) {
      imports.push(`import { authHook } from '${pkg}/auth';`);
      hooks.push('authHook');
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
    if (omniConfig.auth?.enabled) {
      imports.push(`import { clientAuthHook } from '${pkg}/auth/client';`);
      hooks.push('clientAuthHook');
    }
    
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
    omni(options)
  ];
}