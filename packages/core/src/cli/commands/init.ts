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
	s.start('Creating SvelteKit project');

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
			'tailwindcss',
			'--no-install'
		],
		root,
		packageManager
	);

	s.message('Installing omni-svelte dependency');
	await installDependencies([options.omniPkg ?? 'omni-svelte'], {
		cwd: projectPath,
		packageManager
	});

	s.message('Configuring vite plugin');
	addOmniToViteConfig(projectPath);

	if (!options.skipInstall) {
		s.message('Installing project dependencies');
		await runPackageInstall(projectPath);
	}

	s.stop('Project initialized');

	outro(`${pc.green('Success!')} Created ${projectName} at ${projectPath}`);
}
