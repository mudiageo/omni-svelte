---
title: Policies & Authorization
description: Define reusable, composable authorization rules for your models using definePolicy, can, and authorize.
section: Authentication
order: 8
---

# Policies & Authorization

Route protection handles *authentication* — verifying who someone is. Policies handle *authorization* — deciding what they are allowed to do.

Rather than scattering `if user.id === post.authorId` checks across your remote functions, OmniSvelte lets you define authorization rules once alongside your models and reuse them everywhere.

## Defining a policy

`definePolicy()` is just a plain function — there are no file conventions or special locations required. You can define policies anywhere that makes sense for your project: co-located with your remote functions, grouped by domain, or all in one file. Multiple policies per file are perfectly fine:

```ts
// Could live in data.remote.ts, src/lib/policies.ts, or anywhere else
import { definePolicy } from 'omni-svelte/auth';
import { Post, Comment } from '$models';

export const postPolicy = definePolicy(Post, {
  create: (user) => !!user,
  update: (user, post) => user?.id === post?.authorId,
  remove: (user, post) => user?.id === post?.authorId,
});

export const commentPolicy = definePolicy(Comment, {
  remove: (user, comment) => user?.id === comment?.authorId || user?.role === 'moderator',
});
```

Each rule receives the authenticated `user` (or `null` for unauthenticated requests) and optionally the record being acted on. Return `true` to allow, `false` to deny, or `undefined` to fall through.

### The `before` hook

The optional `before` hook runs before every specific action rule. Returning a non-`undefined` value short-circuits everything else — useful for admin grants or blanket bans:

```ts
export const postPolicy = definePolicy(Post, {
  // Better Auth's User type doesn't include role or suspended out of the box.
  // Cast to any (or extend the User type) to access custom fields.
  before: (user) => {
    if ((user as any)?.role === 'admin') return true;   // admins bypass all rules
    if ((user as any)?.suspended) return false;         // suspended users are denied everything
    return undefined;                                   // everyone else falls through to the specific rule
  },

  create: (user) => !!user,
  update: (user, post) => user?.id === post?.authorId,
  remove: (user, post) => user?.id === post?.authorId,
  publish: (user, post) => user?.id === post?.authorId && !post?.isDraft,
});
```

### Async rules

Rules can be `async` when you need to hit the database or an external service:

```ts
export const postPolicy = definePolicy(Post, {
  publish: async (user, post) => {
    if (!user) return false;
    const subscription = await Subscription.find(user.id);
    return subscription?.plan === 'pro' && user?.id === post?.authorId;
  },
});
```

---

## Using policies in `resource()`

The primary place to enforce policies is via the `authorize` hook in `resource()`. It runs before every database operation and receives the current `user`, the `operation` name, the `input`, and the pre-fetched database `record`:

```ts
// src/routes/posts/data.remote.ts
import { resource } from 'omni-svelte/remote';
import { Post } from '#lib/schema';
import { postPolicy } from '$lib/policies/post.policy';
import { can } from 'omni-svelte/auth';

export const {
  list: posts,
  get: post,
  create: createPost,
  update: updatePost,
  remove: deletePost
} = resource(Post, {
  authorize: async ({ user, operation, record }) => {
    // Public read access
    if (operation === 'list' || operation === 'get') return true;

    // The framework automatically fetches the `record` for mutations!
    return can(user, operation, record, postPolicy);
  }
});
```

Any `authorize` callback returning `false` automatically responds with `403 Forbidden` — no extra error handling needed.

---

## Using policies in `query`, `form`, and `command`

When writing custom remote functions, use `authorize()` (the throwing variant) at the top of your handler. It throws a `ForbiddenError` which OmniSvelte maps to a `403` response automatically:

### `query`

```ts
// src/routes/posts/data.remote.ts
import { query, getRequestEvent } from '$app/server';
import { authorize } from 'omni-svelte/auth';
import { postPolicy } from '$lib/policies/post';
import { z } from 'zod';

export const adminPosts = query(z.any(), async (input) => {
  const event = getRequestEvent();
  await authorize((event?.locals as any)?.user ?? null, 'list', undefined, postPolicy);
  return Post.query().where('status', 'draft').get();
});
```

### `form`

```ts
// src/routes/posts/data.remote.ts
import { form, getRequestEvent } from '$app/server';
import { authorize } from 'omni-svelte/auth';
import { postPolicy } from '$lib/policies/post';
import { postFormSchema } from './schema';

export const updatePost = form(postFormSchema, async (input) => {
    const event = getRequestEvent();
    const post = await Post.find(input.id);
    await authorize((event?.locals as any)?.user ?? null, 'update', post, postPolicy);
    return post.update(input);
});
```

### `command`

```ts
// src/routes/posts/data.remote.ts
import { command, getRequestEvent } from '$app/server';
import { authorize } from 'omni-svelte/auth';
import { postPolicy } from '$lib/policies/post';
import { z } from 'zod';

export const removePost = command(z.number(), async (id) => {
  const event = getRequestEvent();
  const post = await Post.find(id);
  await authorize((event?.locals as any)?.user ?? null, 'remove', post, postPolicy);
  await post.delete();
});
```

---

## `can()` vs `authorize()`

| | `can()` | `authorize()` |
|---|---|---|
| Returns | `Promise<boolean>` | `Promise<void>` |
| On denial | Returns `false` | Throws `ForbiddenError` |
| Use when | Branching logic or conditional UI | Guarding mutations — halt on denial |

```ts
// Conditional — show edit button only if allowed
const canEdit = await can(user, 'update', post, postPolicy);

// Enforcement — throw immediately if not allowed
await authorize(user, 'update', post, postPolicy);
```

---

## Handling `ForbiddenError`

`authorize()` throws `ForbiddenError` from `'omni-svelte'`, which carries `.action` and `.resource` for programmatic handling:

```ts
import { ForbiddenError } from 'omni-svelte';

try {
  await authorize(user, 'delete', post, postPolicy);
} catch (err) {
  if (err instanceof ForbiddenError) {
    console.log(err.action);   // 'delete'
    console.log(err.resource); // 'posts'
    console.log(err.message);  // 'Not authorized to delete posts'
  }
}
```

---

## Type safety

The `action` argument to both `can()` and `authorize()` is inferred from the keys you define in your policy. Your editor will autocomplete valid actions and TypeScript will error if you reference a key that doesn't exist:

```ts
await can(user, 'publish', post, postPolicy);   // ✅ valid
await can(user, 'approve', post, postPolicy);   // ❌ TypeScript error — 'approve' is not a key
```

Policies default to **deny** — if no rule matches an action, access is refused. Adding a new operation requires you to explicitly define a rule for it.
