---
title: Virtual Modules
description: Reference for $models, $schema, $validation, $db, $auth and other omni-svelte path aliases.
---

# Virtual Modules

omni-svelte injects a set of **virtual modules** and **path aliases** so you can import framework features without hardcoding file paths. All of them are resolved by the Vite plugin — nothing extra to configure.

---

## Overview

| Alias | Boundary | Description |
|---|---|---|
| `$models` | Server only | Barrel export of all generated model classes |
| `$models/<name>` | Server only | Direct import of one model file |
| `$schema` | Server only | Barrel export of all generated Drizzle tables |
| `$db` | Server only | Raw Drizzle database instance |
| `$validation` | Universal | Barrel export of all generated Zod schemas |
| `$validation/<name>` | Universal | Direct import of one Zod schema file |
| `$auth/server` | Server only | Better-Auth server instance |
| `$auth/client` | Client safe | Better-Auth client instance |

> Importing a **server-only** alias from a universal context (`+page.ts`, `+layout.ts`) triggers a Vite build warning. Use `+page.server.ts` / `+layout.server.ts` instead.

---

## `$models` — typed model classes

```ts
// +page.server.ts
import { Posts } from '$models';               // barrel — all models
import { Posts } from '$models/posts.model';   // single model (IDE-friendly)

export const load = async () => {
  const posts = await Posts.query()
    .where('published', true)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();

  return { posts };
};
```

Generated from your `.schema.ts` files. The barrel re-exports every `*.model.ts` file in `schema.output.model.path`.

---

## `$schema` — Drizzle table definitions

```ts
// src/lib/db/server/+server.ts
import { db } from '$db';
import { posts, users } from '$schema';
import { eq } from 'drizzle-orm';

const publishedPosts = await db
  .select()
  .from(posts)
  .where(eq(posts.published, true));
```

`$schema` exports everything from your generated Drizzle schema file (`schema.output.drizzle.path`).

---

## `$db` — raw database connection

```ts
import { db } from '$db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
```

The `db` export is a fully typed `PostgresJsDatabase` instance. Use it when you need raw Drizzle queries beyond what the model API provides.

---

## `$validation` — Zod schemas

```ts
// Universal — safe for both server and client
import { postsCreateSchema, postsUpdateSchema } from '$validation';
import { postsCreateSchema } from '$validation/posts.validation'; // single file

// Validate form data
const result = postsCreateSchema.safeParse(Object.fromEntries(formData));
if (!result.success) {
  return fail(400, { errors: result.error.flatten() });
}
```

Validation schemas are the only virtual module safe to use in client-side code and universal SvelteKit routes.

---

## `$auth/server` and `$auth/client`

```ts
// Server (hooks.server.ts, +page.server.ts, API routes)
import { auth } from '$auth/server';
const session = await auth.api.getSession({ headers: request.headers });

// Client (+page.svelte, stores)
import { authClient } from '$auth/client';
await authClient.signIn.email({ email, password });
```

Powered by [Better-Auth](https://better-auth.com). The server instance is auto-generated from your `omni.auth` config in `svelte.config.js`.

---

## TypeScript IDE support

### Auto-generated: `src/omni-env.d.ts`

omni-svelte writes this file automatically on dev-server start. It declares the barrel aliases so TypeScript always knows their shape:

```ts
// src/omni-env.d.ts  ← do not edit manually
declare module '$models'      { export * from '$lib/db/models/index'; }
declare module '$schema'      { export * from '$lib/db/server/schema'; }
declare module '$validation'  { export * from '$lib/db/validation/index'; }
declare module '$db'          { export const db: PostgresJsDatabase; }
```

### Manual: sub-path shims

For per-file sub-path imports the IDE can't auto-resolve, add a `test-env.d.ts` in your project root (already included in the playground):

```ts
// test-env.d.ts
declare module '$models/posts.model' {
  export * from '$lib/db/models/posts.model';   // ← must be $lib/..., not ./
}
```

Make sure this file is included in your `tsconfig.json`:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "include": ["test-env.d.ts", "src/**/*.ts", "src/**/*.svelte"]
}
```

---

## Customising output paths

All virtual module resolution follows the `schema.output` config you set in `svelte.config.js`. Changing a path there re-generates `src/omni-env.d.ts` automatically:

```js
// svelte.config.js
omni: {
  schema: {
    output: {
      model:   { path: 'src/lib/db/models',           format: 'per-schema' },
      drizzle: { path: 'src/lib/db/server/schema.ts', format: 'single-file' },
      zod:     { path: 'src/lib/db/validation',       format: 'per-schema' },
    }
  }
}
```
