---
title: Changelog
description: Version history and release notes for omni-svelte.
section: Reference
order: 6
---

# Changelog

## v0.1.0-alpha _(current)_

**Initial release.**

### Added
- `defineSchema()` and `field.*` builder API for schema-driven code generation
- Drizzle ORM integration — generates `pgTable` definitions from `.schema.ts` files
- Zod validator generation — `createXSchema` and `updateXSchema` per table
- ActiveRecord `Model` class with `find`, `findMany`, `create`, `query()`, `with()`, `.update()`, `.delete()`
- Model relationships: `hasMany`, `belongsTo`, `hasOne`, `belongsToMany`
- Model lifecycle hooks: `creating`, `created`, `updating`, `updated`, `deleting`, `deleted`
- `Factory` and `Faker` utilities for test data generation
- Better-Auth integration — auto-generates server config from `svelte.config.js`
- Virtual module aliases: `$db`, `$auth/server`, `$auth/client`, `$models/*`, `$schema`, `$validation/*`
- `OmniPlugin` interface with full lifecycle hooks
- `omniSvelte()` Vite plugin — zero-config hook injection, code generation, hot reload
- Auto-generated `src/omni-env.d.ts` for virtual module TypeScript support

### Package exports
- `omni-svelte` — `defineSchema`, `field`
- `omni-svelte/vite` — `omniSvelte()`
- `omni-svelte/database` — `createModel`, `Model`, `Factory`, `Faker`
- `omni-svelte/auth` — auth types
- `omni-svelte/plugins` — `OmniPlugin` and all plugin type definitions

---

## Upcoming: v0.2.0

See the [Roadmap](/docs/roadmap) for what's coming in v0.2 — CLI tooling, `createFactory`, relationship codegen, and the developer REPL.
