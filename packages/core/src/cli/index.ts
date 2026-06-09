#!/usr/bin/env node

import { cancel, intro, isCancel, outro, select } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import { readFileSync } from 'fs';
import { handleAddCommand } from './commands/add.js';
import { handleDbCommand } from './commands/db.js';
import { handleDevCommand } from './commands/dev.js';
import { handleDoctorCommand } from './commands/doctor.js';
import { handleGenerateCommand } from './commands/generate.js';
import { handleInitCommand } from './commands/init.js';
import { handleInstallDependencyCommand } from './commands/install-dependency.js';
import { handleMigrateCommand } from './commands/migrate.js';
import { handleUiCommand } from './commands/ui.js';

/**
 * OmniSvelte CLI entry point.
 * This file configures the Commander.js program and its subcommands.
 */
const program = new Command();

program
	.name('omni')
	.description(
		'OmniSvelte CLI for scaffolding, database workflows, and DX tooling for the OmniSvelte full-stack framework'
	)
	.version(getCliVersion(), '-v, --version', 'Show installed CLI version')
	.showSuggestionAfterError(true)
	.showHelpAfterError('(run with --help for usage examples)');

program.configureHelp({
	sortSubcommands: true,
	subcommandTerm: (command) => `${command.name()} ${command.usage()}`
});

program.addHelpText(
	'after',
	`${pc.bold('\nExamples:')}
  $ omni init my-app
  $ omni add --cwd .
  $ omni generate schema users --output src/lib/db/schemas
  $ omni db push --config drizzle.config.ts
  $ omni install-dependency zod commander
  $ omni doctor
`
);

program
	.command('init [name]')
	.description('Scaffold a new OmniSvelte-ready SvelteKit app')
	.option('--cwd <path>', 'Create the project from a different directory')
	.option('--skip-install', 'Skip final dependency installation', false)
	.option('--package-manager <name>', 'Force package manager (npm|pnpm|yarn|bun|deno|vp)')
	.option('--omni-pkg <package>', 'Install omni-svelte from a specific package/path (for testing)')
	.action(async (name, options) => {
		await runAction(() =>
			handleInitCommand({
				name,
				cwd: options.cwd,
				skipInstall: options.skipInstall,
				omniPkg: options.omniPkg,
				packageManager: options.packageManager
			})
		);
	});

program
	.command('add')
	.description('Add OmniSvelte to an existing SvelteKit project')
	.option('--cwd <path>', 'Target project directory', process.cwd())
	.option('-D, --dev', 'Install as a dev dependency', false)
	.option('--package-manager <name>', 'Force package manager (npm|pnpm|yarn|bun|deno|vp)')
	.option('--omni-pkg <package>', 'Install omni-svelte from a specific package/path (for testing)')
	.action(async (options) => {
		await runAction(() =>
			handleAddCommand({
				cwd: options.cwd,
				dev: options.dev,
				omniPkg: options.omniPkg,
				packageManager: options.packageManager
			})
		);
	});

program
	.command('generate [type] [name]')
	.alias('g')
	.description('Generate schema and migration files with interactive fallback')
	.option('-o, --output <path>', 'Custom output directory')
	.option('-f, --force', 'Overwrite existing output files', false)
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('--schema-mode <mode>', 'Override OmniConfig.schema.mode')
	.option('--schema-output-dir <dir>', 'Override OmniConfig.schema.output.directory')
	.action(async (type, name, options) => {
		await runAction(() =>
			handleGenerateCommand({
				type,
				name,
				output: options.output,
				force: options.force,
				cwd: options.cwd,
				schemaMode: options.schemaMode,
				schemaOutputDir: options.schemaOutputDir
			})
		);
	});

program
	.command('db [action]')
	.description('Run Drizzle database tasks (push, pull, generate, migrate, seed)')
	.option('--config <path>', 'Path to drizzle config file')
	.option('--script <name>', 'Script name for db seed task', 'db:seed')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('--db-url <url>', 'Override database connection URL')
	.action(async (action, options) => {
		const selectedAction = action ?? (await promptDbAction());
		if (!selectedAction) return;
		await runAction(() =>
			handleDbCommand({
				action: selectedAction,
				cwd: options.cwd,
				config: options.config,
				script: options.script,
				dbUrl: options.dbUrl
			})
		);
	});

program
	.command('migrate [action]')
	.description('Run migrations with safe defaults')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('--config <path>', 'Path to drizzle config file')
	.option('--db-url <url>', 'Override database connection URL')
	.action(async (action, options) => {
		await runAction(() =>
			handleMigrateCommand({
				action,
				cwd: options.cwd,
				config: options.config,
				dbUrl: options.dbUrl
			})
		);
	});

program
	.command('ui [action] [components...]')
	.description('Run shadcn-svelte init/add flows from omni')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('-y, --yes', 'Skip interactive prompts in shadcn CLI', false)
	.action(async (action, components, options) => {
		await runAction(() =>
			handleUiCommand({
				action,
				components,
				cwd: options.cwd,
				yes: options.yes
			})
		);
	});

program
	.command('doctor')
	.description('Run project health checks and detect package manager')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.action(async (options) => {
		await runAction(() => handleDoctorCommand({ cwd: options.cwd }));
	});

program
	.command('install-dependency <packages...>')
	.alias('installdependency')
	.description('Install one or more dependencies using detected package manager')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('-D, --dev', 'Install as dev dependencies', false)
	.action(async (packages, options) => {
		await runAction(() =>
			handleInstallDependencyCommand({ packages, cwd: options.cwd, dev: options.dev })
		);
	});

program
	.command('tinker')
	.description('Interactive REPL with models pre-loaded (planned)')
	.action(() => {
		console.log(pc.yellow('Tinker command is planned and coming soon.'));
	});

