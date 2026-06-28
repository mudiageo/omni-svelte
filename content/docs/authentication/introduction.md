---
title: Authentication
description: OmniSvelte integrates Better-Auth and wires it into your SvelteKit hooks automatically via the omni.auth config block.
section: Authentication
order: 1
---

# Authentication

OmniSvelte uses [Better-Auth](https://better-auth.com) and wires it into your SvelteKit app automatically. Enable it in `svelte.config.js` and the framework generates your auth handler, injects it into your hooks, and exposes `$auth/server` and `$auth/client` virtual modules.

## Setup

```js
// svelte.config.js
omni: {
  auth: {
    enabled: true,
    secret:  process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    plugins: {
      magicLink:  false,
      twoFactor:  false,
      passkey:    false,
      username:   false
    }
  }
}
```

OmniSvelte auto-generates `src/lib/server/auth.ts` and injects the handler into `hooks.server.ts`.

## Environment variables

```env
BETTER_AUTH_SECRET=your-long-random-secret
BETTER_AUTH_URL=http://localhost:5173
```

## Server usage

```ts
// +page.server.ts or hooks.server.ts
import { auth } from '$auth/server';

// Get session
const session = await auth.api.getSession({ headers: request.headers });

// session.user — the authenticated user
// session.session — raw session object
```

## Client usage

```ts
// +page.svelte
import { authClient } from '$auth/client';

// Sign in
await authClient.signIn.email({ email, password });

// Sign up
await authClient.signUp.email({ email, password, name });

// Sign out
await authClient.signOut();

// Get session reactively
const session = authClient.useSession();
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

## Auth API routes

Auth routes are automatically registered at `/api/auth/**`. Better-Auth handles:

- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-out`
- `GET  /api/auth/session`
- OAuth callbacks (when configured)

## Supported strategies

| Strategy | Config key | Notes |
|---|---|---|
| Email + password | `emailAndPassword.enabled` | Enabled by default |
| Magic link | `plugins.magicLink` | Passwordless email |
| Two-factor (TOTP) | `plugins.twoFactor` | Works with any strategy |
| Passkeys | `plugins.passkey` | WebAuthn |
| Username | `plugins.username` | Add username to email flow |
| OAuth | Social providers via Better-Auth config | Google, GitHub, etc. |
