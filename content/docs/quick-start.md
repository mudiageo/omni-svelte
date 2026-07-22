---
title: Quick Start
description: Build your first omni-svelte app in minutes using the CLI.
---

# Quick Start

This guide walks you through building a simple blog with omni-svelte — with a database, auth, and generated models.

## 1. Scaffold a new project

```bash
npx omni init my-blog
cd my-blog
```

The CLI creates a SvelteKit project with TypeScript and Tailwind, installs `omni-svelte`, and configures the Vite plugin — all in one step.

## 2. Configure omni-svelte

Add the `omni` key to `svelte.config.js`:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter() },
	omni: {
		database: {
			enabled: true,
			connection: { url: process.env.DATABASE_URL }
		},
		auth: {
			enabled: true,
			secret: process.env.BETTER_AUTH_SECRET
		}
	}
};

export default config;
```

## 3. Set up environment variables

```bash
# .env
DATABASE_URL=postgres://user:password@localhost:5432/my-blog
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:5173
```

## 4. Generate a schema

Use the generator to scaffold your first schema file:

```bash
npx omni generate schema posts
```

Or edit the generated file directly — `src/lib/db/schemas/posts.schema.ts`:

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

## 5. Push the schema to your database

```bash
npx omni db push
```

## 6. Start the dev server

```bash
npx omni serve
# or: pnpm dev
```

omni-svelte generates your Drizzle table, Zod validators, typed model, and auth config on first start. Open `http://localhost:5173` and start building!

---

## Using an existing SvelteKit project?

Skip step 1 and run `omni migrate` instead:

```bash
npx omni migrate sveltekit
```

Then continue from step 2. See the [Installation guide](/docs/installation) for full details.
