---
title: "OmniSvelte v0.1: SvelteKit, but with superpowers"
description: "The first release of OmniSvelte is here. A schema-driven data layer, ActiveRecord-style models, and first-class auth for SvelteKit, with zero config."
date: 2026-07-23
author: "Mudiaga Arharhire"
tags: ["announcement", "release"]
featured: true
---

# OmniSvelte v0.1: SvelteKit, but with superpowers

Every new SvelteKit project starts the same way: wire up a database client, hand-write your Drizzle schema, bolt on an auth library, duplicate your validation logic between the client and the server, and repeat all of it on the next project. None of that is hard, exactly — it's just the same fifty decisions made over and over, in every app, forever.

omni-svelte exists to make those fifty decisions once, so you don't have to. **v0.1 is live today**, and it lays the foundation: a schema-driven data layer with a real ORM, first-class auth, and a Vite plugin that wires it all together with zero config.

This is a foundation release, not the whole vision — more on what's still ahead below.

## Install it

```bash
pnpx omni-svelte init
```

## Define your schema once

Instead of hand-writing a Drizzle table, a Zod validator, and a model class separately — and keeping all three in sync by hand — you define the shape of your data once:

```ts
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte';

export default defineSchema('posts', {
	id: field.uuid().primaryKey().defaultRandom(),
	title: field.text().notNull(),
	content: field.text(),
	published: field.boolean().default(false),
	authorId: field.uuid().references('users.id'),
	createdAt: field.timestamp().defaultNow()
});
```

On `pnpm dev`, the Vite plugin generates:

- `src/lib/db/server/schema.ts` — the Drizzle table
- `src/lib/db/validation/posts.ts` — `createPostSchema` / `updatePostSchema` (Zod)
- `src/lib/db/models/posts.ts` — a typed `Post` model with full CRUD

One definition, three artifacts, always in sync.

## A real ActiveRecord-style model API

```ts
import { Post } from '$models/post';

const post = await Post.create({ title: 'Hello', content: '...' });
const posts = await Post.where('published', true).get();
const withAuthor = await Post.with(['author', 'comments']).get();

await post.update({ title: 'Updated' });
await post.delete();

// Escape hatch — drop to raw Drizzle whenever you need to
const db = Post.drizzle();
```

Relationships (`hasMany`, `belongsTo`, `hasOne`, `belongsToMany`) and lifecycle hooks (`creating`, `created`, `updating`, `updated`, `deleted`) are built in, along with a `Factory`/`Faker` pair for generating test data:

```ts
import { Factory, Faker } from 'omni-svelte/database';

class PostFactory extends Factory {
	definition() {
		return {
			title: Faker.text(1),
			content: Faker.text(3),
			published: Faker.boolean()
		};
	}
}

const posts = await new PostFactory().times(10).create();
```

## Auth, wired up for you

omni-svelte wraps [Better-Auth](https://better-auth.com), generating your server config directly from `svelte.config.js`:

```js
// svelte.config.js
omni: {
  auth: {
    enabled: true,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 24 * 7 },
    plugins: { magicLink: true, twoFactor: true, passkey: true, username: true }
  }
}
```

```ts
// Server
import { auth } from '$auth/server';

// Client
import { authClient } from '$auth/client';
const session = authClient.useSession();
```

Email/password, magic links, 2FA, and passkeys are all available out of the box.

## Virtual modules instead of manual imports

The Vite plugin injects path aliases for everything it generates, so you stop wiring up the same imports in every file:

```ts
// Before
import { db } from '$lib/server/database';
import { auth } from '$lib/server/auth';
import { users } from '$lib/db/schema';

// After — generated and aliased automatically
import { db } from '$db';
import { auth } from '$auth/server';
import { Post } from '$models/post';
import { createPostSchema } from '$validation/post';
```

`$auth/server`, `$auth/client`, `$db`, `$models/*`, `$schema`, `$validation/*`, and `$omni/config` are all live in v0.1.

## Zero-config setup

```ts
// vite.config.ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [omniSvelte()] });
```

One plugin, one config block in `svelte.config.js`, and the database and auth layers are wired up.

## What's not here yet

In the interest of not overselling this release: the plugin system is currently just types — the `OmniPlugin` interface is fully defined with all its lifecycle hooks, but the runtime that actually loads, registers, and executes plugins isn't built yet. The `omni` CLI, the UI layer (shadcn-svelte integration), email, caching, realtime, background jobs, and file storage are all on the roadmap but not in v0.1. Some of these, for example the CLI and the shadcn-svelte integration are already in progress. You can see exactly what's shipped versus planned in the [README](https://github.com/mudiageo/omni-svelte#features).

## What's next

v0.2 is focused on the CLI and developer experience: `omni init`, `omni generate`, migrations, seeding, and an interactive REPL. After that: the UI layer, then realtime/email/caching, then the rest of the roadmap through a stable v1.0.

If you're building on SvelteKit and tired of wiring up the same data layer every time, give it a spin and tell me what's missing.

```bash
pnpx omni-svelte init
```