---
title: Database Introduction
description: OmniSvelte wraps Drizzle ORM with auto-generated models, typed query builders, and schema-driven code generation.
section: Database
order: 1
---

# Database

OmniSvelte wraps [Drizzle ORM](https://orm.drizzle.team) and extends it with auto-generated models, lifecycle hooks, relationships, and test factories — all driven from your `.schema.ts` files.

## Setup

Enable in `svelte.config.js`:

```js
omni: {
  database: {
    enabled: true,
    connection: { url: process.env.DATABASE_URL }
  }
}
```

## The generated stack

For every `.schema.ts` file, OmniSvelte generates three outputs:

| Output | Import from | Description |
|---|---|---|
| Drizzle table | `$schema` | Raw Drizzle table definition |
| Zod validators | `$validation` | `createXSchema`, `updateXSchema` |
| Model class | `$models` | ActiveRecord-style CRUD class |

## Quick example

```ts
// Define the schema
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('posts', {
  id:        field.serial().primaryKey(),
  title:     field.text().notNull(),
  published: field.boolean().default(false),
  createdAt: field.timestamp().defaultNow()
});
```

```ts
// Use the generated model
import { Posts } from '$models/posts.model';

const posts = await Posts.query().where('published', true).get();
const post  = await Posts.find(1);
const newPost = await Posts.create({ title: 'Hello', published: true });
await post.update({ title: 'Updated' });
await post.delete();
```

## Migrations

```bash
# Push schema changes to DB (dev only — no migration file)
pnpm db:push

# Generate a migration file (production)
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

## Next steps

- [Model API](/docs/database/model-api) — Full CRUD, query builder, and factory API
- [Relationships](/docs/database/relationships) — hasMany, belongsTo, belongsToMany
- [Lifecycle Hooks](/docs/database/lifecycle-hooks) — creating, created, updating, deleted
- [Raw Drizzle](/docs/database/raw-drizzle) — Escape hatch to full Drizzle
