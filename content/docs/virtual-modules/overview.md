---
title: Virtual Modules Overview
description: OmniSvelte injects virtual modules and path aliases so you never hardcode import paths to generated files.
section: Virtual Modules
order: 1
---

# Virtual Modules

OmniSvelte injects a set of **virtual modules** and **path aliases** so you can import framework features without hardcoding paths to generated files. All resolution happens in the Vite plugin — nothing extra to configure.

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
| `$auth/client` | Client safe | Better-Auth browser client |

> **Server-only** aliases (`$db`, `$models`, `$schema`, `$auth/server`) must only be imported in server-side files: `+page.server.ts`, `+layout.server.ts`, `hooks.server.ts`, or API routes (`+server.ts`). Importing them in `+page.ts` or components triggers a Vite build error.

---

## Before and after

```ts
// Before OmniSvelte — hardcoded paths, easy to break
import { db }    from '$lib/server/database';
import { auth }  from '$lib/server/auth';
import { users } from '$lib/db/schema';

// After OmniSvelte — always correct, no path management
import { db }         from '$db';
import { auth }       from '$auth/server';
import { authClient } from '$auth/client';
import { Users }      from '$models/users.model';
import { users }      from '$schema';
import { createUserSchema } from '$validation/users.validation';
```

---

## TypeScript support

On first `pnpm dev`, OmniSvelte writes `src/omni-env.d.ts`:

```ts
// src/omni-env.d.ts — auto-generated, do not edit
declare module '$models' {
  export * from '$lib/db/models/index';
}
declare module '$schema' {
  export * from '$lib/db/server/schema';
}
declare module '$validation' {
  export * from '$lib/db/validation/index';
}
declare module '$db' {
  export const db: PostgresJsDatabase;
}
```

For sub-path imports like `$models/posts.model`, add a `test-env.d.ts`:

```ts
// test-env.d.ts (project root)
declare module '$models/posts.model' {
  export * from '$lib/db/models/posts.model'; // must use $lib/..., not ./
}
```

And include it in `tsconfig.json`:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "include": ["test-env.d.ts", "src/**/*.ts", "src/**/*.svelte"]
}
```
