---
title: Remote Functions
description: Planned integration with SvelteKit remote functions.
section: Planned
---

# Remote Functions

> **Note:** This feature is planned for a future release and is not yet implemented.

OmniSvelte will heavily leverage SvelteKit's Remote Functions (stabilized in Kit v3.next) to seamlessly bridge the client and server API layer.

## Planned Features

- **Remote Function Wrappers:** Expose custom features, middleware, and config options safely on top of native SvelteKit remote functions.
- **`resource(Model)`:** Auto-generated `query`, `form`, and `command` operations from your data schema.
- **Auto-binding:** Wire your database schema directly to client form validations.
- **`query.live` Integration:** Real-time data feeds and auth state syncing out of the box.
- **Scaffolding:** Easy code generation via `omni generate remote`.
