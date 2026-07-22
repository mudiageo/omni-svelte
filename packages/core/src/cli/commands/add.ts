import { cancel, intro, isCancel, log, note, outro, select } from '@clack/prompts';
import pc from 'picocolors';
import { addOmniToViteConfig, hasPackageJson, hasViteConfig, isSvelteKitProject } from '../utils/project.js';
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
	// is framed within the @clack UI context.
	intro(pc.bgCyan(pc.black(' OmniSvelte Add ')));

	if (!hasPackageJson(cwd)) {
		cancel(`No package.json found in ${pc.bold(cwd)}.`);
		process.exitCode = 1;
		return;
	}

	// Warn if this doesn't look like a SvelteKit project
	if (!isSvelteKitProject(cwd)) {
		log.warn(
			`No svelte.config.js found. This may not be a SvelteKit project.\nContinuing anyway — you can configure OmniSvelte manually.`
		);
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
		log.warn(
			`No vite.config.ts found. Add the following manually:\n` +
			pc.dim(`  import { omniSvelte } from 'omni-svelte/vite';\n`) +
			pc.dim(`  // in your plugins array: omniSvelte()`)
		);
		note(`${packageManager} run dev`, 'Next steps');
		outro(pc.yellow('omni-svelte installed — configure Vite plugin manually.'));
		return;
	}

	const viteUpdated = addOmniToViteConfig(cwd);

	if (viteUpdated) {
		log.success('vite.config.ts updated with omniSvelte() plugin.');
	} else {
		log.info('vite.config.ts already configured — no changes needed.');
	}

	note(`${packageManager} run dev`, 'Next steps');

	outro(pc.green('✔ omni-svelte installed and ready!'));
}
