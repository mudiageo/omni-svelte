---
title: Quick Start
description: Build a simple blog with OmniSvelte in under 10 minutes using schema-driven code generation, the Model API, and Better-Auth.
section: Getting Started
order: 3
---

# Quick Start

This guide builds a small **blog** with a `posts` table, typed model, Zod validation, and an auth-protected route.

## 1. Define your schema

Create `src/lib/posts.schema.ts`:

```ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema(
  'posts',
  {
    id:        field.serial().primaryKey(),
    title:     field.string(255).required(),
    slug:      field.slug().required().unique(),
    content:   field.string().required(),
    published: field.boolean().default(false),
    userId:    field.integer().required()
  },
  { timestamps: true, indexes: ['slug', 'published'] }
);
```

Save the file. OmniSvelte generates:

- `src/lib/db/server/schema.ts` — Drizzle table
- `src/lib/db/validation/posts.ts` — `createPostSchema` / `updatePostSchema`
- `src/lib/db/models/posts.ts` — Typed `Posts` model

## 2. Use the Model API

```ts
// src/routes/blog/+page.server.ts
import { Posts } from '$models/posts.model';

export async function load() {
  const posts = await Posts
    .query()
    .where('published', true)
    .orderBy('created_at', 'desc')
    .get();

  return { posts };
}
```

## 3. Protect a route with auth

```ts
// src/routes/blog/new/+page.server.ts
import { auth } from '$auth/server';
import { redirect } from '@sveltejs/kit';

export async function load({ request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) redirect(302, '/login');

  return { user: session.user };
}
```

## 4. Validate a form action

```ts
// src/routes/blog/new/+page.server.ts (continued)
import { Posts } from '$models/posts.model';
import { createPostSchema } from '$validation/posts.validation';
import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const result = createPostSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
      return fail(400, { errors: result.error.flatten() });
    }

    const post = await Posts.create(result.data);
    return { success: true, id: post.id };
  }
};
```

## 5. Use Better-Auth on the client

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { authClient } from '$auth/client';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');

  async function login() {
    await authClient.signIn.email({ email, password });
    goto('/dashboard');
  }
</script>

<form onsubmit|preventDefault={login}>
  <input bind:value={email} type="email" placeholder="Email" required />
  <input bind:value={password} type="password" placeholder="Password" required />
  <button type="submit">Sign in</button>
</form>
```

## What's next?

- [Schema reference](/docs/schema/define-schema) — All field types and schema options
- [Model API](/docs/database/model-api) — Full CRUD, relationships, and hooks
- [Virtual Modules](/docs/virtual-modules/overview) — `$db`, `$models`, `$validation`, and more
- [Authentication](/docs/authentication/introduction) — Sessions, OAuth, 2FA
