import { intro, outro } from '@clack/prompts';
import pc from 'picocolors';
import { addOmniToViteConfig, hasPackageJson, hasViteConfig } from '../utils/project.js';
import { installDependencies } from '../utils/package-manager.js';

export interface AddCommandOptions {
	omniPkg?: string;
	cwd?: string;
	dev?: boolean;
}

export async function handleAddCommand(options: AddCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();

	if (!hasPackageJson(cwd)) {
		throw new Error(`No package.json found in ${cwd}.`);
	}

	intro(pc.bgCyan(pc.black(' OmniSvelte Add ')));
	await installDependencies([options.omniPkg ?? 'omni-svelte'], { cwd, dev: Boolean(options.dev) });

	if (!hasViteConfig(cwd)) {
		outro(
			`${pc.yellow('Installed omni-svelte.')}\nNo vite.config.ts found. Add \`import { omni } from 'omni-svelte/vite'\` and include \`omni()\` in your Vite plugins manually.`
		);
		return;
	}

	const viteUpdated = addOmniToViteConfig(cwd);
	outro(
		viteUpdated
			? pc.green('omni-svelte installed and vite.config.ts updated.')
			: pc.green('omni-svelte installed. vite.config.ts already configured.')
	);
}
