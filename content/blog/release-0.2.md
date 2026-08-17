---
title: "OmniSvelte v0.2: CLI, Resource API, and a Cleaner Config"
description: "v0.2 ships a full CLI suite, the new resource() API that auto-generates remote functions, formSchema() for form validation, fromURL() for URL-driven queries, and a streamlined configuration model aligned with SvelteKit 3."
date: 2026-07-30
author: "Mudiaga Arharhire"
tags: ["announcement", "release"]
featured: true
---

# OmniSvelte v0.2: CLI, Resource API, and a Cleaner Config

v0.1 just shipped, and almost immediately the thing I kept hitting was: *"I love the model layer, but I still have to write a lot of plumbing to connect it to my routes."* Remote functions, form schemas, URL-driven queries — none of that was automatic. You had to wire it all up yourself.

v0.2 fixes that. Today we're shipping the `resource()` API, a full CLI suite, and a configuration model that's cleaner and better aligned with where SvelteKit 3 is heading.

## Install it

```bash
npm install omni-svelte@latest
# or
pnpm add omni-svelte@latest
```

---

## New configuration model (breaking)

We've moved all configuration out of `svelte.config.js` and into the `omniSvelte()` Vite plugin in `vite.config.ts`. SvelteKit-specific options now live under a `kit` namespace inside the same object — no more split configuration across two files.

```ts
// vite.config.ts
import { omniSvelte } from 'omni-svelte/vite'

export default defineConfig({
  plugins: [
    omniSvelte({
      database: { /* ... */ },
      schema: './src/schema.ts',
      kit: {
        adapter: adapter()
      }
    })
  ]
})
```

SvelteKit 3 is moving its own configuration into the Vite plugin, and this change keeps us aligned with that direction. If you need to manage `sveltekit()` yourself — for example if you're pinning a specific SvelteKit version — use the lower-level `omni()` export, which gives you the omni-svelte plugins without injecting `sveltekit()` automatically. That's actually the primary reason `omni()` is exposed at all.

```ts
import { sveltekit } from '@sveltejs/kit/vite'
import { omni } from 'omni-svelte/vite'

export default defineConfig({
  plugins: [
    sveltekit(), // fully under your control
    ...omni({ database: { /* ... */ } })
  ]
})
```

---

## `resource()` — your model, fully wired

This is the headline feature of v0.2.

`resource()` takes a model class and an optional options object, and returns a complete set of SvelteKit remote functions — `list`, `get`, `create`, `update`, and `remove` — with pagination, filtering, eager loading, authorization, and cache invalidation all handled automatically.

```ts
// post.remote.ts
import { resource } from 'omni-svelte/remote'
import { Post } from '$models/post.schema.js'

export const {
  list: posts,
  get: post,
  create: createPost,
  update: updatePost,
  remove: deletePost
} = resource(Post)
```

Mutations default to SvelteKit `form()` remote functions — which means they are **progressively enhanced by default**. They work in a plain `<form>` with zero JavaScript, and are upgraded to a smooth client-side experience when JS is available. If you need programmatic calls instead (triggered by `onclick` or a button outside a form), switch to `command` mode:

```ts
export const { create: createPost } = resource(Post, {
  mutationMode: 'command'
  // or per-operation: { create: 'form', update: 'command' }
})
```

Other options let you scope which operations are generated, restrict fillable fields, eager-load relationships, add authorization logic, and hook into the list query:

```ts
export const { list: posts, create: createPost } = resource(Post, {
  only: ['list', 'create'],
  with: ['author', 'tags'],
  fillable: { create: ['title', 'body', 'published'] },
  authorize: ({ user, operation }) => {
    if (operation === 'list') return true
    return Boolean(user)
  },
  listQuery: (q, input) => q.where('published', true)
})
```

### `omni generate remote`

You don't need to write the `resource()` call by hand. The CLI scaffolds it for you:

```bash
omni generate remote Post
omni generate remote Post --with author,tags --only list,get,create
```

This creates a `post.remote.ts` in `src/routes/` wired to your model, with authorization stubs and comments already in place.

---

## `formSchema()` — form validation without duplication

