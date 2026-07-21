---
title: Schema Introduction
description: OmniSvelte uses a schema-driven approach — define your data model once in .schema.ts files and the framework generates everything else.
section: Schema
order: 1
---

# Schema

OmniSvelte is schema-driven. You define your data shapes **once** in `.schema.ts` files and the framework auto-generates your Drizzle tables, Zod validators, and typed model classes.

## How it works

```
your .schema.ts file
        │
        ▼
OmniSvelte Vite plugin (watches for changes)
        │
        ├── src/lib/db/server/schema.ts   (Drizzle table)
        ├── src/lib/db/validation/*.ts    (Zod create/update schemas)
        └── src/lib/db/models/*.ts        (Typed Model class)
```

OmniSvelte watches all files matching `src/**/*.schema.ts` (configurable) and re-generates outputs whenever they change — on every save during development.

## Defining a schema

Create any file ending in `.schema.ts` inside your `src/` directory:

```ts
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema(
  'posts',
  {
    id:        field.serial().primaryKey(),
    title:     field.string(255).required(),
    slug:      field.string().required().unique(),
    content:   field.string().required(),
    published: field.boolean().default(false),
    userId:    field.integer().required()
  },
  {
    timestamps: true,
    indexes: ['slug', 'published']
  }
);
```

## Generated outputs

From the schema above, OmniSvelte writes:

### Drizzle table (`src/lib/db/server/schema.ts`)

```ts
export const posts = pgTable('posts', {
  id:        serial('id').primaryKey(),
  title:     varchar('title', { length: 255 }).notNull(),
  slug:      text('slug').notNull().unique(),
  content:   text('content').notNull(),
  published: boolean('published').default(false),
  userId:    integer('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (t) => [
  index('posts_slug_idx').on(t.slug),
  index('posts_published_idx').on(t.published)
]);
```

### Zod validators (`src/lib/db/validation/posts.ts`)

```ts
export const createPostSchema = z.object({
  title:     z.string().max(255),
  slug:      z.string(),
  content:   z.string(),
  published: z.boolean().optional().default(false),
  userId:    z.number().int()
});

export const updatePostSchema = createPostSchema.partial();
```

### Model class (`src/lib/db/models/posts.ts`)

```ts
export class Posts extends Model<typeof posts> {
  static find(id: number) { ... }
  static findMany(opts?: QueryOptions) { ... }
  static create(data: CreatePost) { ... }
  static query() { return new QueryBuilder(posts); }
  // ... full ActiveRecord-style API
}
```

## Multiple schema files

You can have as many `.schema.ts` files as you want — one per table, or grouped by feature:

```
src/
  lib/
    posts.schema.ts
    users.schema.ts
    comments.schema.ts
    auth/
      sessions.schema.ts
```

All are discovered automatically. The generated `schema.ts` imports and re-exports them all.

## Next steps

- [defineSchema & field.*](/docs/schema/define-schema) — Full field builder API
- [Field Types](/docs/schema/field-types) — All available field types and modifiers
- [Schema Options](/docs/schema/schema-options) — Timestamps, soft deletes, indexes, realtime
- [Code Generation](/docs/schema/code-generation) — Generated output formats and configuration
