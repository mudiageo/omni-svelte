---
title: OmniPlugin Interface
description: Complete TypeScript type reference for the OmniPlugin interface.
section: Plugin System
order: 2
---

# OmniPlugin Interface

```ts
import type { OmniPlugin } from 'omni-svelte/plugins';
```

## Full interface

```ts
interface OmniPlugin {
  /** Unique name — used for CLI namespacing: `omni <name>:<command>` */
  name: string;

  /** Semver version string */
  version?: string;

  /** Add Drizzle tables to the database schema */
  registerTables?: () => Record<string, DrizzleTable>;

  /** Register CLI commands: `omni <plugin>:<command>` */
  registerCommands?: () => PluginCommand[];

  /** SvelteKit handle hook — composed via sequence() */
  handle?: Handle;

  /** React to model lifecycle events across all models */
  onModelEvent?: (event: ModelEvent) => Promise<void> | void;

  /** Vite plugins contributed by this plugin */
  vitePlugins?: Plugin[];

  /** Better-Auth providers to register */
  authProviders?: BetterAuthProvider[];

  /** Better-Auth plugins to register */
  authPlugins?: BetterAuthPlugin[];

  /** Called once during framework setup */
  onSetup?: (ctx: PluginContext) => Promise<void> | void;

  /** Called during production build */
  onBuild?: (ctx: PluginContext) => Promise<void> | void;

  /** Called on dev server shutdown */
  onDestroy?: (ctx: PluginContext) => void;
}
```

## `PluginContext`

```ts
interface PluginContext {
  /** Resolved omni config from svelte.config.js */
  config: OmniConfig;

  /** Drizzle database instance (if database.enabled) */
  db: PostgresJsDatabase | null;

  /** Better-Auth instance (if auth.enabled) */
  auth: Auth | null;

  /** Logger scoped to the plugin name */
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
  };
}
```

## `ModelEvent`

```ts
interface ModelEvent {
  /** 'created' | 'updated' | 'deleted' | 'creating' | 'updating' | 'deleting' */
  type:      ModelEventType;
  modelName: string;          // e.g. 'posts'
  data:      Record<string, unknown>;
  previous?: Record<string, unknown>; // previous state (on updated/deleting)
}
```

## `PluginCommand`

```ts
interface PluginCommand {
  name:        string;        // e.g. 'init' → `omni my-plugin:init`
  description: string;
  args?:       CommandArg[];
  flags?:      CommandFlag[];
  run:         (args: Record<string, string>, flags: Record<string, boolean | string>) => Promise<void>;
}
```

## Package exports

| Export | Description |
|---|---|
| `omni-svelte/plugins` | `OmniPlugin` interface and all plugin type definitions |
| `omni-svelte/plugins/logging` | Built-in logging plugin (stub) |
| `omni-svelte/plugins/cors` | Built-in CORS plugin (stub) |
| `omni-svelte/plugins/analytics` | Built-in analytics plugin (stub) |
| `omni-svelte/plugins/error-reporting` | Built-in error reporting plugin (stub) |
