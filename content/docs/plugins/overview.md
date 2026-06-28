---
title: Plugin System Overview
description: The OmniPlugin interface and plugin lifecycle for extending OmniSvelte with custom database tables, auth providers, CLI commands, routes, and more.
section: Plugin System
order: 1
---

# Plugin System

The OmniSvelte plugin API lets you extend the framework in virtually any direction — adding database tables, auth providers, CLI commands, API routes, UI components, realtime channels, email templates, and more.

## The `OmniPlugin` interface

```ts
interface OmniPlugin {
  name:    string;
  version: string;

  // Schema extensions — plugin can contribute additional .schema.ts-style tables
  schema?: Record<string, SchemaDefinition>;

  // SvelteKit hooks to compose via sequence()
  hooks?: {
    handle?:      Handle;
    handleError?: HandleServerError;
  };

  // Vite plugins contributed by this plugin
  vitePlugins?: Plugin[];

  // Lifecycle
  onSetup?:   (ctx: PluginContext) => Promise<void> | void;
  onBuild?:   (ctx: PluginContext) => Promise<void> | void;
  onDestroy?: (ctx: PluginContext) => void;

  // Auth extensions — add providers, plugins to Better-Auth config
  auth?: {
    providers?: BetterAuthProvider[];
    plugins?:   BetterAuthPlugin[];
  };

  // CLI commands contributed by this plugin
  cli?: CLICommand[];
}
```

## Plugin context

```ts
interface PluginContext {
  config:    OmniConfig;     // resolved omni config
  db:        DrizzleDB;      // database instance (if enabled)
  auth:      Auth;           // Better-Auth instance (if enabled)
  logger:    Logger;
}
```

## Registering a plugin

Plugins are registered in `svelte.config.js`:

```js
import { myPlugin } from './plugins/my-plugin.js';

const config = {
  omni: {
    database: { enabled: true, ... },
    plugins: [
      myPlugin({ option: 'value' })
    ]
  }
};
```

## Creating a plugin

```ts
// plugins/my-plugin.ts
import type { OmniPlugin } from 'omni-svelte';

export function myPlugin(options: { option: string }): OmniPlugin {
  return {
    name:    'my-plugin',
    version: '1.0.0',

    async onSetup(ctx) {
      ctx.logger.info(`my-plugin: setup with option=${options.option}`);
    },

    hooks: {
      handle: async ({ event, resolve }) => {
        // Custom server middleware
        event.locals.myThing = 'hello';
        return resolve(event);
      }
    },

    vitePlugins: [
      {
        name: 'my-plugin-vite',
        resolveId(id) {
          if (id === '$my-plugin') return '\0$my-plugin';
        },
        load(id) {
          if (id === '\0$my-plugin') {
            return `export const myOption = ${JSON.stringify(options.option)};`;
          }
        }
      }
    ]
  };
}
```

## Built-in "plugins" (baked in)

The database and auth integrations are not separate plugins — they are first-class framework features configured via the `omni` block in `svelte.config.js`. Community-contributed plugins sit on top of this foundation and can extend tables, hooks, auth providers, and CLI commands.

## Plugin marketplace

A community plugin registry is planned for v0.2. Plugin packages should follow the naming convention `omni-svelte-plugin-<name>` for discoverability.

See [Creating Plugins](/docs/plugins/creating-plugins) for the full step-by-step guide.
