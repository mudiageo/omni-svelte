import { cancel, intro, isCancel, outro, spinner, text } from '@clack/prompts';
import pc from 'picocolors';
import { join } from 'path';
import { addOmniToViteConfig } from '../utils/project.js';
import {
	installDependencies,
	runPackageExec,
	runPackageInstall
} from '../utils/package-manager.js';

export interface InitCommandOptions {
	name?: string;
	cwd?: string;
	skipInstall?: boolean;
	packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
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
		options.packageManager
	);

	s.message('Installing omni-svelte dependency');
	await installDependencies(['omni-svelte'], { cwd: projectPath });

	s.message('Configuring vite plugin');
	addOmniToViteConfig(projectPath);

	if (!options.skipInstall) {
		s.message('Installing project dependencies');
		await runPackageInstall(projectPath);
	}

	s.stop('Project initialized');

	outro(`${pc.green('Success!')} Created ${projectName} at ${projectPath}`);
}
