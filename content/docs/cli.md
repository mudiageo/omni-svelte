---
title: CLI Reference
description: Documentation for the OmniSvelte Command Line Interface (CLI)
---

# CLI Reference

The \`omni\` command-line interface provides tools to bootstrap, configure, and maintain your OmniSvelte project.

## Installation

You can run the CLI directly using your preferred package manager:

\`\`\`bash
npx omni <command>
# or
pnpm dlx omni <command>
\`\`\`

## Commands

### \`init [name]\`

Scaffolds a new OmniSvelte-ready SvelteKit application.

**Options:**
- \`--cwd <path>\`: Create the project from a different directory.
- \`--skip-install\`: Skip final dependency installation.
- \`--package-manager <name>\`: Force package manager (npm|pnpm|yarn|bun).
- \`--omni-pkg <package>\`: Install omni-svelte from a specific package/path (useful for local testing).

### \`add\`

Adds OmniSvelte to an existing SvelteKit project.

**Options:**
- \`--cwd <path>\`: Target project directory.
- \`-D, --dev\`: Install as a dev dependency.
- \`--omni-pkg <package>\`: Install omni-svelte from a specific package/path.

### \`generate [type] [name]\` (alias: \`g\`)

Generates schema or migration files. If no arguments are provided, it falls back to an interactive prompt.

**Options:**
- \`-o, --output <path>\`: Custom output directory.
- \`-f, --force\`: Overwrite existing output files.
- \`--cwd <path>\`: Working directory.
- \`--schema-mode <mode>\`: Override \`OmniConfig.schema.mode\`.
- \`--schema-output-dir <dir>\`: Override \`OmniConfig.schema.output.directory\`.

### \`db [action]\`

Runs Drizzle database tasks such as pushing schemas, pulling, generating, migrating, and seeding.

**Options:**
- \`--config <path>\`: Path to drizzle config file.
- \`--script <name>\`: Script name for the db seed task (default: \`db:seed\`).
- \`--cwd <path>\`: Working directory.
- \`--db-url <url>\`: Override database connection URL.

### \`migrate [action]\`

Runs migrations with safe defaults.

**Options:**
- \`--cwd <path>\`: Working directory.
- \`--config <path>\`: Path to drizzle config file.
- \`--db-url <url>\`: Override database connection URL.

### \`ui [action] [components...]\`

Runs \`shadcn-svelte\` init/add flows from Omni.

**Options:**
- \`--cwd <path>\`: Working directory.
- \`-y, --yes\`: Skip interactive prompts in the shadcn CLI.

### \`doctor\`

Runs project health checks and detects the package manager.

**Options:**
- \`--cwd <path>\`: Working directory.

### \`install-dependency <packages...>\` (alias: \`installdependency\`)

Installs one or more dependencies using the automatically detected package manager.

**Options:**
- \`--cwd <path>\`: Working directory.
- \`-D, --dev\`: Install as dev dependencies.

## Utility Commands

- \`omni serve\`: Run local development server.
- \`omni build\`: Build the project.
- \`omni test\`: Run test suite.
- \`omni lint\`: Run lint checks.
- \`omni format\`: Format project files.

## Planned Commands

The following commands are currently planned for future releases:
- \`tinker\`: Interactive REPL with models pre-loaded.
- \`deploy\`: Deployment helper.
- \`docs:generate\`: Generate API docs from schema + JSDoc.
- \`docs:serve\`: Serve generated docs locally.
- \`debug:routes\`, \`debug:models\`, \`debug:permissions\`, \`debug:config\`: Diagnostic commands.
- \`build:production\`: Optimized production build.
- \`monitor:queries\`, \`monitor:realtime\`: System monitoring commands.
- \`cache:clear\`, \`cache:stats\`: Cache management tools.
