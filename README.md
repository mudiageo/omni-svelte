# omni-svelte monorepo

A monorepo containing:

| Package                | Location           | Description                                                 |
| ---------------------- | ------------------ | ----------------------------------------------------------- |
| `omni-svelte`          | `packages/core`    | Core library (database, auth, schema, vite plugin, plugins) |
| `@omni-svelte/shared`  | `packages/shared`  | Shared types and utilities                                  |
| `@omni-svelte/plugins` | `packages/plugins` | Standalone plugin package (future)                          |
| `playground`           | `apps/playground`  | Dev sandbox / demo app                                      |
| `docs`                 | `apps/docs`        | Documentation site                                          |

## Getting started

```bash
# Install all workspace dependencies
pnpm install

# Start the playground (dev sandbox)
pnpm dev

# Start the docs site
pnpm dev:docs

# Build all publishable packages
pnpm build
```

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# 1. Add a changeset after making changes
pnpm changeset

# 2. Version packages (done automatically via GitHub Actions)
pnpm version

# 3. Publish to npm (done automatically via GitHub Actions)
pnpm release
```

You'll need to add an `NPM_TOKEN` secret to your GitHub repo for the release workflow to publish to npm.

## Roadmap

The full strategic roadmap for OmniSvelte, detailing our path to v1.0 and beyond (including upcoming AI primitives, local-first support, and business logic tools), can be found in [packages/core/ROADMAP.md](./packages/core/ROADMAP.md) and on the [docs site roadmap page](https://omni-svelte.dev/docs/roadmap).

## Documentation

Markdown source lives in `content/docs/`. The docs site at `apps/docs/` renders it via [mdsvex](https://mdsvex.pngwn.io/).
