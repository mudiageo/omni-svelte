#!/usr/bin/env node
import mri from 'mri';
import { intro, outro, select, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { handleUiCommand } from './commands/ui.js';
import { handleGenerateCommand } from './commands/generate.js';
import { handleDbCommand } from './commands/db.js';
import { handleMigrateCommand } from './commands/migrate.js';
import { handleDevCommand } from './commands/dev.js';
import { handleInitCommand } from './commands/init.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
	const args = mri(process.argv.slice(2), {
		alias: { h: 'help', v: 'version' },
	});

	if (args.version) {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
		);
		console.log(`v${pkg.version}`);
		process.exit(0);
	}

	intro(pc.bgBlue(pc.white(' OmniSvelte CLI ')));

	const command = args._[0];

	if (!command) {
		await showMainMenu();
	} else {
		await routeCommand(command, args);
	}
}

async function showMainMenu() {
	const action = await select({
		message: 'What would you like to do?',
		options: [
			{ value: 'init', label: 'Initialize New Project' },
			{ value: 'generate', label: 'Generate Code (g)' },
			{ value: 'ui', label: 'Manage UI Components' },
			{ value: 'db', label: 'Database Operations' },
			{ value: 'migrate', label: 'Run Migrations' },
			{ value: 'realtime', label: 'Realtime & Jobs' },
			{ value: 'dev', label: 'Development Tools' },
			{ value: 'exit', label: 'Exit' },
		],
	});

	if (isCancel(action) || action === 'exit') {
		outro('Goodbye!');
		process.exit(0);
	}

	await routeCommand(action as string, { _: [action as string] });
}

async function routeCommand(command: string, args: mri.Argv) {
	try {
		switch (command) {
			case 'init':
				await handleInitCommand(args);
				break;
			case 'generate':
			case 'g':
				await handleGenerateCommand(args);
				break;
			case 'ui':
				await handleUiCommand(args);
				break;
			case 'db':
				await handleDbCommand(args);
				break;
			case 'migrate':
				await handleMigrateCommand(args);
				break;
			case 'realtime':
			case 'queue':
			case 'schedule':
				console.log(pc.yellow('Feature coming soon!'));
				break;
			case 'serve':
			case 'lint':
			case 'format':
			case 'test':
			case 'build':
			case 'dev':
				// If user typed 'omni serve', we map it to dev command handler with sub-command
				if (command !== 'dev') {
					// Hacky way to shift args for the handler if needed,
					// but our handlers mostly look at args._[1]
					// We might need to reconstruct args or just pass a flag
					args._ = ['dev', command, ...args._.slice(1)];
				}
				await handleDevCommand(args);
				break;
			case 'deploy':
			case 'monitor':
			case 'cache':
			case 'debug':
				console.log(pc.yellow('Advanced tool coming soon!'));
				break;
			case 'help':
				console.log('Help information');
				break;
			default:
				console.log(pc.red(`Unknown command: ${command}`));
				await showMainMenu();
		}
	} catch (error: any) {
		console.error(pc.red('An error occurred:'));
		console.error(error.message || error);
		process.exit(1);
	}

	outro('Done!');
}

main().catch(console.error);
