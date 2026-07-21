---
title: $validation
description: Import auto-generated Zod schemas for create and update operations.
section: Virtual Modules
order: 6
---

# `$validation`

`$validation` is a barrel export of all generated Zod validation schemas. **Universal — safe in both server and client code.**

## Import

```ts
// Barrel
import { createPostSchema, updatePostSchema } from '$validation';

// Direct
import { createPostSchema, updatePostSchema } from '$validation/posts.validation';
```

## Generated schemas

For a schema with required fields `title`, `content`, `userId` and optional `published`:

```ts
// $validation/posts.validation
export const createPostSchema = z.object({
  title:     z.string().max(255),
  content:   z.string(),
  userId:    z.number().int(),
  published: z.boolean().optional().default(false)
});

export const updatePostSchema = createPostSchema.partial();

export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
```

## In form actions

```ts
// +page.server.ts
import { createPostSchema } from '$validation/posts.validation';
import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request }) => {
    const data = Object.fromEntries(await request.formData());
    const result = createPostSchema.safeParse(data);

    if (!result.success) {
      return fail(400, {
        errors: result.error.flatten().fieldErrors
      });
    }

    const post = await Posts.create(result.data);
    return { success: true, postId: post.id };
  }
};
```

## In API routes

```ts
// src/routes/api/posts/+server.ts
import { createPostSchema } from '$validation/posts.validation';
import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
  const body = await request.json();
  const result = createPostSchema.safeParse(body);

  if (!result.success) {
    error(400, { message: 'Validation failed', errors: result.error.flatten() });
  }

  const post = await Posts.create(result.data);
  return json(post, { status: 201 });
}
```
