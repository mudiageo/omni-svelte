import { cancel, intro, isCancel, outro, select } from '@clack/prompts';
import pc from 'picocolors';
import { addOmniToViteConfig, hasPackageJson, hasViteConfig } from '../utils/project.js';
import {
	type PackageManager,
	SUPPORTED_PACKAGE_MANAGERS,
	installDependencies
} from '../utils/package-manager.js';

export interface AddCommandOptions {
	omniPkg?: string;
	cwd?: string;
	dev?: boolean;
	packageManager?: PackageManager;
}

export async function handleAddCommand(options: AddCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();

	if (!hasPackageJson(cwd)) {
		throw new Error(`No package.json found in ${cwd}.`);
	}

	intro(pc.bgCyan(pc.black(' OmniSvelte Add ')));

	// Prompt for package manager if not specified via flag
	let packageManager = options.packageManager;
	if (!packageManager) {
		const selected = await select({
			message: 'Which package manager do you want to use?',
			options: SUPPORTED_PACKAGE_MANAGERS.map((pm) => ({
				value: pm,
				label: pm,
				hint: pm === 'vp' ? 'Vite+ toolchain' : pm === 'deno' ? 'Deno runtime' : undefined
			}))
		});

		if (isCancel(selected)) {
			cancel('Operation cancelled');
			return;
		}

		packageManager = selected as PackageManager;
	}

	await installDependencies([options.omniPkg ?? 'omni-svelte'], {
		cwd,
		dev: Boolean(options.dev),
		packageManager
	});

	if (!hasViteConfig(cwd)) {
		outro(
			`${pc.yellow('Installed omni-svelte.')}\nNo vite.config.ts found. Add \`import { omniSvelte } from 'omni-svelte/vite'\` and include \`omniSvelte()\` in your Vite plugins manually.`
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
