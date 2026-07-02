---
title: $schema
description: Import all generated Drizzle table definitions from a single virtual module.
section: Virtual Modules
order: 5
---

# `$schema`

`$schema` is a barrel export of all generated Drizzle table definitions. **Server only.**

## Import

```ts
import { posts, users, comments } from '$schema';
```

This is equivalent to importing from the generated `src/lib/db/server/schema.ts` directly, but it always resolves correctly even as tables are added or paths change.

## Usage with `$db`

```ts
import { db }    from '$db';
import { posts, users } from '$schema';
import { eq } from 'drizzle-orm';

const result = await db
  .select()
  .from(posts)
  .innerJoin(users, eq(posts.userId, users.id))
  .where(eq(posts.published, true));
```

## Usage with Drizzle Kit

`$schema` is a Vite virtual module — it can't be used directly in `drizzle.config.ts` since that runs outside Vite. The config file uses the real file path:

```ts
// drizzle.config.ts
export default defineConfig({
  schema: './src/lib/db/server/schema.ts',   // real path
  // NOT '$schema'
});
```
