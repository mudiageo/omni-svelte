---
title: Migrations
description: Database migration workflow with Drizzle Kit — generate, run, roll back, and manage schema changes.
section: Database
order: 6
---

# Migrations

OmniSvelte uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for migrations. The generated `src/lib/db/server/schema.ts` is the source of truth — Drizzle Kit diffs it against your database to produce migration SQL.

## Setup

OmniSvelte writes a `drizzle.config.ts` on first run:

```ts
// drizzle.config.ts (auto-generated — safe to edit)
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:  './src/lib/db/server/schema.ts',
  out:     './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! }
});
```

Add convenience scripts to `package.json`:

```json
{
  "scripts": {
    "db:push":    "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio":  "drizzle-kit studio",
    "db:drop":    "drizzle-kit drop"
  }
}
```

## Development workflow

During development, use `db:push` — it applies schema changes directly without creating migration files:

```bash
pnpm db:push
```

> Safe for local dev. **Never use `db:push` in production.**

## Production workflow

1. Generate a migration file from your schema changes:

```bash
pnpm db:generate --name add_published_to_posts
```

This creates `drizzle/migrations/0001_add_published_to_posts.sql`.

2. Commit the migration file.

3. Run pending migrations in CI/CD or on deploy:

```bash
pnpm db:migrate
```

## Drizzle Studio

Visual database browser — runs in your browser:

```bash
pnpm db:studio
# Open https://local.drizzle.studio
```

## Migration file structure

```
drizzle/
  migrations/
    0000_initial_schema.sql
    0001_add_published_to_posts.sql
    0002_add_tags_table.sql
    meta/
      _journal.json      ← migration history
      0000_snapshot.json ← schema snapshots for diffing
```

## Rolling back

Drizzle Kit doesn't auto-generate rollbacks. Write a down migration manually or use `db:drop` to remove a specific migration from the journal:

```bash
pnpm db:drop
# Interactive: select which migration to remove from the journal
```

## Seeding

OmniSvelte doesn't ship a seeder runner yet (planned for v0.2). Use a plain script for now:

```ts
// scripts/seed.ts
import { db }   from '../src/lib/db/server/index.js';
import { users } from '../src/lib/db/server/schema.js';

await db.insert(users).values([
  { name: 'Admin', email: 'admin@example.com', role: 'admin' }
]);
console.log('Seeded!');
process.exit(0);
```

Run with:

```bash
npx tsx scripts/seed.ts
```
