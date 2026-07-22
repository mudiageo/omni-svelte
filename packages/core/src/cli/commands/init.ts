import { cancel, intro, isCancel, log, note, outro, select, text } from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, rmSync } from 'fs';
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

	// Track whether the project dir was created so we can clean up on failure
	const projectExistedBefore = existsSync(projectPath);

	// Helper to clean up a partially-created project directory on failure
	const cleanupOnFailure = () => {
		if (!projectExistedBefore && existsSync(projectPath)) {
			try {
				rmSync(projectPath, { recursive: true, force: true });
				log.warn(`Cleaned up partially created directory: ${pc.dim(projectPath)}`);
			} catch {
				log.warn(`Could not clean up ${projectPath} — please remove it manually.`);
			}
		}
	};

	// runStep prints the step label and wraps the subprocess in try/catch.
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
	) {
		cleanupOnFailure();
		return;
	}

	if (
		!(await runStep('Installing omni-svelte', () =>
			installDependencies([options.omniPkg ?? 'omni-svelte'], {
				cwd: projectPath,
				packageManager
			})
		))
	) {
		cleanupOnFailure();
		return;
	}

	// addOmniToViteConfig is synchronous in-process — use runInProcessStep
	if (!(await runInProcessStep('Configuring vite plugin', () => addOmniToViteConfig(projectPath)))) {
		cleanupOnFailure();
		return;
	}

	if (!options.skipInstall) {
		// Bug 3 fix: pass the user-selected packageManager so we don't fall back to
		// auto-detection (which may pick the wrong PM if no lockfile exists yet).
		if (!(await runStep('Installing project dependencies', () => runPackageInstall(projectPath, packageManager)))) {
			cleanupOnFailure();
			return;
		}
	}

	let nextSteps = `cd ${projectName}\n`;
	if (options.skipInstall) {
		nextSteps += `${packageManager} install\n`;
	}
	nextSteps += `${packageManager} run dev`;

	note(nextSteps, 'Next steps');

	outro(`${pc.green('✔ Success!')} Created ${pc.bold(projectName)} at ${pc.dim(projectPath)}`);
}
