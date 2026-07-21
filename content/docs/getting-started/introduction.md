---
title: Introduction
description: OmniSvelte is a batteries-included framework that transforms SvelteKit into a production-ready powerhouse — with database, auth, schema generation, realtime, jobs, and a plugin system built in.
section: Getting Started
order: 1
---

# Introduction

**OmniSvelte** is a drop-in enhancement layer for SvelteKit. It isn't a separate framework — it *is* SvelteKit, supercharged with everything a production app needs baked in.

> **"SvelteKit, but with superpowers."** — Build production-ready applications in minutes, not months.

---

## Why OmniSvelte?

Plain SvelteKit gives you routing, SSR, and an exceptional developer experience. But most apps need the same things on top: a database ORM, authentication, validation schemas, typed models, and more. You end up wiring the same things together on every project.

OmniSvelte solves this at the framework level. One Vite plugin. One config block. Everything generated and wired.

---

## How it works

Add the `omniSvelte()` Vite plugin, define an `omni` block in `svelte.config.js`, and OmniSvelte:

1. Watches your `.schema.ts` files and **generates** Drizzle tables, Zod validators, and typed model classes on the fly
2. **Injects** a set of virtual modules (`$db`, `$auth/server`, `$auth/client`, `$models/*`, `$schema`, `$validation/*`) so you never hardcode import paths
3. **Wires** Better-Auth into your SvelteKit hooks automatically
4. **Exposes** a plugin API so the community (or you) can extend everything

---

## Feature Status

### ✅ Stable

| Feature | Description |
|---|---|
| 🗄️ Database ORM (Drizzle) | ActiveRecord-style `Model` class + `createModel` helper |
| 🔐 Authentication (Better-Auth) | Email/password, magic link, 2FA, passkeys, OAuth |
| 📋 Central schema → code gen | Auto-generates Drizzle tables, Zod validators, model files |
| ⚡ Vite plugin | Zero-config server hooks, code generation on dev start |
| 🔗 Model relationships | `hasMany`, `belongsTo`, `hasOne`, `belongsToMany` |
| 🪝 Lifecycle hooks | `creating`, `created`, `updating`, `updated`, `deleted` |
| 🏭 Factory & Faker | Test data generation with state transforms |
| 🔌 Plugin API types | Full `OmniPlugin` interface with lifecycle hooks |
| 📦 Virtual modules | `$auth/server`, `$auth/client`, `$db`, `$models/*`, etc. |

### 🔜 In Progress / Planned

| Feature | Description |
|---|---|
| 🎨 UI layer | shadcn-svelte integration, accessible forms, layouts |
| 📧 Email | Template-based email via Resend / Nodemailer |
| ⚡ Caching | Redis / in-memory cache with model-level invalidation |
| 📡 Realtime | WebSocket channels via CrossWS, SSE, model broadcast |
| 🏗️ Jobs & Queues | Background jobs, scheduled tasks, queue management |
| 💳 Payments | Stripe / Paystack for subscriptions and one-time payments |
| 🧩 CLI (`omni`) | Full interactive dev CLI |

---

## Quick Example

```ts
// vite.config.ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [omniSvelte()] });
```

```js
// svelte.config.js
const config = {
  kit: { adapter: adapter() },
  omni: {
    database: { enabled: true, connection: { url: process.env.DATABASE_URL } },
    auth:     { enabled: true, secret: process.env.BETTER_AUTH_SECRET }
  }
};
export default config;
```

```ts
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('posts', {
  id:        field.serial().primaryKey(),
  title:     field.string(255).required(),
  content:   field.string().required(),
  published: field.boolean().default(false),
  userId:    field.integer().required()
}, { timestamps: true });
```

OmniSvelte watches this file and generates your Drizzle table, Zod validators, and typed `Posts` model class automatically.

---

## Next Steps

- [Installation](/docs/getting-started/installation) — Add OmniSvelte to a new or existing project
- [Quick Start](/docs/getting-started/quick-start) — Build your first app end-to-end
- [Schema](/docs/schema/introduction) — The schema-driven code generation system
