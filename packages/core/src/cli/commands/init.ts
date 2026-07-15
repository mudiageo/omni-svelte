import { cancel, intro, isCancel, outro, select, spinner, text } from '@clack/prompts';
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

	const s = spinner();

	// Bug 1 fix: stop spinner before any stdio:'inherit' subprocess so the
	// @clack animation doesn't fight with the subprocess's own stdout/stderr output.
	// We restart it after each subprocess with an updated message.

	s.start('Creating SvelteKit project...');
	s.stop('Creating SvelteKit project');

	// Bug 2 fix: use explicit tailwindcss option string to ensure fully
	// non-interactive execution. Without "plugins:none", sv create may prompt.
	await runPackageExec(
		'sv',
		[
			'create',
			projectName,
			'--template',
			'minimal',
			'--types',
			'ts',
			'--add',
			'tailwindcss="plugins:none"',
			'--no-install'
		],
		root,
		packageManager
	);

	s.start('Installing omni-svelte...');
	s.stop('Installing omni-svelte');

	await installDependencies([options.omniPkg ?? 'omni-svelte'], {
		cwd: projectPath,
		packageManager
	});

	s.start('Configuring vite plugin...');
	addOmniToViteConfig(projectPath);
	s.stop('Configured vite plugin');

	if (!options.skipInstall) {
		s.start('Installing project dependencies...');
		s.stop('Installing project dependencies');

		// Bug 3 fix: pass the user-selected packageManager so we don't fall
		// back to auto-detection (which may pick the wrong PM if no lockfile exists yet).
		await runPackageInstall(projectPath, packageManager);
	}

	outro(`${pc.green('Success!')} Created ${projectName} at ${projectPath}`);
}
