---
title: Email & Password
description: Configure email and password authentication with Better-Auth in OmniSvelte.
section: Authentication
order: 2
---

# Email & Password

Email/password is the default authentication strategy and is enabled by setting `emailAndPassword.enabled: true` in your `omni.auth` config.

## Configuration

```js
// svelte.config.js
omni: {
  auth: {
    enabled: true,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled:      true,
      autoSignIn:   true,    // sign in immediately after sign up
      requireEmailVerification: false
    },
    session: {
      expiresIn:          60 * 60 * 24 * 7,  // 7 days
      updateAge:          60 * 60 * 24,       // refresh if >1 day old
      cookieCache: { enabled: true, maxAge: 60 * 5 }
    }
  }
}
```

## Sign up

```ts
import { authClient } from '$auth/client';

const { data, error } = await authClient.signUp.email({
  email:    'user@example.com',
  password: 'SecurePass123!',
  name:     'Alice'
});

if (error) console.error(error.message);
else console.log('Signed up:', data.user.id);
```

## Sign in

```ts
const { data, error } = await authClient.signIn.email({
  email:      'user@example.com',
  password:   'SecurePass123!',
  rememberMe: true
});
```

## Sign out

```ts
await authClient.signOut();
```

## Get session (client)

```ts
// Reactive — returns a Svelte store
const session = authClient.useSession();

// $session.data.user — the user object
// $session.data.session — the session object
// $session.isPending — true while loading
```

## Get session (server)

```ts
// +page.server.ts
import { auth } from '$auth/server';

export async function load({ request }) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  return { user: session?.user ?? null };
}
```

## Change password

```ts
await authClient.changePassword({
  currentPassword: 'OldPass123!',
  newPassword:     'NewPass456!'
});
```

## Forgot password

```ts
await authClient.forgetPassword({
  email:       'user@example.com',
  redirectTo:  '/reset-password'
});
```

## Reset password

```ts
await authClient.resetPassword({
  newPassword: 'NewPass456!',
  token:       searchParams.get('token')!
});
```

## User schema

Better-Auth automatically creates the following tables when you run `pnpm db:push`:

```
users       — id, name, email, emailVerified, image, createdAt, updatedAt
sessions    — id, userId, token, expiresAt, ipAddress, userAgent
accounts    — id, userId, provider, providerAccountId, ...
verifications — id, identifier, value, expiresAt
```
