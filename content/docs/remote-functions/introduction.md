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

Generates a standard set of SvelteKit remote functions (`list`, `get`, `create`, `update`, `remove`) for an OmniSvelte model. Includes built-in pagination, eager-loading, authorization, and cache invalidation.

For a full API reference including `mutationMode`, `listQuery`, `fromURL`, and code examples — see the dedicated [Resource API](./resource-api) page.

---

## Code Generation

Scaffold remote function endpoints easily using the CLI:

```bash
omni generate remote Post --with author
```
