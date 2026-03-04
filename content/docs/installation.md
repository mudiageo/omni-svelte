---
title: Installation
description: Add omni-svelte to a new or existing SvelteKit project.
---

# Installation

## Prerequisites

- Node.js ≥ 18
- pnpm (recommended) or npm
- A SvelteKit project

## 1. Install the package

```bash
pnpm add omni-svelte
```

Or with npm:

```bash
npm install omni-svelte
```

## 2. Add the Vite plugin

Open `vite.config.ts` and replace the default sveltekit plugin with `omniSvelte`:

```ts
// vite.config.ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [omniSvelte()]
});
```

This replaces `sveltekit()` — `omniSvelte()` includes it internally.

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
      secret: process.env.BETTER_AUTH_SECRET
    }
  }
};

export default config;
```

## 4. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/mydb
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:5173
```

## 5. Start the dev server

```bash
pnpm dev
```

omni-svelte will generate your hooks, schema, and auth config on first start.
