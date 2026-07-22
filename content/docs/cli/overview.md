---
title: CLI Overview
description: Complete reference for the omni CLI — project setup, generators, database, debug, monitoring, docs, and deployment commands.
section: CLI
order: 1
---

# CLI Reference

> **Status: Planned (v0.2).** The `omni` CLI is in development. This page documents the intended API.

The `omni` CLI is the primary developer tool for OmniSvelte projects. It covers the full development lifecycle — from project creation to production deployment.

## Installation

When released, the CLI will be available globally or via `npx`:

```bash
# Global install
pnpm add -g omni-svelte

# Or run without installing
npx omni <command>
```

## Command groups

| Group | Commands | Description |
|---|---|---|
| **Project** | `init`, `add` | Scaffold and configure projects |
| **Generate** | `generate model\|resource\|auth-page\|email` | Code generators |
| **Database** | `migrate`, `migrate:rollback`, `migrate:fresh`, `seed`, `db:push`, `db:pull` | Schema and data management |
| **Development** | `serve`, `tinker` | Dev server and REPL |
| **Code Quality** | `lint`, `format`, `test` | Quality tools |
| **Cache** | `cache:clear`, `cache:stats` | Cache management |
| **Monitor** | `monitor:queries`, `monitor:realtime` | Observability |
| **Debug** | `debug:routes`, `debug:models`, `debug:permissions`, `debug:config` | Diagnostics |
| **Docs** | `docs:generate`, `docs:serve` | Documentation |
| **Deploy** | `build:production`, `deploy` | Deployment |

---

## Project commands

### `omni init <name>`

Scaffold a new OmniSvelte project interactively:

```bash
npx omni init my-app
```

Interactive wizard asks:
- Package manager (`pnpm`, `npm`, `bun`)
- Database (PostgreSQL, SQLite, none)
- Auth strategies (email, OAuth providers, magic link)
- UI framework (shadcn-svelte, none)
- Planned features to stub out

### `omni migrate`

Migrate an existing SvelteKit project to OmniSvelte:

```bash
cd my-existing-app
npx omni migrate sveltekit
```

### `omni add`

Add OmniSvelte features and plugins to your project (coming soon):

```bash
npx omni add stripe
```

---

## Generate commands

### `omni generate model <name>`

Scaffold a `.schema.ts` + model + factory:

```bash
omni generate model post
# Creates: src/lib/post.schema.ts
# After save: auto-generates model, validation, factory
```

### `omni generate resource <name>`

Full CRUD scaffold — schema, model, routes, and UI:

```bash
omni generate resource post
# Creates:
#   src/lib/post.schema.ts
#   src/routes/posts/+page.svelte         (list)
#   src/routes/posts/[id]/+page.svelte    (show)
#   src/routes/posts/new/+page.svelte     (create form)
#   src/routes/posts/[id]/edit/+page.svelte (edit form)
#   src/routes/posts/+page.server.ts
#   src/routes/posts/[id]/+page.server.ts
```

### `omni generate auth-page`

Add login, register, forgot password, and reset password pages:

```bash
omni generate auth-page
# Creates: src/routes/(auth)/login, register, forgot-password, reset-password
```

### `omni generate email <name>`

Scaffold an email template:

```bash
omni generate email welcome
# Creates: src/emails/welcome.tsx
```

---

## Database commands

### `omni db migrate`

Run all pending migrations:

```bash
omni db migrate
omni db migrate --db-url=postgres://...   # override DATABASE_URL
```

### `omni db rollback`

Roll back the last batch of migrations (manual guidance):

```bash
omni db rollback
```

### `omni db fresh`

Drop all tables and re-run all migrations from scratch. **Destructive.** (manual guidance):

```bash
omni db fresh
```

### `omni seed`

Run database seeders:

```bash
omni seed
omni seed --file=scripts/seed-users.ts
```

### `omni db:push`

Push schema changes directly without a migration file (dev only):

```bash
omni db:push
```

### `omni db:pull`

Introspect an existing database and generate a schema file:

```bash
omni db:pull
```

---

## Development commands

### `omni serve`

Start the SvelteKit dev server (alias for `pnpm dev`):

```bash
omni serve
omni serve --port=3000
omni serve --with-admin     # include admin panel (planned)
omni serve --realtime       # enable WebSocket server
```

### `omni tinker`

Interactive REPL with all models, `$db`, and `$auth` pre-loaded:

```bash
omni tinker
```

```
OmniSvelte REPL v0.2.0
> await Posts.count()
42
> await Users.query().where('role', 'admin').get()
[{ id: 1, name: 'Admin', ... }]
> .exit
```

---

## Debug commands

### `omni debug:routes`

List all registered SvelteKit routes:

```bash
omni debug:routes
# ┌──────────────────────────────────┬─────────────┐
# │ Route                            │ Type        │
# ├──────────────────────────────────┼─────────────┤
# │ /                                │ page        │
# │ /posts                           │ page        │
# │ /posts/[id]                      │ page        │
# │ /api/auth/**                     │ api (auth)  │
# └──────────────────────────────────┴─────────────┘
```

### `omni debug:models`

List all models, their fields, and relationships:

```bash
omni debug:models
```

### `omni debug:permissions`

Show the role/permission matrix:

```bash
omni debug:permissions
```

### `omni debug:config`

Print the resolved OmniSvelte configuration:

```bash
omni debug:config
```

---

## Code quality commands

```bash
omni lint              # ESLint
omni format            # Prettier
omni test              # Vitest
omni test --coverage   # Coverage report
```

---

## Cache commands

```bash
omni cache:clear   # Flush all cached entries
omni cache:stats   # Show hit rate, memory usage, key count
```

---

## Monitor commands

```bash
omni monitor:queries    # Show slow database queries in real time
omni monitor:realtime   # Monitor active WebSocket connections
```

---

## Docs commands

```bash
omni docs:generate   # Generate API docs from schema + JSDoc comments
omni docs:serve      # Serve generated docs at http://localhost:4000
```

---

## Deployment commands

```bash
omni build:production      # Optimized production build
omni deploy --env=staging  # Deploy to a named environment
omni deploy --env=production --confirm
```

---

## Plugin commands

Plugins can register their own commands under `omni <plugin>:<command>`:

```bash
omni my-plugin:init
omni audit:report --from=2025-01-01
```

See [Creating Plugins](/docs/plugins/creating-plugins) for how to register commands.

---

## Global flags

| Flag | Description |
|---|---|
| `--help`, `-h` | Show help for a command |
| `--version`, `-v` | Print the installed omni-svelte version |
| `--verbose` | Enable verbose/debug output |
| `--no-color` | Disable coloured output |
| `--cwd <path>` | Set working directory |
