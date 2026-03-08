---
title: Database
description: Using the Drizzle-powered database layer in omni-svelte.
---

# Database

omni-svelte wraps [Drizzle ORM](https://orm.drizzle.team) and extends it with auto-generated models, typed query builders, and schema-driven code generation.

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

## Schema files

Define your tables in files ending with `.schema.ts`:

```ts
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('posts', {
	id: field.uuid().primaryKey().defaultRandom(),
	title: field.text().notNull(),
	content: field.text(),
	published: field.boolean().default(false),
	createdAt: field.timestamp().defaultNow()
});
```

omni-svelte watches these files and generates:

- A Drizzle schema (`src/lib/db/server/schema.ts`)
- Zod validators (`src/lib/db/validation/`)
- Typed model classes with CRUD methods (`src/lib/db/models/`)

## Using generated models

```ts
// +page.server.ts
import { PostModel } from '$lib/db/models/posts';

export async function load() {
	const posts = await PostModel.findMany({
		where: { published: true },
		orderBy: { createdAt: 'desc' }
	});

	return { posts };
}
```

## Migrations

```bash
# Push schema changes directly to the database (dev)
pnpm db:push

# Generate and run migration files (production)
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```
