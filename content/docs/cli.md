---
title: CLI Reference
description: Documentation for the OmniSvelte Command Line Interface (CLI)
---

# CLI Reference

The `omni` command-line interface provides tools to bootstrap, configure, generate code, and manage database workflows for your OmniSvelte project.

## Installation

You can run the CLI directly using your preferred package manager:

```bash
npx omni <command>
# or
pnpm dlx omni <command>
```

Or install it globally:

```bash
pnpm install -g omni-svelte
omni <command>
```

## Interactive Mode

Running `omni` with no arguments launches an interactive selection menu powered by `@clack/prompts`:

```bash
omni
```

## Commands

### `init [name]`

Scaffolds a new OmniSvelte-ready SvelteKit application.

```bash
omni init my-app
```

**Options:**
- `--cwd <path>`: Create the project from a different directory.
- `--skip-install`: Skip final dependency installation.
- `--package-manager <name>`: Force a specific package manager (`npm` | `pnpm` | `yarn` | `bun`).
- `--omni-pkg <package>`: Install omni-svelte from a specific package or local path (useful for local testing).

---

### `add`

Adds OmniSvelte to an existing SvelteKit project. Installs the `omni-svelte` package and patches `vite.config.ts` automatically.

```bash
omni add
omni add --cwd ./my-app
```

**Options:**
- `--cwd <path>`: Target project directory (defaults to current directory).
- `-D, --dev`: Install as a dev dependency.
- `--omni-pkg <package>`: Install omni-svelte from a specific package or local path.

---

### `generate [type] [name]` (alias: `g`)

Generates schema or migration files. Falls back to an interactive prompt when arguments are omitted.

```bash
omni generate schema users
omni g migration add_posts_table --output src/lib/db/migrations
```

**Types:**
- `schema` — Generates a `defineSchema` file in `src/lib/db/schemas/`.
- `migration` — Generates a timestamped migration stub in `migrations/`.
- `resource` _(planned)_ — Full CRUD resource scaffold.
- `auth-page` _(planned)_ — Authentication page scaffold.
- `email` _(planned)_ — Email template scaffold.

**Options:**
- `-o, --output <path>`: Custom output directory (relative to `--cwd`).
- `-f, --force`: Overwrite existing output files.
- `--cwd <path>`: Working directory (defaults to current directory).
- `--schema-mode <mode>`: Override `OmniConfig.schema.mode`.
- `--schema-output-dir <dir>`: Override `OmniConfig.schema.output.directory`.

---

### `db [action]`

Runs Drizzle database tasks. Prompts interactively when no action is provided.

```bash
omni db push
omni db seed --script db:seed
omni db studio --config drizzle.config.ts
```

**Actions:**
- `push` — Push schema to the database without a migration file.
- `pull` — Pull the existing schema from the database.
- `generate` — Generate Drizzle migration files.
- `migrate` — Run pending migrations via `drizzle-kit migrate`.
- `check` — Validate migration state.
- `studio` — Open Drizzle Studio.
- `seed` — Run the database seed script.

**Options:**
- `--config <path>`: Path to the drizzle config file.
- `--script <name>`: Script name for the `seed` task (default: `db:seed`).
- `--cwd <path>`: Working directory.
- `--db-url <url>`: Override the database connection URL (sets `DATABASE_URL`).

---

### `migrate [action]`

Runs migrations with safe defaults via `drizzle-kit migrate`.

```bash
omni migrate
omni migrate rollback
omni migrate fresh
```

**Actions:**
- _(no action)_ / `up` — Run pending migrations (default).
- `rollback` — Prints rollback guidance (manual process).
- `fresh` — Prints fresh-reset guidance (manual process).

**Options:**
- `--cwd <path>`: Working directory.
- `--config <path>`: Path to the drizzle config file.
- `--db-url <url>`: Override the database connection URL.

---

### `ui [action] [components...]`

Runs `shadcn-svelte` init or add flows from Omni. Prompts interactively when no action is given.

```bash
omni ui init
omni ui add button card dialog
omni ui add --yes
```

**Actions:**
- `init` — Initialize shadcn-svelte in the project.
- `add [components...]` — Add one or more shadcn-svelte components.

**Options:**
- `--cwd <path>`: Working directory.
- `-y, --yes`: Skip interactive prompts in the shadcn CLI.

---

### `doctor`

Runs project health checks and detects the package manager. Reports whether `package.json`, `vite.config.ts`, `svelte.config.js`, and the `.omni` directory are present.

```bash
omni doctor
```

**Options:**
- `--cwd <path>`: Working directory.

---

### `install-dependency <packages...>` (alias: `installdependency`)

Installs one or more dependencies using the automatically detected package manager.

```bash
omni install-dependency zod
omni install-dependency vitest @testing-library/svelte -D
```

**Options:**
- `--cwd <path>`: Working directory.
- `-D, --dev`: Install as dev dependencies.

---

## Dev Script Aliases

The following commands proxy to your project's package manager scripts, forwarding any extra arguments:

| Command | Equivalent |
|---|---|
| `omni serve` | `<pm> run dev` |
| `omni build` | `<pm> run build` |
| `omni test` | `<pm> run test` |
| `omni lint` | `<pm> run lint` |
| `omni format` | `<pm> run format` |

All accept:
- `--cwd <path>`: Working directory.
- Any extra positional arguments are forwarded to the underlying script.

```bash
omni test --reporter=verbose
omni build --mode production
```

---

## Global Options

| Option | Description |
|---|---|
| `-v, --version` | Show installed CLI version |
| `--help` | Show help for any command |

Running any command with an unknown option shows a suggestion:

```bash
omni init --hlep
# error: unknown option '--hlep'
# (Did you mean --help?)
```

---

## Planned Commands

The following commands are registered as stubs and will be implemented in upcoming releases:

| Command | Description |
|---|---|
| `omni tinker` | Interactive REPL with models pre-loaded |
| `omni deploy [--env <name>]` | Deployment helper |
| `omni docs:generate` | Generate API docs from schema + JSDoc |
| `omni docs:serve` | Serve generated docs locally |
| `omni debug:routes` | List all registered routes |
| `omni debug:models` | List all models and relationships |
| `omni debug:permissions` | Show permission/role matrix |
| `omni debug:config` | Show resolved omni config |
| `omni cache:clear` | Clear application cache |
| `omni cache:stats` | Show cache statistics |
| `omni monitor:queries` | Show slow database queries |
| `omni monitor:realtime` | Monitor active WebSocket connections |
| `omni build:production` | Optimized production build |
| `omni serve --with-admin` | Dev server + admin panel |
| `omni serve --realtime` | Dev server with WebSocket support |
