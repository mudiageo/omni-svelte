---
title: Installation
description: Add omni-svelte to a new or existing SvelteKit project using the CLI or manually.
---

# Installation

## Prerequisites

- Node.js ≥ 18
- pnpm, npm, yarn, or bun
- A SvelteKit project (for existing projects) or none at all (for new projects)

---

## New project

The fastest way to scaffold a brand-new OmniSvelte app:

```bash
npx omni init my-app
cd my-app
```

This runs `sv create` under the hood (with TypeScript and Tailwind), installs `omni-svelte`, and wires up the Vite plugin automatically.

---

## Add to an existing SvelteKit project

Run `omni add` from the root of your project:

```bash
npx omni add
```

This installs `omni-svelte` and patches `vite.config.ts` to include the `omniSvelte()` plugin automatically.

---

## Configure omni-svelte

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

---

## Set environment variables

Create a `.env` file at your project root:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/mydb
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:5173
```

---

## Start the dev server

```bash
pnpm dev
# or: omni serve
```

omni-svelte generates your hooks, schema, and auth config on first start.

---

## Manual installation (optional)

If you prefer not to use the CLI, you can install and configure everything by hand.

**1. Install the package**

```bash
pnpm add omni-svelte
# or: npm install omni-svelte
```

**2. Add the Vite plugin**

Open `vite.config.ts` and add the `omni` plugin:

```ts
// vite.config.ts
import { omniSvelte } from 'omni-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [omniSvelte()]
});
```

> `omniSvelte()` includes `sveltekit()` internally — no need to add it separately.

**3. Continue from the [Configure omni-svelte](#configure-omni-svelte) step above.**
