import mri from 'mri';
import { select, text, isCancel, cancel } from '@clack/prompts';
import { execa } from 'execa';
import pc from 'picocolors';

export async function handleUiCommand(args: mri.Argv) {
	let subCommand = args._[1];

	if (!subCommand) {
		const action = await select({
			message: 'What UI action would you like to perform?',
			options: [
				{ value: 'init', label: 'Initialize shadcn-svelte (init)' },
				{ value: 'add', label: 'Add Component (add)' },
			],
		});
		if (isCancel(action)) {
			cancel('Operation cancelled');
			return process.exit(0);
		}
		subCommand = action as string;
	}

	if (subCommand === 'init') {
		await runShadcnCommand(['init'], args);
	} else if (subCommand === 'add') {
		// Pass through component names if present
		const components = args._.slice(2);
		await runShadcnCommand(['add', ...components], args);
	} else {
		console.log(pc.red(`Unknown UI command: ${subCommand}`));
	}
}

async function runShadcnCommand(commandArgs: string[], mriArgs: mri.Argv) {
	// Construct arguments for shadcn-svelte
	// Filter out mri specific args and command/subcommand
	// We might need to forward flags. mri puts flags in the root object.

	const flags = Object.entries(mriArgs)
		.filter(([key]) => key !== '_')
		.map(([key, value]) => {
			if (value === true) return `--${key}`;
			return `--${key}=${value}`;
		});

	try {
		console.log(pc.dim(`Running: npx shadcn-svelte@latest ${commandArgs.join(' ')} ${flags.join(' ')}`));

		await execa('npx', ['shadcn-svelte@latest', ...commandArgs, ...flags], {
			stdio: 'inherit',
		});
	} catch (error) {
		// execa usually handles logging via stdio inherit, but if it fails we might want to know
		// console.error(pc.red('Error running UI command.'));
	}
}
