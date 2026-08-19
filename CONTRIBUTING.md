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

| Location           | Package                | Purpose                             |
| ------------------ | ---------------------- | ----------------------------------- |
| `packages/core`    | `omni-svelte`          | Core library — the main npm package |
| `packages/shared`  | `@omni-svelte/shared`  | Shared types and utilities          |
| `packages/plugins` | `@omni-svelte/plugins` | Standalone plugin package           |
| `apps/playground`  | `playground`           | Dev sandbox for manual testing      |
| `apps/docs`        | `docs`                 | Documentation site                  |
| `content/docs/`    | —                      | Markdown source for the docs site   |

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

### Maintainer Prerelease Workflow (Dual-Branch Strategy)

This documents the official maintainer workflow for developing a future version (e.g., `v0.3.0`) in a prerelease state, while keeping the `main` branch clean and available for regular stable patches.

**Overview**
- **`main`**: The default, stable branch. All releases from here are published to the `@latest` tag on npm.
- **`version-X`** (e.g., `version-0.3`): The dedicated prerelease branch. All releases from here are published to the `@next` tag on npm.

#### Phase 1: Starting a New Prerelease Cycle
When starting work on the next major/minor release, create a dedicated branch and configure it for prerelease mode.

1. **Create the branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b version-0.3
   ```

2. **Update the Changesets `baseBranch`**
   In `.changeset/config.json`, change `baseBranch` to your new branch. This ensures `pnpm changeset` calculates differences correctly for PRs targeting this branch instead of checking against `main`.
   ```diff
   - "baseBranch": "main"
   + "baseBranch": "version-0.3"
   ```

3. **Update GitHub Actions**
   In `.github/workflows/release.yml`, add the new branch so that the Changesets release action triggers when PRs are merged.
   ```diff
     on:
       push:
         branches:
           - main
   +       - version-0.3
   ```

4. **Enter Prerelease Mode**
   Run the CLI command to generate `.changeset/pre.json`:
   ```bash
   pnpm changeset pre enter next
   ```

5. **Commit and Push**
   ```bash
   git add .changeset/config.json .changeset/pre.json .github/workflows/release.yml
   git commit -m "chore: setup version-0.3 prerelease branch"
   git push -u origin version-0.3
   ```

#### Phase 2: Concurrent Development
With both branches active, maintainers can safely work on stable hotfixes and next-generation features simultaneously.

**Developing Stable Patches (Hotfixes)**
- **Target Branch**: `main`
- **Workflow**: 
  1. Branch from `main` -> Fix bug -> `pnpm changeset` -> Merge PR to `main`.
  2. The GitHub Action updates the automated **"Version Packages" PR**. 
  3. Merge the "Version Packages" PR to publish the standard version (e.g., `0.0.2` to `@latest`).

**Developing Next Features**
- **Target Branch**: `version-0.3`
- **Workflow**: 
  1. Branch from `version-0.3` -> Add feature -> `pnpm changeset` -> Merge PR to `version-0.3`.
  2. The GitHub Action updates the automated **"Version Packages" PR** with a `-next.x` suffix.
  3. Merge the "Version Packages" PR to publish the prerelease version (e.g., `0.3.0-next.0` to `@next`).

> **CRITICAL: Keeping Prerelease Updated**
> Whenever a hotfix is merged into `main`, you **must** bring those changes into the prerelease branch so `v0.3` doesn't regress.
> ```bash
> git checkout version-0.3
> git merge main
> git push origin version-0.3
> ```
> *(Do **not** merge `version-0.3` back into `main` until Phase 3!)*

#### Phase 3: Releasing to Stable
When `v0.3.0` is complete, tested, and ready for official release, exit prerelease mode and merge back to `main`.

1. **Revert Configurations**
   On the `version-0.3` branch, revert `baseBranch` back to `main` in `.changeset/config.json`.
   ```diff
   - "baseBranch": "version-0.3"
   + "baseBranch": "main"
   ```

2. **Exit Prerelease Mode**
   ```bash
   pnpm changeset pre exit
   ```
   *(This safely deletes `.changeset/pre.json` and stages the changesets for a final stable release)*

3. **Commit and Merge to Main**
   ```bash
   git add .changeset
   git commit -m "chore: exit prerelease mode"
   git push origin version-0.3
   ```
   Open a Pull Request on GitHub to merge `version-0.3` into `main`.

4. **Publish the Final Release**
   Once merged to `main`, the Changesets Action will run. Because it no longer detects `pre.json`, it will strip the `-next.x` suffix and create a final "Version Packages" PR for `0.3.0`.
   Merge that PR to publish `v0.3.0` to the `@latest` tag on npm!

#### Common Pitfalls & Warnings
* **Forgetting `baseBranch`:** If you forget to set `baseBranch: "version-0.3"` in Phase 1, the `pnpm changeset` CLI on developer machines will compare their changes against `main`. This can cause the CLI to wrongly assume they touched files they didn't, generating inaccurate changeset prompts.

## Code style

- TypeScript everywhere (strict mode).
- Prettier + ESLint — run `pnpm format` before committing.
- No `any` unless unavoidable — prefer `unknown` with type guards.
- Prefer `async/await` over raw Promises.

## Questions?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) or file an issue.

---

Built with ❤️ by the OmniSvelte team.
