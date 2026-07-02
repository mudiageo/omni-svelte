---
title: OAuth Providers
description: Add social login with Google, GitHub, Discord, and other OAuth providers via Better-Auth.
section: Authentication
order: 3
---

# OAuth Providers

OmniSvelte exposes Better-Auth's social sign-in through the same `$auth/client` and `$auth/server` virtual modules.

## Configuration

Add your provider credentials to `svelte.config.js` and set the corresponding env variables:

```js
// svelte.config.js
omni: {
  auth: {
    enabled: true,
    secret: process.env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      },
      github: {
        clientId:     process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      },
      discord: {
        clientId:     process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET
      }
    }
  }
}
```

## Sign in with a provider

```ts
import { authClient } from '$auth/client';

// Redirect-based — most common
await authClient.signIn.social({
  provider:    'google',
  callbackURL: '/dashboard'
});

// With error handling
const { data, error } = await authClient.signIn.social({
  provider:    'github',
  callbackURL: '/dashboard',
  errorCallbackURL: '/error'
});
```

## Supported providers

Better-Auth supports a wide range of providers. Add any of these to `socialProviders`:

| Key | Provider |
|---|---|
| `google` | Google |
| `github` | GitHub |
| `discord` | Discord |
| `twitter` | Twitter / X |
| `microsoft` | Microsoft |
| `apple` | Apple |
| `linkedin` | LinkedIn |
| `spotify` | Spotify |
| `twitch` | Twitch |

## Callback URL

Better-Auth registers `/api/auth/callback/:provider` automatically. Add your callback URL to each provider's OAuth app:

```
http://localhost:5173/api/auth/callback/google
http://localhost:5173/api/auth/callback/github
```

## Linking accounts

If a user signs up with email and later signs in with Google using the same address, Better-Auth links the accounts automatically.
