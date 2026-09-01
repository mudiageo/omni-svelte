# omni-svelte

## 0.3.0-next.1

### Patch Changes

- fix: change default schema parsing strategy from regex to ast to prevent nested object truncation ([#55](https://github.com/mudiageo/omni-svelte/pull/55))

- fix(database): migrate to Drizzle 1.0 connection API to fix silent postgres-js fallback bugs ([#56](https://github.com/mudiageo/omni-svelte/pull/56))

- fix(schema): resolve unknown relation target and double nesting in drizzle generator ([#55](https://github.com/mudiageo/omni-svelte/pull/55))

## 0.3.0-next.0

### Minor Changes

- feat: add omni-svelte/drizzle barrel exports for pg, mysql, and sqlite and update schema generators ([#48](https://github.com/mudiageo/omni-svelte/pull/48))

- breaking: upgrade drizzle-orm and drizzle-kit to 1.0.0-rc.4 ([#46](https://github.com/mudiageo/omni-svelte/pull/46))

- feat(schema): introduce new relations API (field.reference and relation.*) to support Drizzle 1.0 ([#47](https://github.com/mudiageo/omni-svelte/pull/47))

### Patch Changes

- fix(schema): append static hooks initialization to all generated model classes to prevent crashes on Model.create() ([#53](https://github.com/mudiageo/omni-svelte/pull/53))

- fix(schema): update model generator to use schema.relations instead of field.relationship to support eager loading ([#49](https://github.com/mudiageo/omni-svelte/pull/49))

- fix(schema): generate inline index definitions inside pgTable callback ([#46](https://github.com/mudiageo/omni-svelte/pull/46))

- fix: allow AST and Regex parsers to statically parse fluent field.* and relation.* APIs correctly and ignore comments ([#47](https://github.com/mudiageo/omni-svelte/pull/47))

## 0.2.2

### Patch Changes

- fix(remote): correctly detect read-only stack on prototype chain (AggregateError) ([#42](https://github.com/mudiageo/omni-svelte/pull/42))

- fix: resolve runtime import error by using getDatabase() instead of missing database named export in virtual module ([#35](https://github.com/mudiageo/omni-svelte/pull/35))

- fix: automatically pass user hooks (handleError, handleFetch, etc) through using wildcard exports ([#40](https://github.com/mudiageo/omni-svelte/pull/40))

- fix(remote): prevent crash on escaping errors with read-only stacks and preserve rich error fields ([#42](https://github.com/mudiageo/omni-svelte/pull/42))

- fix(remote): remove redundant throw keyword before SvelteKit error calls ([#42](https://github.com/mudiageo/omni-svelte/pull/42))

## 0.2.2-next.4

### Patch Changes

- fix: automatically pass user hooks (handleError, handleFetch, etc) through using wildcard exports ([#40](https://github.com/mudiageo/omni-svelte/pull/40))

## 0.2.2-next.3

### Patch Changes

- fix(remote): remove redundant throw keyword before SvelteKit error calls ([#39](https://github.com/mudiageo/omni-svelte/pull/39))

## 0.2.2-next.2

### Patch Changes

- fix(remote): correctly detect read-only stack on prototype chain (AggregateError) ([`8240ee4`](https://github.com/mudiageo/omni-svelte/commit/8240ee40e34dd73be0a59af530992358da8a91a6))

## 0.2.2-next.1

### Patch Changes

- fix(remote): prevent crash on escaping errors with read-only stacks and preserve rich error fields ([`383303e`](https://github.com/mudiageo/omni-svelte/commit/383303eac15a5f103a61e9fa2cc3db23dea53c7e))

## 0.2.2-next.0

### Patch Changes

- fix: resolve runtime import error by using getDatabase() instead of missing database named export in virtual module ([#35](https://github.com/mudiageo/omni-svelte/pull/35))

## 0.2.1

### Patch Changes

- docs: update references from svelte.config.js to vite.config.ts to reflect SvelteKit 3 / OmniSvelte v0.2 configuration model ([#28](https://github.com/mudiageo/omni-svelte/pull/28))

- fix(vite): throw a clear error when sveltekit() and omniSvelte() are used together in vite.config.ts ([#29](https://github.com/mudiageo/omni-svelte/pull/29))

- fix(cli): explicitly inject omni-svelte version during init to respect --skip-install without triggering package resolution ([#26](https://github.com/mudiageo/omni-svelte/pull/26))

- fix(cli): replace sveltekit plugin with omniSvelte and preserve options during migration and initialization ([#27](https://github.com/mudiageo/omni-svelte/pull/27))

## 0.2.0

### Minor Changes

- breaking: move configuration from svelte.config.js to `omniSvelte()` in vite.config.ts with SvelteKit options under the `kit` namespace ([#21](https://github.com/mudiageo/omni-svelte/pull/21))

- breaking: restructure CLI commands — `omni add` repurposed, `omni migrate` moved to `omni db migrate` ([#12](https://github.com/mudiageo/omni-svelte/pull/12))

  > **Migration guide:** See [CLI reference](/docs/cli) for the updated command structure.

- feat: add `resource()` function to auto-generate remote functions (list, get, create, update, remove) ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- feat: add `formSchema()` helper to derive Zod object schemas from model definitions ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- feat: add `fromURL` helper for syncing URL query parameters with remote list queries. ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- feat: add `getModel` utility to retrieve model classes dynamically by name from the registry ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- feat(cli): add full `omni` CLI command suite ([#11](https://github.com/mudiageo/omni-svelte/pull/11))

- feat: add `omni generate remote` CLI command to scaffold remote function files ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- feat(cli): add `--package-manager` flag to the `add` command ([#12](https://github.com/mudiageo/omni-svelte/pull/12))

- feat(cli): add Vite+ (vp) and Deno package manager support ([#12](https://github.com/mudiageo/omni-svelte/pull/12))

- feat: auto-enable experimental remoteFunctions and async compiler flags ([#22](https://github.com/mudiageo/omni-svelte/pull/22))

- feat: export standalone `omni()` Vite plugin ([#23](https://github.com/mudiageo/omni-svelte/pull/23))

- chore(deps): bump deps to @sveltejs/kit@3.0.0-next.11, svelte@5.56.7, vite@8.1.5, and @sveltejs/vite-plugin-svelte@7.2.0 ([`ccc20a6`](https://github.com/mudiageo/omni-svelte/commit/ccc20a6128e81a6b629bf7c9fc5ef1da5e93ed36))

### Patch Changes

- fix: exclude primary key from Zod create schema ([`0582b4a`](https://github.com/mudiageo/omni-svelte/commit/0582b4a92dc1a26b225dc97b0429d456414ad03e))

- fix: add string-based model resolution for relationships to prevent circular dependency issues between models, and add fallback to `ownerKey` / `localKey` during relation loading. ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- fix: add recursive `toJSON` method to BaseRecord to fix serialization for Date, JSON, and relationship fields. ([#24](https://github.com/mudiageo/omni-svelte/pull/24))

- fix: wrap database export in a lazy proxy to prevent top-level initialization errors in some contexts ([#21](https://github.com/mudiageo/omni-svelte/pull/21))

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
