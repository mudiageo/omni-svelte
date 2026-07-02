---
title: $auth/server & $auth/client
description: The Better-Auth server and client instances exposed as virtual module aliases.
section: Virtual Modules
order: 3
---

# `$auth/server` & `$auth/client`

## `$auth/server`

The Better-Auth server instance — **server only.**

```ts
import { auth } from '$auth/server';
```

### Methods

```ts
// Get session from request headers
const session = await auth.api.getSession({ headers: request.headers });

// Sign out a user by session ID
await auth.api.revokeSession({ headers: request.headers });

// List all sessions for a user
const sessions = await auth.api.listSessions({ headers: request.headers });

// Delete a user
await auth.api.deleteUser({ body: { userId: '...' }, headers });
```

### In SvelteKit `handle`

Better-Auth's HTTP handler is auto-wired via the Vite plugin. If you add a custom `hooks.server.ts`, OmniSvelte `sequence()`s your hook with the auth handler:

```ts
// src/hooks.server.ts (your custom hooks)
import type { Handle } from '@sveltejs/kit';

// This is composed with auth.handler automatically
export const handle: Handle = async ({ event, resolve }) => {
  // Your custom logic
  return resolve(event);
};
```

---

## `$auth/client`

The Better-Auth browser client — **safe to import in components and `+page.ts`.**

```ts
import { authClient } from '$auth/client';
```

### Methods

```ts
// Sign in
await authClient.signIn.email({ email, password });
await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' });

// Sign up
await authClient.signUp.email({ email, password, name });

// Sign out
await authClient.signOut();

// Reactive session store
const session = authClient.useSession();
// $session.data?.user
// $session.data?.session
// $session.isPending
// $session.error

// Change password
await authClient.changePassword({ currentPassword, newPassword });

// Update user
await authClient.updateUser({ name: 'New Name' });
```
