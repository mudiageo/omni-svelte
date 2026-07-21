---
title: Creating Plugins
description: Step-by-step guide to building an OmniSvelte plugin — from setup to CLI command registration.
section: Plugin System
order: 3
---

# Creating Plugins

Plugins can integrate with and extend **any part** of the framework — database tables, auth providers, SvelteKit hooks, CLI commands, Vite plugins, realtime channels, email templates, and more.

## Minimal plugin

```ts
// plugins/my-plugin.ts
import type { OmniPlugin } from 'omni-svelte/plugins';

export function myPlugin(options: { apiKey: string }): OmniPlugin {
  return {
    name:    'my-plugin',
    version: '1.0.0',

    async onSetup(ctx) {
      ctx.logger.info(`my-plugin: initialized with key=${options.apiKey.slice(0, 4)}...`);
    }
  };
}
```

Register in `svelte.config.js`:

```js
import { myPlugin } from './plugins/my-plugin.js';

const config = {
  omni: {
    plugins: [myPlugin({ apiKey: process.env.MY_API_KEY })]
  }
};
```

## Adding database tables

```ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export function auditPlugin(): OmniPlugin {
  const auditLogs = pgTable('audit_logs', {
    id:         serial('id').primaryKey(),
    action:     text('action').notNull(),
    modelName:  text('model_name').notNull(),
    recordId:   text('record_id').notNull(),
    createdAt:  timestamp('created_at').defaultNow()
  });

  return {
    name: 'audit',

    registerTables: () => ({ auditLogs }),

    onModelEvent: async ({ type, modelName, data }) => {
      if (['created', 'updated', 'deleted'].includes(type)) {
        await db.insert(auditLogs).values({
          action:    type,
          modelName,
          recordId:  String(data.id)
        });
      }
    }
  };
}
```

## Adding CLI commands

```ts
export function myPlugin(): OmniPlugin {
  return {
    name: 'my-plugin',

    registerCommands: () => [
      {
        name:        'init',
        description: 'Initialise my-plugin resources',
        run: async (args, flags) => {
          console.log('Initialising my-plugin...');
          // async setup logic
        }
      },
      {
        name:        'status',
        description: 'Show my-plugin status',
        run: async () => {
          console.log('my-plugin: OK');
        }
      }
    ]
  };
}
```

Users run: `omni my-plugin:init`, `omni my-plugin:status`

## Extending SvelteKit hooks

```ts
export function requestLogPlugin(): OmniPlugin {
  return {
    name: 'request-log',

    handle: async ({ event, resolve }) => {
      const start = Date.now();
      const response = await resolve(event);
      const duration = Date.now() - start;
      console.log(`${event.request.method} ${event.url.pathname} → ${response.status} (${duration}ms)`);
      return response;
    }
  };
}
```

## Adding a Vite plugin

```ts
export function myPlugin(): OmniPlugin {
  return {
    name: 'my-plugin',

    vitePlugins: [
      {
        name: 'my-plugin-vite',
        resolveId(id) {
          if (id === '$my-plugin') return '\0$my-plugin';
        },
        load(id) {
          if (id === '\0$my-plugin') {
            return `export const VERSION = '1.0.0';`;
          }
        }
      }
    ]
  };
}
```

## Publishing

Name your package `omni-svelte-plugin-<name>` for discoverability:

```json
{
  "name": "omni-svelte-plugin-audit",
  "keywords": ["omni-svelte", "omni-svelte-plugin"],
  "peerDependencies": {
    "omni-svelte": ">=0.1.0"
  }
}
```
