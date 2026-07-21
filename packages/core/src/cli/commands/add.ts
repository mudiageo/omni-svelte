import { cancel, intro, isCancel, outro, select } from '@clack/prompts';
import pc from 'picocolors';
import { addOmniToViteConfig, hasPackageJson, hasViteConfig } from '../utils/project.js';
import {
	type PackageManager,
	SUPPORTED_PACKAGE_MANAGERS,
	installDependencies
} from '../utils/package-manager.js';
import { runStep } from '../utils/run-step.js';

export interface AddCommandOptions {
	omniPkg?: string;
	cwd?: string;
	dev?: boolean;
	packageManager?: PackageManager;
}

export async function handleAddCommand(options: AddCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();

	// Bug 4 fix: run intro() before validation so all output (including errors)
	// is framed within the @clack UI context. Use cancel() instead of throw so
	// the error is styled consistently rather than falling through to runAction's
	// bare console.error.
	intro(pc.bgCyan(pc.black(' OmniSvelte Add ')));

	if (!hasPackageJson(cwd)) {
		cancel(`No package.json found in ${cwd}.`);
		process.exitCode = 1;
		return;
	}

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

	if (
		!(await runStep('Installing omni-svelte', () =>
			installDependencies([options.omniPkg ?? 'omni-svelte'], {
				cwd,
				dev: Boolean(options.dev),
				packageManager
			})
		))
	)
		return;

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
