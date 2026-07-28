---
title: Form Schema API
description: Derive Standard Schema compatible Zod endpoints directly from your OmniSvelte models for seamless form validation.
section: Core
---

# Form Schema API

The `formSchema()` helper generates a Standard Schema-compatible Zod object derived directly from your OmniSvelte model's `defineSchema()` definition.

Instead of duplicating your database schema into separate validation schemas for forms, you can generate them dynamically and pass them directly into SvelteKit remote functions.

## Quick Start

```ts
// src/routes/posts/data.remote.ts
import { formSchema } from 'omni-svelte/remote';
import { Post } from '$models';

// Automatically infers Zod string for title, text for content, etc.
export const postFormSchema = formSchema(Post.schema, {
  pick: ['title', 'content'],
  partial: false
});
```

You can then pass this derived schema into a remote `form` function to enforce strict server-side validation:

```ts
import { form } from '@sveltejs/kit';

export const createPost = form({
  schema: postFormSchema,
  action: async (event, input) => {
    // input is strongly typed based on the schema!
    return await Post.create(input);
  }
});
```

---

## Options Reference

The second argument to `formSchema` allows you to pick, omit, and modify the fields derived from the database model.

| Option | Type | Description |
| --- | --- | --- |
| `pick` | `string[]` | Only include these specific field names. |
| `omit` | `string[]` | Exclude these specific field names. |
| `partial` | `boolean` | If true, wraps all included fields in `.optional()`. Ideal for update forms. |
| `overrides` | `Record<string, ZodTypeAny>` | Override the inferred Zod type for specific fields. |

### Picking and Omitting

Use `pick` to whitelist fields (recommended for security) or `omit` to blacklist them:

```ts
// Only allow title and content
const createSchema = formSchema(Post.schema, {
  pick: ['title', 'content']
});

// Allow everything except internal timestamps
const updateSchema = formSchema(Post.schema, {
  omit: ['created_at', 'updated_at']
});
```

> **Note**: You cannot use both `pick` and `omit` at the same time. Choose one.

### Partial schemas (for Updates)

When building an update form, you usually don't require the user to submit every single field. Set `partial: true` to make all fields optional:

```ts
const updateSchema = formSchema(Post.schema, {
  pick: ['title', 'content', 'published'],
  partial: true // All fields become optional
});
```

### Overriding field types

Sometimes the database column type doesn't perfectly match the form input you want to receive. For example, a `belongsTo` relationship might be represented as an `integer` in the database, but you want to validate that the user submitted a valid array of IDs for a multi-select.

Use `overrides` to inject a custom Zod validation for specific keys:

```ts
import { z } from 'zod';

const schema = formSchema(Post.schema, {
  pick: ['title', 'author_id'],
  overrides: {
    // Override the default number validation with a custom rule
    author_id: z.number().positive("Author must be a valid ID")
  }
});
```

---

## Working with `resource()`

If you are using the `resource()` generator, you don't need to call `formSchema()` manually! `resource()` automatically uses `formSchema()` under the hood to generate schemas based on your `fillable` configuration.

```ts
export const { create, update } = resource(Post, {
  fillable: {
    create: ['title', 'content'], // Uses formSchema with pick
    update: ['title', 'content', 'published'] // Uses formSchema with pick + partial
  }
});
```
