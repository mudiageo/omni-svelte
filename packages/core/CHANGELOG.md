# omni-svelte

## 0.2.0

### Minor Changes

- [#12](https://github.com/mudiageo/omni-svelte/pull/12) [`f639e42`](https://github.com/mudiageo/omni-svelte/commit/f639e42f32212495186d04465eda7f3491eb9827) Thanks [@mudiageo](https://github.com/mudiageo)! - feat(cli): add `--package-manager` flag to the `add` command

- [#12](https://github.com/mudiageo/omni-svelte/pull/12) [`f639e42`](https://github.com/mudiageo/omni-svelte/commit/f639e42f32212495186d04465eda7f3491eb9827) Thanks [@mudiageo](https://github.com/mudiageo)! - feat(cli): add Vite+ (vp) and Deno package manager support

- [#22](https://github.com/mudiageo/omni-svelte/pull/22) [`f496370`](https://github.com/mudiageo/omni-svelte/commit/f49637044d103325c1fcfba3370381d9a346f759) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: auto-enable experimental remoteFunctions and async compiler flags

- [#21](https://github.com/mudiageo/omni-svelte/pull/21) [`d28ecc6`](https://github.com/mudiageo/omni-svelte/commit/d28ecc6d38f66d8201de83d8dd29e6bb61b9dde2) Thanks [@mudiageo](https://github.com/mudiageo)! - breaking: move configuration from svelte.config.js to `omniSvelte()` in vite.config.ts with SvelteKit options under the `kit` namespace

- [`ccc20a6`](https://github.com/mudiageo/omni-svelte/commit/ccc20a6128e81a6b629bf7c9fc5ef1da5e93ed36) Thanks [@mudiageo](https://github.com/mudiageo)! - chore(deps): bump deps to @sveltejs/kit@3.0.0-next.11, svelte@5.56.7, vite@8.1.5, and @sveltejs/vite-plugin-svelte@7.2.0

- [#12](https://github.com/mudiageo/omni-svelte/pull/12) [`c05d4bd`](https://github.com/mudiageo/omni-svelte/commit/c05d4bdd47337619f06a35e6e877d923116c309b) Thanks [@mudiageo](https://github.com/mudiageo)! - breaking: restructure CLI commands — `omni add` repurposed, `omni migrate` moved to `omni db migrate`

  > **Migration guide:** See [CLI reference](/docs/cli) for the updated command structure.

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`24c3319`](https://github.com/mudiageo/omni-svelte/commit/24c33199536214f6d81b7ac1805457fab14fdb44) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: add `omni generate remote` CLI command to scaffold remote function files

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`24c3319`](https://github.com/mudiageo/omni-svelte/commit/24c33199536214f6d81b7ac1805457fab14fdb44) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: add `formSchema()` helper to derive Zod object schemas from model definitions

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`24c3319`](https://github.com/mudiageo/omni-svelte/commit/24c33199536214f6d81b7ac1805457fab14fdb44) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: add `fromURL` helper for syncing URL query parameters with remote list queries.

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`c682219`](https://github.com/mudiageo/omni-svelte/commit/c682219589ead3bbd760359d0be55da1fe826874) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: add `getModel` utility to retrieve model classes dynamically by name from the registry

- [#23](https://github.com/mudiageo/omni-svelte/pull/23) [`cee1313`](https://github.com/mudiageo/omni-svelte/commit/cee131367cc7a720056815d6e5b067c449131e0f) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: export standalone `omni()` Vite plugin

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`24c3319`](https://github.com/mudiageo/omni-svelte/commit/24c33199536214f6d81b7ac1805457fab14fdb44) Thanks [@mudiageo](https://github.com/mudiageo)! - feat: add `resource()` function to auto-generate remote functions (list, get, create, update, remove)

- [#11](https://github.com/mudiageo/omni-svelte/pull/11) [`8961056`](https://github.com/mudiageo/omni-svelte/commit/896105623a61a8a958f55d74ec0dba535d93dd2b) Thanks [@mudiageo](https://github.com/mudiageo)! - feat(cli): add full `omni` CLI command suite

### Patch Changes

- [#21](https://github.com/mudiageo/omni-svelte/pull/21) [`d28ecc6`](https://github.com/mudiageo/omni-svelte/commit/d28ecc6d38f66d8201de83d8dd29e6bb61b9dde2) Thanks [@mudiageo](https://github.com/mudiageo)! - fix: wrap database export in a lazy proxy to prevent top-level initialization errors in some contexts

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`24c3319`](https://github.com/mudiageo/omni-svelte/commit/24c33199536214f6d81b7ac1805457fab14fdb44) Thanks [@mudiageo](https://github.com/mudiageo)! - fix: add recursive `toJSON` method to BaseRecord to fix serialization for Date, JSON, and relationship fields.

- [#24](https://github.com/mudiageo/omni-svelte/pull/24) [`c682219`](https://github.com/mudiageo/omni-svelte/commit/c682219589ead3bbd760359d0be55da1fe826874) Thanks [@mudiageo](https://github.com/mudiageo)! - fix: add string-based model resolution for relationships to prevent circular dependency issues between models, and add fallback to `ownerKey` / `localKey` during relation loading.

- [`0582b4a`](https://github.com/mudiageo/omni-svelte/commit/0582b4a92dc1a26b225dc97b0429d456414ad03e) Thanks [@mudiageo](https://github.com/mudiageo)! - fix: exclude primary key from Zod create schema

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
