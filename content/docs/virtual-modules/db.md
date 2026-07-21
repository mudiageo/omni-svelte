---
title: $db
description: The raw Drizzle database instance — server-only import for direct database access.
section: Virtual Modules
order: 2
---

# `$db`

`$db` provides the raw [Drizzle ORM](https://orm.drizzle.team) database instance. It's the lowest-level escape hatch — use it when the Model API isn't enough.

> **Server only.** Import `$db` only in `.server.ts` files, `hooks.server.ts`, or `+server.ts` routes.

## Import

```ts
import { db } from '$db';
```

## Type

```ts
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
const db: PostgresJsDatabase;
```

## Basic usage

```ts
import { db }    from '$db';
import { users } from '$schema';
import { eq }    from 'drizzle-orm';

// Select
const allUsers = await db.select().from(users);
const user     = await db.select().from(users).where(eq(users.id, 1));

// Insert
const [newUser] = await db.insert(users).values({ name, email }).returning();

// Update
await db.update(users).set({ name: 'Updated' }).where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));
```

## Transactions

```ts
import { db } from '$db';

await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ name, email }).returning();
  await tx.insert(profiles).values({ userId: user.id });
});
```

## When to use `$db` vs. the Model API

| Situation | Use |
|---|---|
| Simple CRUD | `Posts.find()`, `Posts.create()`, `Posts.query()` |
| Complex multi-table joins | `$db` |
| Transactions spanning multiple tables | `$db` |
| Aggregates, raw SQL | `$db` |
| Migrations, one-off scripts | `$db` |
