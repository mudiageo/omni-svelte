# omni-svelte 🚀

**Batteries Included Framework for SvelteKit**

Transform SvelteKit into a powerhouse with enterprise-grade features out of the box. OmniSvelte isn't just another library - it's a complete drop-in replacement that supercharges SvelteKit with everything you need for modern web development.

> **"SvelteKit, but with superpowers"** - Build production-ready applications in minutes, not months.

> **SvelteKit with superpowers.** Transform any SvelteKit app into a production-ready powerhouse — database, auth, schema generation, UI, email, caching, realtime, jobs, and a plugin system that can do virtually anything.

[![npm](https://img.shields.io/npm/v/omni-svelte)](https://www.npmjs.com/package/omni-svelte)
[![license](https://img.shields.io/github/license/mudiageo/omni-svelte)](../../LICENSE)

---

## Why omni-svelte?

✨ **Zero Configuration** — Works out of the box with sensible defaults. One Vite plugin, one config block.

⚡ **Lightning Fast** — Built on SvelteKit's performance foundation. Framework layer adds zero runtime overhead.

🔒 **Type-Safe Everything** — End-to-end TypeScript: from a central schema definition to auto-generated Drizzle tables, Zod validators, typed models, and virtual module imports.

🎨 **Beautiful by Default** — shadcn-svelte UI integration, accessible form components, and pre-built layouts. _(in progress)_

🛠️ **Developer First** — Powerful CLI (`omni`) for scaffolding, migrations, seeding, debugging, and more. _(in progress)_

🔌 **Extensible by Design** — A comprehensive plugin API that can add database tables, auth providers, CLI commands, routes, API endpoints, UI components, real-time channels, email templates, and more.

---

## Features

### ✅ Stable

| Feature                         | Description                                                    |
| ------------------------------- | -------------------------------------------------------------- |
| 🗄️ Database ORM (Drizzle)       | ActiveRecord-style `Model` class and `createModel` helper      |
| 🔐 Authentication (Better-Auth) | Email/password, magic link, 2FA, passkeys, OAuth               |
| 📋 Central schema → code gen    | Auto-generates Drizzle tables, Zod validators, and model files |
| ⚡ Vite plugin                  | Zero-config server hooks, code generation on dev start         |
| 🔗 Model relationships          | `hasMany`, `belongsTo`, `hasOne`, `belongsToMany`              |
| 🪝 Lifecycle hooks              | `creating`, `created`, `updating`, `updated`, `deleted`        |
| 🏭 Factory & Faker              | Test data generation with state transforms                     |
| 🔌 Plugin API types             | Full `OmniPlugin` interface with all lifecycle hooks defined   |
| 📦 Virtual modules              | `$auth/server`, `$auth/client`, `$db`, `$models/*` aliases     |

### 🔜 In Progress / Planned

| Feature               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| 🎨 UI layer           | shadcn-svelte components, accessible forms, layouts      |
| 📧 Email              | Template-based email via Resend/Nodemailer               |
| ⚡ Caching            | Redis/in-memory cache with model-level invalidation      |
| 📡 Realtime           | WebSocket channels via CrossWS, SSE, model broadcast     |
| 🏗️ Jobs & Queues      | Background jobs, scheduled tasks, queue management       |
| 🔍 Observability      | Query monitoring, performance tracing, logging           |
| 🐛 Debug CLI          | Route inspector, model/relation debugger, config viewer  |
| 💾 File Storage       | S3-compatible uploads, local disk, CDN integration       |
| 💳 Payments           | Stripe/Lemon Squeezy plugin for subscriptions & one-time |
| 🏢 Multi-tenancy      | Schema-per-tenant and row-level isolation strategies     |
| 🚀 Deployment         | Optimized builds, environment management, adapter config |
| 📄 Docs generation    | Auto-generate API docs from schema and types             |
| 🧩 CLI (`omni`)       | Full interactive dev CLI (see below)                     |
| 🔌 Plugin marketplace | Community-contributed plugins with dependency management |

---

## Installation

### New project

```bash
npx omni init my-app
cd my-app && pnpm install
```

### Add to existing SvelteKit project

```bash
pnpm add omni-svelte
npx omni add
```

---

## Quick start

**`vite.config.ts`**

```ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [omniSvelte()] });
```

**`svelte.config.js`**

```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
  omni: {
    database: {
      enabled: true,
      connection: { url: process.env.DATABASE_URL }
    },
    auth: {
      enabled: true,
      secret: process.env.BETTER_AUTH_SECRET,
      emailAndPassword: { enabled: true }
    }
  }
};

export default config;
```

---

## Virtual Modules & Path Aliases

omni-svelte injects virtual modules and path aliases for all generated code. No manual imports needed.

| Virtual module / alias | What it provides                                      |
| ---------------------- | ----------------------------------------------------- |
| `$auth/server`         | Better-Auth server instance (`auth`)                  |
| `$auth/client`         | Better-Auth browser client (`authClient`)             |
| `$db`                  | Drizzle database instance                             |
| `$models/[name]`       | Auto-generated typed model class, e.g. `$models/post` |
| `$schema`              | All generated Drizzle table definitions               |
| `$validation/[name]`   | Auto-generated Zod schemas, e.g. `$validation/post`   |
| `$omni/config`         | Resolved omni config (read-only, server-only)         |

```ts
// Before omni-svelte
import { db } from '$lib/server/database';
import { auth } from '$lib/server/auth';
import { users } from '$lib/db/schema';

// After — generated and aliased automatically
import { db } from '$db';
import { auth } from '$auth/server';
import { authClient } from '$auth/client';
import { Post } from '$models/post';
import { createPostSchema } from '$validation/post';
```

---

## Schema-driven code generation

Define your data model once. omni-svelte auto-generates everything else.

```ts
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte';

export default defineSchema('posts', {
  id:        field.uuid().primaryKey().defaultRandom(),
  title:     field.text().notNull(),
  content:   field.text(),
  published: field.boolean().default(false),
  authorId:  field.uuid().references('users.id'),
  createdAt: field.timestamp().defaultNow()
});
```

Generated outputs (on `pnpm dev` start, watching for changes):

- **`src/lib/db/server/schema.ts`** — Drizzle table
- **`src/lib/db/validation/posts.ts`** — Zod `createPostSchema` / `updatePostSchema`
- **`src/lib/db/models/posts.ts`** — Typed `Post` model with CRUD

---

## Database — Model API

```ts
import { Post } from '$models/post';

// CRUD
const post  = await Post.create({ title: 'Hello', content: '...' });
const found = await Post.find(id);
const posts = await Post.where('published', true).get();
await post.update({ title: 'Updated' });
await post.delete();

// Relationships
const posts = await Post.with(['author', 'comments']).get();

// Escape hatch — full Drizzle
const db = Post.drizzle();
```

### createModel (manual)

```ts
import { createModel } from 'omni-svelte/database';
import { postsTable } from '$schema';
import { createPostSchema, updatePostSchema } from '$validation/post';

export const Post = createModel('Post', {
  table:      postsTable,
  fillable:   ['title', 'content', 'published'],
  validation: { create: createPostSchema, update: updatePostSchema },
  timestamps: true,
  hooks: {
    creating: [(post) => { post.slug = slugify(post.title); }]
  }
});
```

### Factories (test data)

```ts
import { Factory, Faker } from 'omni-svelte/database';

class PostFactory extends Factory {
  definition() {
    return { title: Faker.text(1), content: Faker.text(3), published: Faker.boolean() };
  }
}

const posts = await new PostFactory().times(10).create();
```

---

## Authentication

Wraps [Better-Auth](https://better-auth.com) — config auto-generated from `svelte.config.js`:

```js
// svelte.config.js
omni: {
  auth: {
    enabled: true,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 24 * 7 },
    plugins: { magicLink: true, twoFactor: true, passkey: true, username: true }
  }
}
```

```ts
// Server hooks — auto-generated by the Vite plugin
import { auth } from '$auth/server';

// Client
import { authClient } from '$auth/client';
const session = authClient.useSession();
```

---

## CLI (`omni`) _(planned)_

```bash
# Project
npx omni init <name>            # Scaffold a new omni-svelte app
npx omni add                    # Add omni-svelte to an existing SvelteKit project

# Generators
omni generate model <name>      # Scaffold schema + model + factory
omni generate resource <name>   # Scaffold model + routes + CRUD UI
omni generate auth-page         # Add login/register pages
omni generate email <name>      # Add email template

# Database
omni migrate                    # Run pending migrations
omni migrate:rollback           # Roll back last migration
omni migrate:fresh              # Drop all tables and re-migrate
omni seed                       # Run database seeders
omni db:push                    # Push schema changes without migration file
omni db:pull                    # Pull existing schema from database

# Development
omni serve                      # Start dev server (alias for pnpm dev)
omni serve --with-admin         # Dev server + admin panel (planned)
omni serve --realtime           # Dev server with WebSocket support
omni tinker                     # Interactive REPL with models pre-loaded

# Code quality
omni lint                       # Run ESLint
omni format                     # Run Prettier
omni test                       # Run Vitest
omni test --coverage            # Run tests with coverage report

# Cache
omni cache:clear                # Clear application cache
omni cache:stats                # Show cache statistics

# Monitoring & Debug
omni monitor:queries            # Show slow database queries
omni monitor:realtime           # Monitor active WebSocket connections
omni debug:routes               # List all registered routes
omni debug:models               # List all models and relationships
omni debug:permissions          # Show permission/role matrix
omni debug:config               # Show resolved omni config

# Docs
omni docs:generate              # Generate API docs from schema and types
omni docs:serve                 # Serve generated docs locally

# Deployment
omni build:production           # Optimized production build
omni deploy --env=staging       # Deploy to a target environment

# Help
omni help                       # List all commands
omni help generate:resource     # Detailed help for a specific command
omni --version                  # Show installed version
```

---

## Plugin System

Plugins can integrate with and extend **any part** of the framework:

- 🗄️ **Database** — add tables, schemas, models, seeders, migrations
- 🔐 **Auth** — providers, middleware, session strategies, auth plugins
- 🎨 **UI** — shadcn-svelte component registrations
- 🧩 **CLI** — new `omni <plugin>:<command>` entries
- 🌐 **Routing** — SvelteKit routes, API endpoints, WebSocket handlers
- 📡 **Realtime** — channel definitions, model event subscriptions
- 📧 **Email** — template registrations
- ⚡ **Cache** — custom cache drivers
- 💾 **Storage** — custom file storage adapters

```ts
import type { OmniPlugin } from 'omni-svelte/plugins';

const myPlugin: OmniPlugin = {
  name: 'my-plugin',

  // Add a DB table
  registerTables: () => ({ pluginLogs: pluginLogsTable }),

  // Add a CLI command: omni my-plugin:init
  registerCommands: () => [{
    name: 'init',
    description: 'Initialise my-plugin',
    run: async () => { /* ... */ }
  }],

  // Inject into every request
  handle: async ({ event, resolve }) => resolve(event),

  // React to model events across the app
  onModelEvent: async ({ type, modelName, data }) => {
    if (type === 'created') auditLog(modelName, data);
  }
};
```

---

## Package exports

| Export                                | Description                                            |
| ------------------------------------- | ------------------------------------------------------ |
| `omni-svelte`                         | Top-level types and helpers (`defineSchema`, `field`)  |
| `omni-svelte/vite`                    | `omniSvelte()` Vite plugin                             |
| `omni-svelte/database`                | `createModel`, `Model`, `Factory`, `Faker`             |
| `omni-svelte/auth`                    | Auth types and helpers                                 |
| `omni-svelte/plugins`                 | `OmniPlugin` interface and all plugin type definitions |
| `omni-svelte/plugins/logging`         | Logging plugin _(stub)_                                |
| `omni-svelte/plugins/cors`            | CORS plugin _(stub)_                                   |
| `omni-svelte/plugins/analytics`       | Analytics plugin _(stub)_                              |
| `omni-svelte/plugins/error-reporting` | Error reporting plugin _(stub)_                        |

---

## Roadmap

### v0.1 — Foundation _(current)_

- [x] Drizzle ORM layer with `createModel` and ActiveRecord API
- [x] Central schema → auto-generated Drizzle, Zod, and model files
- [x] `fields()` helper for fluent schema definition
- [x] Model relationships (`hasMany`, `belongsTo`, `hasOne`, `belongsToMany`)
- [x] Better-Auth integration with auto-generated server config
- [x] Zero-config Vite plugin (hook wiring, code-gen, hot reload)
- [x] `$auth/server`, `$auth/client`, `$db`, `$models/*` virtual modules
- [x] Plugin API types (`OmniPlugin` interface with all lifecycle hooks)

### v0.2 — CLI & Developer Experience

- [ ] `createFactory` helper — functional alternative to class-based `Factory`
- [ ] Relationship definitions in `defineSchema` (auto-generate `with()` loaders)
- [ ] `npx omni init` — scaffold new projects interactively
- [ ] `omni add` — add omni-svelte to existing SvelteKit projects
- [ ] `omni generate model|resource|auth-page|email` generators
- [ ] `omni migrate`, `omni seed`, `omni db:push` database commands
- [ ] `omni tinker` — interactive REPL with models pre-loaded
- [ ] Plugin CLI command registration (`omni <plugin>:<cmd>`)
- [ ] `omni debug:routes|models|config` diagnostic commands

### v0.3 — UI & Forms

- [ ] shadcn-svelte component integration
- [ ] Accessible form components with Zod validation binding
- [ ] Pre-built page layouts (auth, dashboard, docs, marketing)
- [ ] `omni generate resource` full CRUD UI scaffold
- [ ] UI component registration via plugin API

### v0.4 — Realtime, Email & Caching

- [ ] WebSocket channels via CrossWS
- [ ] SSE (Server-Sent Events) for lighter real-time use cases
- [ ] Model-level realtime events (`Post.subscribe('created', handler)`)
- [ ] Email templates via Resend / Nodemailer
- [ ] `omni generate email` template scaffolding
- [ ] Redis / in-memory cache with model-level invalidation
- [ ] `omni cache:clear|stats` cache management commands

### v0.5 — Jobs, Storage & Monitoring

- [ ] Background job queue (BullMQ / in-process)
- [ ] Scheduled tasks (cron-style)
- [ ] S3-compatible file storage with local disk fallback
- [ ] Query performance monitoring (`omni monitor:queries`)
- [ ] WebSocket connection monitoring (`omni monitor:realtime`)
- [ ] Structured logging with log levels and transports
- [ ] Observability plugin hooks (tracing, metrics)

### v0.6 — Payments & Multi-tenancy

- [ ] Stripe plugin (subscriptions, one-time payments, webhooks)
- [ ] Lemon Squeezy plugin
- [ ] Schema-per-tenant isolation strategy
- [ ] Row-level multi-tenancy with tenant resolver middleware

### v0.7 — Deployment & Docs

- [ ] `omni build:production` optimized build command
- [ ] `omni deploy --env=<name>` deployment helper
- [ ] Multi-environment configuration management
- [ ] `omni docs:generate` — API docs from schema + JSDoc
- [ ] `omni docs:serve` — serve generated docs locally
- [ ] Admin panel (opt-in, dev mode): `omni serve --with-admin`

### v0.8 — Plugin Ecosystem

- [ ] First-party **payments** plugin (Stripe, Lemon Squeezy — subscriptions, one-time, webhooks)
- [ ] First-party **WebSocket** plugin (CrossWS — channels, rooms, presence, auth)
- [ ] Official first-party plugins: logging, CORS, analytics, error-reporting
- [ ] Plugin marketplace / registry
- [ ] Custom plugin development framework + scaffolder
- [ ] Plugin dependency management
- [ ] Community plugin contributions

### v1.0 — Production Ready

- [ ] Stable, semver-committed public API
- [ ] Comprehensive test coverage (>90%)
- [ ] Full documentation at omni-svelte.dev
- [ ] Migration guides from popular alternatives
- [ ] Flagship example apps

---

## Documentation

Full docs at **[omni-svelte.dev](https://omni-svelte.dev)** (or run `pnpm dev:docs` locally).

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and [AGENTS.md](../../AGENTS.md) for the repo map and dev workflow.

## Acknowledgments

Built with love on top of these amazing projects:

- [SvelteKit](https://kit.svelte.dev/) — The foundation
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe database access
- [Better-Auth](https://better-auth.com/) — Modern authentication
- [CrossWS](https://github.com/unjs/crossws) — Cross-runtime WebSocket _(planned)_
- [shadcn-svelte](https://www.shadcn-svelte.com/) — Beautiful UI components _(planned)_
- [Zod](https://zod.dev/) — Schema validation

Built with ❤️ by the OmniSvelte team.

## License

MIT © [Mudiaga Arharhire](https://github.com/mudiageo) — see [LICENSE](../../LICENSE)
