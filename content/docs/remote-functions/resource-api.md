---
title: Resource API
description: Generate type-safe CRUD endpoints for any OmniSvelte model with a single function call.
section: Core
---

# Resource API

`resource()` is the primary way to expose your OmniSvelte models to the frontend. One call generates a complete set of type-safe, paginated, access-controlled endpoints — no boilerplate required.

## Quick Start

Create a `data.remote.ts` file alongside your route:

```ts
// src/routes/posts/data.remote.ts
import { resource } from 'omni-svelte/remote';
import { Post } from '$models';

export const {
  list: posts,
  get: post,
  create: createPost,
  update: updatePost,
  remove: deletePost
} = resource(Post, {
  with: ['author'],
  pagination: { perPage: 10 },
  authorize: ({ user, operation }) => {
    if (operation === 'list' || operation === 'get') return true;
    return Boolean(user);
  }
});
```

You can also scaffold this file automatically:

```bash
omni generate remote Post --with author
```

---

## Reading Data

### Listing records

The `list` endpoint accepts an optional input object and returns a paginated result.

```svelte
<script lang="ts">
  import { posts } from './data.remote';

  let postsQuery = $derived(posts({ page: 1, search: 'svelte' }));
</script>

{#await postsQuery}
  <p>Loading...</p>
{:then { data, meta }}
  {#each data as post}
    <article>{post.title}</article>
  {/each}

  <p>Page {meta.current_page} of {meta.last_page} — {meta.total} results</p>
{/await}
```

**List input options:**

| Field | Type | Description |
| --- | --- | --- |
| `page` | `number` | Page number (1-based, default: 1) |
| `perPage` | `number` | Records per page (default: from `pagination.perPage` option or 20) |
| `search` | `string` | Full-text search string |
| `filters` | `Record<string, string \| number \| boolean \| null>` | Arbitrary key-value filters applied as `WHERE` clauses |

### Getting a single record

```svelte
<script lang="ts">
  import { post } from './data.remote';

  let { id } = $props();
  let postQuery = $derived(post(id));
</script>

{#await postQuery then record}
  <h1>{record.title}</h1>
{/await}
```

---

## Syncing with the URL

Use the `fromURL()` helper to map URL query parameters directly into list input. Since `page.url` from `$app/state` is populated during SSR, this gives you server-rendered filtering and pagination — no `load` function needed.

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { fromURL } from 'omni-svelte/remote';
  import { posts } from './data.remote';

  // Reactively maps ?page=2&q=svelte → { page: 2, search: 'svelte' }
  let postsQuery = $derived(posts(fromURL(page.url)));
</script>
```

When the user navigates to `?page=2&status=published`, the query updates and re-fetches automatically. Combine with `goto()` to build filter UIs:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set(key, value);
    params.delete('page'); // reset to page 1
    goto(`?${params}`);
  }
</script>

<button onclick={() => setFilter('status', 'published')}>Show published</button>
```

### Custom URL parameter names

Pass a mapping as the second argument to override the default keys:

```ts
fromURL(page.url, {
  page: 'p',           // ?p=2       → { page: 2 }
  perPage: 'limit',    // ?limit=50  → { perPage: 50 }
  search: 'q',         // ?q=hello   → { search: 'hello' }
  filters: {
    status: 'status',  // ?status=published → { filters: { status: 'published' } }
    authorId: 'author' // ?author=42         → { filters: { authorId: 42 } }
  }
})
```

> By default (without a `filters` mapping), any URL parameter that isn't `page`, `perPage`, `per_page`, `search`, or `q` is automatically collected into `filters`. Values are auto-coerced — `'true'`/`'false'` become booleans and numeric strings become numbers.

---

## Custom Filtering with `listQuery`

For queries beyond what the standard `filters` input handles — custom joins, complex `WHERE` conditions, ordering — use the `listQuery` hook:

```ts
export const { list: posts } = resource(Post, {
  listQuery: (q, input) => {
    q = q.orderBy('created_at', 'desc');

    if (input.filters?.featured) {
      q = q.where('is_featured', true);
    }

    return q;
  }
});
```

The hook receives the full Drizzle query builder and the validated `ListInput`, and must return the modified query.

---

## Mutations

### Form-based (default)

By default, `create` and `update` generate SvelteKit `form()` remote functions, which progressively enhance a standard `<form>` element:

```svelte
<!-- Create -->
<form {...createPost}>
  <input {...createPost.fields.title.as('text')} placeholder="Title" />
  <textarea {...createPost.fields.content.as('text')}></textarea>
  <button>Create</button>
</form>

<!-- Update -->
<form {...updatePost.for(post.id)}>
  <input {...updatePost.fields.id.as('hidden', post.id)} />
  <input {...updatePost.fields.title.as('text')} value={post.title} />
  <button>Save</button>
</form>

<!-- Quick toggle without navigating away -->
<form {...updatePost.for(`toggle-${post.id}`)}>
  <input {...updatePost.fields.id.as('hidden', post.id)} />
  <input {...updatePost.fields.published.as('hidden', String(!post.published))} />
  <button type="submit">{post.published ? 'Unpublish' : 'Publish'}</button>
</form>
```

### Command-based

Set `mutationMode: 'command'` to call mutations programmatically instead:

```ts
// data.remote.ts
export const { update: updatePost, remove: deletePost } = resource(Post, {
  mutationMode: { create: 'form', update: 'command' }
});
```

```svelte
<button onclick={() => updatePost({ id: post.id, published: true })}>
  Publish
</button>

<button onclick={() => deletePost(post.id)}>
  Delete
</button>
```

### Controlling fillable fields

Restrict which fields are accepted by `create` and `update`:

```ts
resource(Post, {
  fillable: {
    create: ['title', 'content', 'status'],
    update: ['title', 'content']
  }
});
```

---

## Authorization

The `authorize` callback runs before any database operation and receives context about the current user and what's being performed:

```ts
resource(Post, {
  authorize: async ({ user, operation, input }) => {
    // Public read access
    if (operation === 'list' || operation === 'get') return true;

    // Require authentication for mutations
    if (!user) return false;

    // Only the post author can delete
    if (operation === 'remove') {
      const post = await Post.find(input as number);
      return post?.authorId === user.id;
    }

    return true;
  }
});
```

Returning `false` throws a `403 Forbidden` error automatically.

---

## Configuration Reference

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `only` | `OperationName[]` | all | Generate only these operations |
| `exclude` | `OperationName[]` | none | Skip specific operations |
| `with` | `string[]` | `[]` | Relations to eager-load |
| `fillable` | `{ create?: string[]; update?: string[] }` | all fields | Whitelisted fields for mutations |
| `pagination.perPage` | `number` | `20` | Default page size |
| `authorize` | `(ctx) => boolean \| Promise<boolean>` | — | Access control callback |
| `mutationMode` | `'form' \| 'command' \| { create?; update? }` | `'form'` | How `create`/`update` are generated |
| `listQuery` | `(q, input) => q` | — | Hook to customize the `list` SQL query |
| `names` | `Record<OperationName, string>` | — | Rename the generated export keys |
| `live` | `OperationName[]` | `[]` | Mark operations as real-time subscriptions |
