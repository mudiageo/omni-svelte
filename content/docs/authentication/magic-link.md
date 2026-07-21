---
title: Magic Link
description: Passwordless email authentication with Better-Auth's magic link plugin.
section: Authentication
order: 4
---

# Magic Link

Magic link lets users sign in without a password — they receive an email with a one-click login link.

## Enable

```js
omni: {
  auth: {
    plugins: { magicLink: true }
  }
}
```

Also configure an email provider (planned — see the [Email](/docs/planned/email) planned feature).

## Usage

```ts
import { authClient } from '$auth/client';

// Send magic link
await authClient.signIn.magicLink({
  email:       'user@example.com',
  callbackURL: '/dashboard'
});
```

The user clicks the link in their email and is automatically signed in.
