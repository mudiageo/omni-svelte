---
title: Configuration
description: Full reference for the omni config block in svelte.config.js.
---

# Configuration

All omni-svelte options live under the `omni` key in `svelte.config.js`. This page covers every available option.

## Top-level shape

```ts
omni: {
  database?: DatabaseConfig;
  schema?:   SchemaConfig;
  auth?:     AuthConfig;
  logging?:  { enabled: boolean };
  cors?:     { enabled: boolean };
  analytics?: { enabled: boolean };
  errorReporting?: { enabled: boolean };
}
```

---

## `database`

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Enable the database integration |
| `connection.url` | `string` | — | PostgreSQL connection string |
| `schema` | `string \| null` | `null` | Path to a custom Drizzle schema file |

---

## `schema`

Controls how omni-svelte discovers and generates code from your `.schema.ts` files.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'files'` | `'files'` | Currently only `files` is supported |
| `input.patterns` | `string[]` | — | Glob patterns to discover schema files |
| `input.exclude` | `string[]` | — | Glob patterns to exclude |
| `output.drizzle.path` | `string` | — | Output path for the generated Drizzle schema |
| `output.zod.path` | `string` | — | Output path for generated Zod validators |
| `output.model.path` | `string` | — | Output path for typed model classes |
| `dev.watch` | `boolean` | `true` | Watch schema files for changes |
| `dev.generateOnStart` | `boolean` | `true` | Generate on dev server start |

---

## `auth`

Configures [Better-Auth](https://better-auth.com).

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Enable auth integration |
| `secret` | `string` | — | Secret key for signing sessions |
| `baseURL` | `string` | `http://localhost:5173` | Public URL of your app |
| `basePath` | `string` | `/api/auth` | Auth API route prefix |
| `emailAndPassword.enabled` | `boolean` | `true` | Enable email + password auth |
| `session.expiresIn` | `number` | `604800` | Session lifetime in seconds (7 days) |
| `plugins.username` | `boolean` | `false` | Enable username plugin |
| `plugins.magicLink` | `boolean` | `false` | Enable magic link plugin |
| `plugins.twoFactor` | `boolean` | `false` | Enable 2FA plugin |
| `plugins.passkey` | `boolean` | `false` | Enable passkey plugin |
