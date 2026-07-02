---
title: $models
description: Import auto-generated ActiveRecord model classes from any .schema.ts file.
section: Virtual Modules
order: 4
---

# `$models`

`$models` is a barrel export of all generated model classes from your `.schema.ts` files. **Server only.**

## Barrel import

```ts
import { Posts, Users, Comments } from '$models';
```

## Direct import

```ts
import { Posts } from '$models/posts.model';
```

## What's in a model

For each `.schema.ts`, OmniSvelte generates a class that extends `Model<Table>`:

```ts
// Auto-generated: src/lib/db/models/posts.ts
export class Posts extends Model<typeof posts> {
  static find(id)           // → Post | null
  static findMany(opts)     // → Post[]
  static findOrFail(id)     // → Post (throws)
  static create(data)       // → Post
  static query()            // → QueryBuilder
  static drizzle()          // → DrizzleDB (escape hatch)
  static with(relations)    // → RelationLoader
  update(data)              // → this
  delete()                  // → void
  toJSON()                  // → plain object (respects `hidden`)
}
```

## TypeScript types

The generated types are fully inferred from your schema:

```ts
import type { Post, CreatePost, UpdatePost } from '$models/posts.model';

// Post         — full row type (from Drizzle $inferSelect)
// CreatePost   — input type for create (from Zod schema)
// UpdatePost   — partial input type for update
```
