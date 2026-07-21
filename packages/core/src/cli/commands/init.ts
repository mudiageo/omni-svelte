import { cancel, intro, isCancel, outro, select, text } from '@clack/prompts';
import pc from 'picocolors';
import { join } from 'path';
import { addOmniToViteConfig } from '../utils/project.js';
import {
	type PackageManager,
	SUPPORTED_PACKAGE_MANAGERS,
	installDependencies,
	runPackageExec,
	runPackageInstall
} from '../utils/package-manager.js';
import { runInProcessStep, runStep } from '../utils/run-step.js';

export interface InitCommandOptions {
	omniPkg?: string;
	name?: string;
	cwd?: string;
	skipInstall?: boolean;
	packageManager?: PackageManager;
}

export async function handleInitCommand(options: InitCommandOptions): Promise<void> {
	intro(pc.bgBlue(pc.white(' OmniSvelte Init ')));

	let projectName = options.name;
	if (!projectName) {
		const name = await text({
			message: 'Project name',
			placeholder: 'my-omni-app',
			defaultValue: 'my-omni-app'
		});

		if (isCancel(name)) {
			cancel('Operation cancelled');
			return;
		}

		projectName = name.trim();
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

	const root = options.cwd ?? process.cwd();
	const projectPath = join(root, projectName);

	// runStep handles the spinner label + try/catch + cancel() on failure.
	// For subprocess steps we use runStep (stops spinner before spawning to avoid stdio conflict).
	// For in-process steps we use runInProcessStep (keeps spinner animated).

	// Note on tailwindcss arg: no shell quoting — execa passes args directly (Bug 2 fix)
	if (
		!(await runStep('Creating SvelteKit project', () =>
			runPackageExec(
				'sv',
				['create', projectName!, '--template', 'minimal', '--types', 'ts', '--add', 'tailwindcss=plugins:none', '--no-install'],
				root,
				packageManager
			)
		))
	)
		return;

	if (
		!(await runStep('Installing omni-svelte', () =>
			installDependencies([options.omniPkg ?? 'omni-svelte'], {
				cwd: projectPath,
				packageManager
			})
		))
	)
		return;

	// addOmniToViteConfig is synchronous in-process — use runInProcessStep
	if (!(await runInProcessStep('Configuring vite plugin', () => addOmniToViteConfig(projectPath))))
		return;

	if (!options.skipInstall) {
		// Bug 3 fix: pass the user-selected packageManager so we don't fall back to
		// auto-detection (which may pick the wrong PM if no lockfile exists yet).
		if (!(await runStep('Installing project dependencies', () => runPackageInstall(projectPath, packageManager))))
			return;
	}

	outro(`${pc.green('Success!')} Created ${projectName} at ${projectPath}`);
}
