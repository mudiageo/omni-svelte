---
title: vite.config.ts
description: Full reference for the omniSvelte plugin configuration in vite.config.ts.
section: Configuration
order: 1
---

# Configuration

All OmniSvelte options are passed to the `omniSvelte()` plugin in `vite.config.ts`. This page covers every available option. Standard SvelteKit config options can still be passed under the `kit` property.

## Top-level shape

```ts
omniSvelte({
  kit?:            KitConfig; // standard SvelteKit options
  database?:       DatabaseConfig;
  schema?:         SchemaConfig;
  auth?:           AuthConfig;
  logging?:        { enabled: boolean };
  cors?:           { enabled: boolean };
  analytics?:      { enabled: boolean };
  errorReporting?: { enabled: boolean };
})
```

---

## `database`

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Enable the database integration |
| `connection.url` | `string` | — | PostgreSQL connection string |
| `schema` | `string \| null` | `null` | Path to a custom Drizzle schema file |

```js
omniSvelte({
  database: {
    enabled: true,
    connection: { url: process.env.DATABASE_URL }
  }
})
```

---

## `schema`

Controls how OmniSvelte discovers and generates code from your `.schema.ts` files.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'files'` | `'files'` | Currently only `files` mode is supported |
| `input.patterns` | `string[]` | `['src/**/*.schema.ts']` | Glob patterns to discover schema files |
| `input.exclude` | `string[]` | `[]` | Glob patterns to exclude |
| `output.drizzle.path` | `string` | `'src/lib/db/server/schema.ts'` | Output path for the Drizzle schema |
| `output.zod.path` | `string` | `'src/lib/db/validation'` | Output path for Zod validators |
| `output.model.path` | `string` | `'src/lib/db/models'` | Output path for typed model classes |
| `dev.watch` | `boolean` | `true` | Watch schema files for changes |
| `dev.generateOnStart` | `boolean` | `true` | Generate on dev server start |

```js
omniSvelte({
  schema: {
    input:  { patterns: ['src/**/*.schema.ts'] },
    output: {
      drizzle: { path: 'src/lib/db/server/schema.ts', format: 'single-file' },
      zod:     { path: 'src/lib/db/validation',       format: 'per-schema'  },
      model:   { path: 'src/lib/db/models',           format: 'per-schema'  }
    },
    dev: { watch: true, generateOnStart: true }
  }
})
```

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

```js
omniSvelte({
  auth: {
    enabled: true,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    plugins: {
      magicLink: true,
      twoFactor: true
    }
  }
})
```

---

## Full example

```js
// vite.config.ts
import { defineConfig } from 'vite';
import { omniSvelte } from 'omni-svelte/vite';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    omniSvelte({
      preprocess: vitePreprocess(),
      kit: { adapter: adapter() },
      database: {
        enabled: true,
        connection: { url: process.env.DATABASE_URL }
      },
      schema: {
        input:  { patterns: ['src/**/*.schema.ts'] },
        output: {
          drizzle: { path: 'src/lib/db/server/schema.ts', format: 'single-file' },
          zod:     { path: 'src/lib/db/validation',       format: 'per-schema'  },
          model:   { path: 'src/lib/db/models',           format: 'per-schema'  }
        }
      },
      auth: {
        enabled: true,
        secret: process.env.BETTER_AUTH_SECRET,
        emailAndPassword: { enabled: true }
      }
    })
  ]
});
```