program
	.command('deploy')
	.description('Deployment helper (planned)')
	.option('--env <name>', 'Target environment')
	.action(() => {
		console.log(pc.yellow('Deploy command is planned and coming soon.'));
	});

program
	.command('docs:generate')
	.description('Generate API docs from schema + JSDoc (planned)')
	.action(() => {
		console.log(pc.yellow('Docs generate command is planned and coming soon.'));
	});

program
	.command('docs:serve')
	.description('Serve generated docs locally (planned)')
	.action(() => {
		console.log(pc.yellow('Docs serve command is planned and coming soon.'));
	});

program
	.command('debug:routes')
	.description('List all registered routes (planned)')
	.action(() => console.log(pc.yellow('Debug routes command is planned.')));

program
	.command('debug:models')
	.description('List all models and relationships (planned)')
	.action(() => console.log(pc.yellow('Debug models command is planned.')));

program
	.command('debug:permissions')
	.description('Show permission/role matrix (planned)')
	.action(() => console.log(pc.yellow('Debug permissions command is planned.')));

program
	.command('debug:config')
	.description('Show resolved omni config (planned)')
	.action(() => console.log(pc.yellow('Debug config command is planned.')));

program
	.command('cache:clear')
	.description('Clear application cache (planned)')
	.action(() => console.log(pc.yellow('Cache clear command is planned.')));

program
	.command('cache:stats')
	.description('Show cache statistics (planned)')
	.action(() => console.log(pc.yellow('Cache stats command is planned.')));

program
	.command('monitor:queries')
	.description('Show slow database queries (planned)')
	.action(() => console.log(pc.yellow('Monitor queries command is planned.')));

program
	.command('monitor:realtime')
	.description('Monitor active WebSocket connections (planned)')
	.action(() => console.log(pc.yellow('Monitor realtime command is planned.')));

program
	.command('build:production')
	.description('Optimized production build (planned)')
	.action(() => {
		console.log(pc.yellow('Optimized production build is planned.'));
	});

addDevAlias('serve', 'Run local development server', 'serve');
addDevAlias('build', 'Build the project', 'build');
addDevAlias('test', 'Run test suite', 'test');
addDevAlias('lint', 'Run lint checks', 'lint');
addDevAlias('format', 'Format project files', 'format');

main().catch((error) => {
	console.error(pc.red(error instanceof Error ? error.message : String(error)));
	process.exit(1);
});

/**
 * Main execution function for the CLI.
 * If no arguments are provided, it launches the interactive menu.
 */
async function main() {
	if (process.argv.length <= 2) {
		await showInteractiveMenu();
		return;
	}

	await program.parseAsync(process.argv);
}

/**
 * Displays an interactive selection menu for standard CLI commands
 * using @clack/prompts when the CLI is run without arguments.
 */
async function showInteractiveMenu() {
	intro(pc.bgBlue(pc.white(' OmniSvelte CLI ')));

	const action = await select({
		message: 'Select a command',
		options: [
			{ value: ['init'], label: 'init — Scaffold a new project' },
			{ value: ['add'], label: 'add — Add omni-svelte to current project' },
			{ value: ['generate'], label: 'generate — Create schema or migration' },
			{ value: ['db'], label: 'db — Run database workflows' },
			{ value: ['ui'], label: 'ui — Manage shadcn-svelte components' },
			{ value: ['doctor'], label: 'doctor — Verify project setup' },
			{ value: ['help'], label: 'help — Show complete command help' },
			{ value: ['exit'], label: 'exit' }
		]
	});

	if (isCancel(action) || (Array.isArray(action) && action[0] === 'exit')) {
		cancel('Operation cancelled');
		return;
	}

	await program.parseAsync(action as string[], { from: 'user' });
	outro(pc.green('Done'));
}

function addDevAlias(
	name: string,
	description: string,
	action: Parameters<typeof handleDevCommand>[0]['action']
) {
	program
		.command(name)
		.description(description)
		.allowUnknownOption(true)
		.option('--cwd <path>', 'Working directory', process.cwd())
		.argument('[scriptArgs...]', 'Forwarded script arguments')
		.action(async (scriptArgs: string[], options) => {
			await runAction(() => handleDevCommand({ action, cwd: options.cwd, scriptArgs }));
		});
}

async function promptDbAction() {
	const selected = await select({
		message: 'Select a database action',
		options: [
			{ value: 'seed', label: 'seed — Run seeder script' },
			{ value: 'push', label: 'push — Push schema to database' },
			{ value: 'pull', label: 'pull — Pull schema from database' },
			{ value: 'generate', label: 'generate — Generate migration files' },
			{ value: 'migrate', label: 'migrate — Run migrations' },
			{ value: 'check', label: 'check — Validate migration state' },
			{ value: 'studio', label: 'studio — Open Drizzle Studio' }
		]
	});

	if (isCancel(selected)) {
		cancel('Operation cancelled');
		return null;
	}

	return selected as 'seed' | 'studio' | 'push' | 'pull' | 'generate' | 'check' | 'migrate';
}

/**
 * Runs a given CLI action function and handles top-level error catching.
 * @param {() => Promise<void>} action The async action to execute.
 */
async function runAction(action: () => Promise<void>) {
	try {
		await action();
	} catch (error) {
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
		process.exitCode = 1;
	}
}

function getCliVersion() {
	const packageCandidates = [
		new URL('../../package.json', import.meta.url),
		new URL('../../../package.json', import.meta.url)
	];

	for (const filePath of packageCandidates) {
		try {
			const content = readFileSync(filePath, 'utf-8');
			const pkg = JSON.parse(content) as { version?: string };
			if (pkg.version) {
				return pkg.version;
			}
		} catch {
			continue;
		}
	}

	return '0.0.0';
}
