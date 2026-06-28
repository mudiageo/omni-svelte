---
title: Installation
description: Add omni-svelte to a new or existing SvelteKit project.
section: Getting Started
order: 2
---

# Installation

## Prerequisites

- Node.js ≥ 18
- pnpm (recommended) or npm
- A SvelteKit project (or create one with `pnpm create svelte@latest`)

## 1. Install the package

```bash
pnpm add omni-svelte
```

## 2. Add the Vite plugin

Open `vite.config.ts` and replace the default `sveltekit()` plugin with `omniSvelte()`:

```ts
// vite.config.ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [omniSvelte()]
});
```

> `omniSvelte()` includes `sveltekit()` internally — you don't need both.

## 3. Configure in svelte.config.js

Add an `omni` key to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
  omni: {
    database: {
      enabled: true,
      connection: { url: process.env.DATABASE_URL }
    },
    auth: {
      enabled: true,
      secret: process.env.BETTER_AUTH_SECRET,
      emailAndPassword: { enabled: true }
    }
  }
};

export default config;
```

## 4. Set environment variables

```env
DATABASE_URL=postgres://user:password@localhost:5432/mydb
BETTER_AUTH_SECRET=your-long-random-secret
BETTER_AUTH_URL=http://localhost:5173
```

## 5. Start the dev server

```bash
pnpm dev
```

On first start, OmniSvelte generates your hooks, schema, auth config, and the `src/omni-env.d.ts` ambient type declarations.

## Verifying the setup

You should see output like:

```
[omni-svelte] ✓ Database connected
[omni-svelte] ✓ Auth configured
[omni-svelte] ✓ Watching 0 schema files
[omni-svelte] ✓ Ready
```

Create a `.schema.ts` file and watch OmniSvelte generate your types on save.