`formSchema()` takes any `ZodObject` and lets you derive a subset of it for a specific form — with support for `pick`, `omit`, `partial`, and field-level `overrides`. You can pass it anything: a schema from `$validation/*`, a model's built-in `validation.create` or `validation.update`, or a schema you wrote yourself.

```ts
import { formSchema } from 'omni-svelte/remote'
import { Post } from '$models/post.schema.js'

// Pick specific fields and override one
const schema = formSchema(Post.validation.create, {
  pick: ['title', 'body', 'published'],
  overrides: {
    published: z.boolean().default(false)
  }
})
```

`resource()` uses `formSchema()` internally — it derives the right shape from `Model.validation.create` or `Model.validation.update`, applies `fillable` constraints, and makes update schemas partial automatically.

> The name `formSchema` may evolve in a future version as the API matures — it currently works with any Zod schema, not just forms specifically.

---

## `fromURL()` — URL-driven queries

`fromURL()` maps a URL's search parameters to the `ListInput` shape that `resource().list` expects. It handles `page`, `perPage`, `search`, and arbitrary filters — including automatic coercion of `"true"` / `"false"` / numeric strings to their proper types.

```ts
// +page.svelte
<script lang="ts">
  import { page } from '$app/state';
  import { fromURL } from 'omni-svelte/remote';
  import { getPosts } from './data.remote';

  // Reactively maps ?page=2&q=svelte → { page: 2, search: 'svelte' }
  let postsQuery = $derived(getPosts(fromURL(page.url)));
</script>
```

By default, any URL param that isn't `page`, `perPage`, `search`, or `q` is treated as a filter. You can also provide an explicit mapping if your param names differ:

```ts
fromURL(url, {
  page: 'p',
  search: 'q',
  filters: { published: 'status' } // ?status=true → filters.published = true
})
```

---

## `getModel()` — dynamic model lookup

`getModel()` looks up a model class by name from the model registry. It returns the class or `undefined` if not found — useful for building generic admin utilities, dynamic forms, or any tooling that needs a model reference without a static import.

```ts
import { getModel } from 'omni-svelte'

const Post = getModel('Post')
const record = await Post?.find(id)
```

---

## A full CLI suite

v0.2 ships a completely revamped `omni` command-line tool.

**The command structure has changed** — this is a breaking change. `omni migrate` has moved to `omni db migrate` to make room for a cleaner command hierarchy as more database commands are added. See the [CLI reference](/docs/cli) for the full structure.

```bash
# Generate files interactively (prompts for type and name)
omni generate

# Generate a remote functions file for a model
omni generate remote Post

# Generate a schema stub
omni generate schema Post

# Run database migrations
omni db migrate

# Add a package to your project
omni add
```

The CLI now supports a `--package-manager` flag with full support for **Vite+ (`vp`)** and **Deno** alongside npm, pnpm, and yarn.

---

## Zero-config experimental flags

`omniSvelte()` now automatically enables the `remoteFunctions` and `async` compiler flags when it detects they're needed. You no longer have to set these manually in your config.

---

## Dependency updates

This release tracks the latest SvelteKit 3 ecosystem:

| Package | Version |
|---|---|
| `@sveltejs/kit` | `3.0.0-next.11` |
| `svelte` | `5.56.7` |
| `vite` | `8.1.5` |
| `@sveltejs/vite-plugin-svelte` | `7.2.0` |

---

## Bug fixes

- **Zod schema:** Primary key is now correctly excluded from create schemas
- **Model relationships:** String-based model resolution prevents circular dependency issues; fallback to `ownerKey` / `localKey` during relation loading
- **Serialization:** New recursive `toJSON` on `BaseRecord` correctly handles `Date`, `JSON`, and relationship fields
- **Database export:** Wrapped in a lazy proxy to prevent top-level initialization errors in some build contexts

---

## What's next: v0.3

The likely next focus is auth — typed policies, rate limiting, row-level multi-tenancy — along with cache, events, queue, mail, and notifications.

After that, more ORM work: transactions, query scopes, cursor pagination, model factories, and more.

The [full roadmap](/roadmap) has everything else.

As always, issues and feedback are welcome on [GitHub](https://github.com/mudiageo/omni-svelte).
