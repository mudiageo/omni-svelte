# Contributing to omni-svelte

Thank you for your interest in contributing! This document covers how to get set up, the development workflow, and guidelines for submitting changes.

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 9
- A PostgreSQL instance (for playground testing)

## Setup

```bash
git clone https://github.com/mudiageo/omni-svelte
cd omni-svelte
pnpm install
cp apps/playground/.env.example apps/playground/.env
# Fill in DATABASE_URL and BETTER_AUTH_SECRET in apps/playground/.env
```

## Repo structure

See [AGENTS.md](./AGENTS.md) for a detailed map of every package, its responsibilities, and how they fit together.

| Location | Package | Purpose |
|---|---|---|
| `packages/core` | `omni-svelte` | Core library — the main npm package |
| `packages/shared` | `@omni-svelte/shared` | Shared types and utilities |
| `packages/plugins` | `@omni-svelte/plugins` | Standalone plugin package |
| `apps/playground` | `playground` | Dev sandbox for manual testing |
| `apps/docs` | `docs` | Documentation site |
| `content/docs/` | — | Markdown source for the docs site |

## Development

```bash
# Start the dev sandbox (hot-reloads playground + core changes)
pnpm dev

# Start the docs site
pnpm dev:docs

# Run all tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

## Testing your integration

### 1. Unit tests

Run the core package unit test suite (no database required):

```bash
cd packages/core
pnpm vitest run --reporter=verbose
```

Tests live in `packages/core/src/tests/unit/`. The suite covers the schema parser, code generators (`DrizzleGenerator`, `ZodGenerator`, `ModelGenerator`), the `field.*` builder API, and the Vite virtual-module plugin.

### 2. Type-checking

Verify the entire monorepo compiles cleanly:

```bash
# Core package
cd packages/core && pnpm tsc --noEmit

# Playground app
cd apps/playground && pnpm tsc --noEmit
```

### 3. Playground smoke test

The playground is the manual integration sandbox — it uses the real Vite plugin, schema generation, and (optionally) a live database.

```bash
# Copy env file and add your DATABASE_URL
cp apps/playground/.env.example apps/playground/.env

# Start the dev server
pnpm dev
# → http://localhost:5173
```

On first start, omni-svelte:
- Discovers `*.schema.ts` files
- Generates `src/lib/db/server/schema.ts`, `src/lib/db/validation/`, `src/lib/db/models/`
- Writes `src/omni-env.d.ts` (ambient type declarations)
- Runs pending database migrations (if a `DATABASE_URL` is set)

If you only want to test schema code-generation without a database, skip the `DATABASE_URL` — the generator still runs, migrations are simply skipped.


## Making changes

### Code changes

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes in the appropriate package under `packages/` or `apps/`.
3. Add tests if applicable.
4. Run `pnpm lint && pnpm test` to verify.

### Adding a doc page

1. Create `content/docs/<slug>.md` with the following frontmatter:
   ```md
   ---
   title: My Page
   description: Short description.
   ---
   ```
2. Add the slug to `apps/docs/src/lib/nav.ts` under the correct section.

### Adding a plugin stub

1. Create `packages/core/src/plugins/<name>/index.ts` following the pattern in `logging/index.ts`.
2. Export the plugin from `packages/core/src/plugins/index.ts`.
3. Add an export entry in `packages/core/package.json` under `exports`.

## Submitting changes

### Pull Requests

- Target the `main` branch.
- Keep PRs focused — one feature or fix per PR.
- Write a clear description of **what** and **why**, not just **how**.
- Add a changeset (see below).

### Changeset (required for publishable package changes)

If your change affects `packages/core`, `packages/shared`, or `packages/plugins`:

```bash
pnpm changeset
```

Follow the interactive prompts to select the affected packages and write a changelog entry. The CI workflow will remind you if this is missing.

## Release process

Releases are fully automated via [Changesets](https://github.com/changesets/changesets) and GitHub Actions:

1. Changesets from merged PRs accumulate on `main`.
2. The release workflow opens a **"Version Packages"** PR.
3. When that PR is merged, all changed packages are published to npm.

Maintainers handle releases — contributors only need to add a changeset to their PR.

## Code style

- TypeScript everywhere (strict mode).
- Prettier + ESLint — run `pnpm format` before committing.
- No `any` unless unavoidable — prefer `unknown` with type guards.
- Prefer `async/await` over raw Promises.

## Questions?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) or file an issue.

---

Built with ❤️ by the OmniSvelte team.
