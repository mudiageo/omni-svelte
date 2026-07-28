---
title: Remote Functions
description: High-level overview and API guide for OmniSvelte Remote Functions integration.
section: Core
---

# Remote Functions

> [!NOTE]
> OmniSvelte automatically enables SvelteKit's experimental `remoteFunctions` flag and Svelte's experimental `async` flag under the hood when using the `omniSvelte` Vite plugin. No manual configuration is required!

OmniSvelte leverages SvelteKit's experimental Remote Functions (`query`, `form`, `command`) to provide type-safe CRUD operations, schema-to-form validation derivation, and code generation.

## `formSchema()`

Derives a Standard-Schema-compatible Zod object and per-field input metadata directly from a model's `defineSchema()` definition.

```ts
import { formSchema } from 'omni-svelte/remote';
import { Post } from '$models';

// Derive form schema with specific fields
export const postFormSchema = formSchema(Post.schema, {
  pick: ['title', 'content'],
  partial: false
});
```

### Options

| Option | Type | Description |
| --- | --- | --- |
| `pick` | `string[]` | Only include these field names |
| `omit` | `string[]` | Exclude these field names |
| `partial` | `boolean` | Wrap included fields in `.optional()` (e.g. for update forms) |
| `overrides` | `Record<string, ZodTypeAny>` | Override inferred Zod type for specific fields (required for relationship fields in `pick`) |

---

## `resource()`

Generates a standard set of SvelteKit remote functions (`list`, `get`, `create`, `update`, `remove`) for an OmniSvelte model.

```ts
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
  authorize: ({ user, operation }) => {
    if (operation === 'list' || operation === 'get') return true;
    return Boolean(user);
  }
});
```

### Options

| Option | Type | Description |
| --- | --- | --- |
| `only` | `OperationName[]` | Generate only these operations (`'list'`, `'get'`, `'create'`, `'update'`, `'remove'`) |
| `exclude` | `OperationName[]` | Exclude specific operations |
| `fillable` | `{ create?: string[]; update?: string[] }` | Specify fillable fields for create/update forms |
| `with` | `string[]` | Relationships to eager-load on list and get operations |
| `pagination` | `{ perPage?: number }` | Configure default page size (default: 20) |
| `authorize` | `(ctx: AuthorizeContext) => boolean \| Promise<boolean>` | Authorization callback evaluated before touching DB |
| `names` | `Record<OperationName, string>` | Rename generated output keys |
| `mutationMode` | `'form' \| 'command' \| { create?: ...; update?: ... }` | How `create`/`update` are generated. Default: `'form'` |
| `listQuery` | `(q: QueryBuilder, input: ListInput) => QueryBuilder` | Hook to append custom SQL clauses to `list` operations |

### `mutationMode`

Controls whether `create` and `update` are generated as SvelteKit `form()` or `command()` remote functions.

- **`'form'`** (default) — produces a form remote function, spread onto a `<form>` element for progressive enhancement:

```svelte
<!-- +page.svelte -->
<script>
  import { createPost, updatePost } from './data.remote';
</script>

<!-- create form -->
<form {...createPost}>
  <input {...createPost.fields.title.as('text')} />
  <input {...createPost.fields.content.as('text')} />
  <button>Publish</button>
</form>

<!-- update/toggle inline form -->
<form {...updatePost} class="inline">
  <input {...updatePost.fields.id.as('hidden', post.id)} />
  <input {...updatePost.fields.published.as('hidden', !post.published ? 'true' : 'false')} />
  <button type="submit">{post.published ? 'Unpublish' : 'Publish'}</button>
</form>
```

- **`'command'`** — produces a command remote function, called programmatically (e.g. in event handlers):

```ts
// data.remote.ts
export const { update: updatePost } = resource(Post, {
  mutationMode: { create: 'form', update: 'command' }
});
```

```svelte
<!-- +page.svelte -->
<button onclick={() => updatePost({ id: post.id, published: true })}>
  Publish
</button>
```

---

## `fromURL()`

A standalone helper to map URL query parameters (e.g. from `$page.url`) directly into the `ListInput` object expected by generated `list` resource queries. By calling this reactively in your component during SSR, your remote function queries automatically pre-render correctly!

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { fromURL } from 'omni-svelte/remote';
  import { posts } from './data.remote';

  // Automatically translates ?page=2&q=hello into { page: 2, search: "hello" }
  let queryInput = $derived(fromURL(page.url));

  // The query re-fetches automatically whenever the URL changes
  let postsQuery = $derived(posts(queryInput));
</script>

{#await postsQuery}
  Loading...
{:then data}
  <!-- Render data.data and data.meta -->
{/await}
```

### Options (URLParamsMapping)

You can pass a second argument to override the default URL parameter keys:

```ts
const input = fromURL(page.url, {
  page: 'p',           // map ?p=2 to { page: 2 }
  perPage: 'limit',    // map ?limit=50 to { perPage: 50 }
  search: 'query',     // map ?query=abc to { search: 'abc' }
  filters: {           // map specific keys explicitly to the filters object
    published: 'is_pub' // map ?is_pub=true to { filters: { published: true } }
  }
});
```

> **Note**: If `filters` is **not** specified in the mapping, `fromURL` will automatically gather any parameter that is not a known reserved key (`page`, `per_page`, `search`, `q`, etc.) and append it to the `filters` object.

---

## Code Generation

Scaffold remote function endpoints easily using the CLI:

```bash
omni generate remote Post --with author
```
