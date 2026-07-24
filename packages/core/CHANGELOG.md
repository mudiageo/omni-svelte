# omni-svelte

## 0.1.1

### Patch Changes

- 934ab6c: fix: export Factory and Faker from database entrypoint
- 03d70b0: fix: remove unpublished `@omni-svelte/shared` dependency from core package to prevent installation errors

## 0.1.0

### Minor Changes

- 7413d4c: feat(db): `drizzle.config.ts` is now auto-generated from your schema config

  omni-svelte will automatically create and keep `drizzle.config.ts` in sync with your schema output configuration. You no longer need to manually maintain the schema path in two places.

- fe0330f: feat: Initial release of the omni-svelte framework! 🎉

  **Batteries Included Framework for SvelteKit**

  Transform any SvelteKit app into a production-ready powerhouse with enterprise-grade features out of the box.

  ### Features Included in v0.1.0:

  🗄️ **Database & ORM (powered by Drizzle)** (4615134, #6)
  - ActiveRecord-style `Model` class and `createModel` helper
  - Model relationships: `hasMany`, `belongsTo`, `hasOne`, `belongsToMany`
  - Lifecycle hooks: `creating`, `created`, `updating`, `updated`, `deleted`
  - Integrated test data generation via `Factory` & `Faker` classes

  🔐 **Authentication (powered by Better-Auth)** (#7)
  - First-class support for email/password, magic links, 2FA, passkeys, and OAuth
  - Auto-generated BetterAuth server config from `svelte.config.js`

  📋 **Central Schema & Code Generation** (#4)
  - Define your entire data model in a single schema file (`defineSchema`)
  - Auto-generates Drizzle tables, Zod validators, and typed model files
  - Zero-config Vite plugin for on-the-fly code generation

  📦 **Virtual Modules & Path Aliases** (779be17)
  - `$auth/server` & `$auth/client` for instant Better-Auth instances
  - `$db` for raw Drizzle database access
  - `$models/*` auto-generated typed model classes
  - `$schema` all generated Drizzle table definitions
  - `$validation/*` auto-generated Zod schemas

  🔌 **Extensible Plugin System** (71e4388)
  - Full `OmniPlugin` architecture to extend the framework
  - First-party packages included: `@omni-svelte/shared`, `@omni-svelte/plugins`

  🛠️ **Core Infrastructure Stubs** (71e4388)
  - Initial framework foundations laid out for: Mail, Job Queues, Caching, Event Bus, File Storage, Notifications, and CLI scaffolds.

- e110854: feat(schema): `field.*` fluent field-definition builder

  You can now define your schema fields using a chainable builder API instead of raw object literals.

### Patch Changes

- a5cdc7c: ## Fix: DrizzleGenerator now correctly serialises object and JSON defaults

  Previously, setting `default: {}` (or any object) on a JSON/array field caused the generated Drizzle schema to emit invalid code like `.default([object Object])` or `.default(''{')`.

  **Root cause**: `generateColumnDefinition` used plain template interpolation (`${field.default}`) for non-string values, which coerced objects to `[object Object]`.

  **Fixed behaviour**:

  | Default value        | Before (broken)             | After (correct)        |
  | -------------------- | --------------------------- | ---------------------- |
  | `{}` (object)        | `.default([object Object])` | `.default('{}')`       |
  | `"{}"` (JSON string) | `.default('{}')` ✓          | `.default('{}')` ✓     |
  | `[]` (array)         | `.default()`                | `.default('[]')`       |
  | `null`               | `.default(null)` ✓          | `.default(null)` ✓     |
  | `true` / `42`        | `.default(true)` ✓          | `.default(true)` ✓     |
  | `'active'` (string)  | `.default('active')` ✓      | `.default('active')` ✓ |

- Updated dependencies [057020f]
  - @omni-svelte/shared@0.1.0
