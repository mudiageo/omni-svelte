---
title: Sessions
description: How Better-Auth manages sessions in OmniSvelte — cookies, server access, and reactive client state.
section: Authentication
order: 6
---

# Sessions

OmniSvelte uses Better-Auth's cookie-based session management, wired into SvelteKit's `handle` hook automatically.

## How sessions work

1. On sign-in, Better-Auth creates a session row in the `sessions` table and sets a signed HTTP-only cookie.
2. On every request, OmniSvelte's generated `handle` hook validates the cookie and makes the session available via `$auth/server`.
3. The Vite plugin generates a `hooks.server.ts` that chains your hook with the auth handler using SvelteKit's `sequence()`.

## Accessing the session on the server

```ts
// +page.server.ts or +layout.server.ts
import { auth } from '$auth/server';

export async function load({ request }) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  // session?.user    — the authenticated user or undefined
  // session?.session — the raw session object
  return { user: session?.user ?? null };
}
```

## Accessing the session on the client

```svelte
<script lang="ts">
  import { authClient } from '$auth/client';

  const session = authClient.useSession();
  // $session.data?.user
  // $session.isPending
</script>

{#if $session.isPending}
  <p>Loading...</p>
{:else if $session.data?.user}
  <p>Hello, {$session.data.user.name}</p>
{:else}
  <a href="/login">Sign in</a>
{/if}
```

## Session configuration

```js
omni: {
  auth: {
    session: {
      expiresIn:  60 * 60 * 24 * 7,   // 7 days (default)
      updateAge:  60 * 60 * 24,        // refresh after 1 day
      cookieCache: {
        enabled: true,
        maxAge:  60 * 5                // cache in cookie for 5 min
      }
    }
  }
}
```

## Route protection

```ts
// src/routes/(protected)/+layout.server.ts
import { auth } from '$auth/server';
import { redirect } from '@sveltejs/kit';

export async function load({ request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) redirect(302, '/login');
  return { user: session.user };
}
```
