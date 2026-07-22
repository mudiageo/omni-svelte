import { cancel, isCancel, select, text } from '@clack/prompts';
import pc from 'picocolors';
import { runPackageExec } from '../utils/package-manager.js';

export interface UiCommandOptions {
	action?: 'init' | 'add';
	components?: string[];
	cwd?: string;
	yes?: boolean;
}

export async function handleUiCommand(options: UiCommandOptions): Promise<void> {
	let action = options.action;
	const cwd = options.cwd ?? process.cwd();

	if (!action) {
		const selection = await select({
			message: 'UI action',
			options: [
				{ value: 'init', label: 'init — Initialize shadcn-svelte' },
				{ value: 'add', label: 'add — Add shadcn component' }
			]
		});

		if (isCancel(selection)) {
			cancel('Operation cancelled');
			return;
		}

		action = selection as UiCommandOptions['action'];
	}

	let components = options.components ?? [];
	if (action === 'add' && components.length === 0) {
		const value = await text({
			message: 'Component names (space separated)',
			placeholder: 'button card dialog'
		});

		if (isCancel(value)) {
			cancel('Operation cancelled');
			return;
		}

		components = String(value)
			.split(/\s+/)
			.map((entry) => entry.trim())
			.filter(Boolean);
	}

	const shadcnArgs =
		action === 'add'
			? ['add', ...components, ...(options.yes ? ['--yes'] : [])]
			: ['init', ...(options.yes ? ['--yes'] : [])];

	console.log(pc.dim(`Running shadcn-svelte@latest ${shadcnArgs.join(' ')}`));
	await runPackageExec('shadcn-svelte@latest', shadcnArgs, cwd);
}
