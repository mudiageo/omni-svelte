---
title: Plugin Lifecycle
description: The order in which OmniSvelte initialises plugins and fires lifecycle hooks.
section: Plugin System
order: 4
---

# Plugin Lifecycle

## Initialisation order

```
pnpm dev / pnpm build
        │
        ▼
svelte.config.js loaded — plugins array resolved
        │
        ▼
Vite plugin starts
        │
        ├── registerTables() called for each plugin → merged into schema
        ├── vitePlugins() injected into the Vite pipeline
        └── registerCommands() collected for the omni CLI
        │
        ▼
Database connection established (if database.enabled)
        │
        ▼
Auth configured (if auth.enabled)
  ├── authProviders() registered with Better-Auth
  └── authPlugins() registered with Better-Auth
        │
        ▼
onSetup(ctx) called for each plugin — in registration order
        │
        ▼
SvelteKit hooks composed via sequence():
  [auth.handler, ...plugins.map(p => p.handle), userHandle]
        │
        ▼
Dev server ready — requests flowing
```

## `onModelEvent` dispatch

```
Model.create(data) called
        │
        ├── creating hook fires (can modify data)
        ├── INSERT executed
        ├── created hook fires
        └── onModelEvent({ type: 'created', modelName, data }) broadcast to all plugins
```

## Cleanup

On dev server shutdown (`Ctrl+C`), `onDestroy(ctx)` is called for each plugin in reverse registration order.

## Plugin ordering matters

Plugins are composed in order. If plugin A's `handle` depends on locals set by plugin B's `handle`, register B before A:

```js
plugins: [
  sessionPlugin(),   // sets event.locals.session
  permissionPlugin() // reads event.locals.session
]
```
