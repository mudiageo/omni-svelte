---
title: Quick Start
description: Build your first omni-svelte app in 5 minutes.
---

# Quick Start

This guide walks you through building a simple blog with omni-svelte — with a database, auth, and generated models.

## Create a new SvelteKit project

```bash
pnpx sv@latest create my-app
cd my-app
pnpm install
pnpm add omni-svelte
```

## Configure omni-svelte

Update `vite.config.ts`:

```ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [omniSvelte()] });
```

Add to `svelte.config.js`:

```js
omni: {
  database: { enabled: true, connection: { url: process.env.DATABASE_URL } },
  auth:     { enabled: true, secret: process.env.BETTER_AUTH_SECRET }
}
```

## Define a schema

Create `src/lib/posts.schema.ts`:

```ts
import { defineSchema, field } from 'omni-svelte/schema';
export default defineSchema('posts', {
	id: field.uuid().primaryKey().defaultRandom(),
	title: field.text().notNull(),
	content: field.text(),
	published: field.boolean().default(false),
	createdAt: field.timestamp().defaultNow()
});
```

## Start the dev server

```bash
pnpm dev
```

omni-svelte generates your schema, models, and auth config. Open `http://localhost:5173` and start building!
