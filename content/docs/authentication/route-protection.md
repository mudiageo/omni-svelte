---
title: Route Protection
description: Protect SvelteKit routes using auth sessions in server load functions and hooks.
section: Authentication
order: 7
---

# Route Protection

## Protecting a single route

```ts
// src/routes/dashboard/+page.server.ts
import { auth } from '$auth/server';
import { redirect } from '@sveltejs/kit';

export async function load({ request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) redirect(302, '/login');
  return { user: session.user };
}
```

## Protecting a group of routes

Use a layout server file for a route group:

```ts
// src/routes/(app)/+layout.server.ts
import { auth } from '$auth/server';
import { redirect } from '@sveltejs/kit';

export async function load({ request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) redirect(302, '/login');
  return { user: session.user };
}
```

All routes under `src/routes/(app)/` are now protected without repeating the check.

## Role-based protection

```ts
export async function load({ request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) redirect(302, '/login');
  if (session.user.role !== 'admin') redirect(302, '/403');
  return { user: session.user };
}
```

## Global protection in hooks

For apps where most routes are protected, use `hooks.server.ts`:

```ts
// src/hooks.server.ts
import { auth } from '$auth/server';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';

const publicPaths = ['/', '/login', '/register', '/api/auth'];

const protect: Handle = async ({ event, resolve }) => {
  const isPublic = publicPaths.some(p => event.url.pathname.startsWith(p));
  if (!isPublic) {
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (!session) redirect(302, '/login');
    event.locals.user = session.user;
  }
  return resolve(event);
};

export const handle = sequence(auth.handler, protect);
```

## Accessing user in components

Pass user data down from the layout load:

```svelte
<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  const user = $derived($page.data.user);
</script>

<nav>
  <span>{user.name}</span>
  <form method="POST" action="/api/auth/sign-out">
    <button type="submit">Sign out</button>
  </form>
</nav>

{@render children()}
```

## Rate Limiting

OmniSvelte provides sliding-window rate limiting for remote functions and global routes, powered by `$omni/cache`.

> **Note:** This is separate from Better-Auth's internal rate limiting for auth endpoints.

### Protecting Remote Functions

Wrap any remote function handler with `rateLimit`:

```ts
import { form } from '$omni/remote';
import { rateLimit } from '$omni/auth';
import { z } from 'zod';

export const sendContactMessage = form(
  contactSchema,
  rateLimit({ window: '1m', max: 5 }, async (data, ctx) => {
    await sendSupportTicket(data);
    return { success: true };
  })
);
```

### Custom Rate Limit Keys

By default, clients are keyed by client IP (`event.getClientAddress()`). You can provide a custom `keyBy` function to rate-limit by user ID:

```ts
export const createPost = form(
  postSchema,
  rateLimit(
    {
      window: '1h',
      max: 20,
      keyBy: (event) => event.locals.user?.id ?? event.getClientAddress()
    },
    async (data) => {
      return await Post.create(data);
    }
  )
);
```

### Global Rate Limiting in Hooks

To apply rate limiting across your entire application, configure it in `omniSvelte`:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    omniSvelte({
      rateLimit: {
        window: '1m',
        max: 100,
        keyBy: (event) => event.getClientAddress()
      }
    })
  ]
});
```

When a rate limit is exceeded, OmniSvelte throws a `RateLimitError`, which automatically responds with **HTTP 429 Too Many Requests** and a `Retry-After: <seconds>` header.
