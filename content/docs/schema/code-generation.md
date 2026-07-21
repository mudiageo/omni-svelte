---
title: Code Generation
description: How OmniSvelte generates Drizzle tables, Zod validators, and model classes from .schema.ts files.
section: Schema
order: 5
---

# Code Generation

OmniSvelte's Vite plugin watches your `.schema.ts` files and generates three output files per schema on every save.

## When generation runs

- `pnpm dev` start — all schema files are processed immediately
- On save — any `.schema.ts` change triggers regeneration of its outputs
- `pnpm build` — all schemas are processed before the build

## Output files

Given a schema at `src/lib/posts.schema.ts`, OmniSvelte generates:

```
src/lib/db/
  server/
    schema.ts          ← Drizzle table (server-only)
  validation/
    posts.ts           ← Zod create/update schemas (universal)
  models/
    posts.ts           ← Typed Model class (server-only)
    posts.factory.ts   ← Test factory (dev/test only)
```

All paths are configurable — see [svelte.config.js](/docs/configuration/svelte-config).

## Generated Drizzle table

```ts
// src/lib/db/server/schema.ts — DO NOT EDIT (auto-generated)
import { pgTable, serial, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id:        serial('id').primaryKey(),
  title:     varchar('title', { length: 255 }).notNull(),
  slug:      text('slug').notNull().unique(),
  content:   text('content').notNull(),
  published: boolean('published').notNull().default(false),
  userId:    integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (t) => [
  index('posts_slug_idx').on(t.slug),
  index('posts_published_idx').on(t.published)
]);
```

## Generated Zod validators

```ts
// src/lib/db/validation/posts.ts — DO NOT EDIT
import { z } from 'zod';

export const createPostSchema = z.object({
  title:     z.string().max(255),
  slug:      z.string().regex(/^[a-z0-9-]+$/),
  content:   z.string(),
  published: z.boolean().optional().default(false),
  userId:    z.number().int()
});

export const updatePostSchema = createPostSchema.partial();
export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
```

## Generated Model class

```ts
// src/lib/db/models/posts.ts — DO NOT EDIT (safe to extend via createModel)
import { Model } from 'omni-svelte/database';
import { posts } from '../server/schema';

export class Posts extends Model<typeof posts> {
  static readonly table = posts;
  static readonly fillable = ['title', 'slug', 'content', 'published', 'userId'];
  static readonly timestamps = true;

  // Generated CRUD methods
  static find(id: number): Promise<typeof posts.$inferSelect | null> { ... }
  static findMany(opts?: QueryOptions): Promise<(typeof posts.$inferSelect)[]> { ... }
  static create(data: CreatePost): Promise<typeof posts.$inferSelect> { ... }
  static query(): QueryBuilder<typeof posts> { ... }
  update(data: UpdatePost): Promise<this> { ... }
  delete(): Promise<void> { ... }
}
```

## Custom output formats

The generation format can be changed per output type:

```js
omni: {
  schema: {
    output: {
      drizzle: { path: 'src/lib/db/schema.ts',   format: 'single-file' }, // one file
      zod:     { path: 'src/lib/db/validation',   format: 'per-schema'  }, // one per table
      model:   { path: 'src/lib/db/models',       format: 'per-schema'  }
    }
  }
}
```

## Watching and hot-reload

The Vite plugin uses `chokidar` to watch schema files. On change:

1. The affected schema is re-parsed
2. Outputs are regenerated
3. The dev server hot-reloads modules that import from the changed outputs

No restart needed.
