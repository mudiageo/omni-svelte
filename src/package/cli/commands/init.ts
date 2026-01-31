import mri from 'mri';
import { text, isCancel, cancel, intro, outro, spinner } from '@clack/prompts';
import { execa } from 'execa';
import pc from 'picocolors';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export async function handleInitCommand(args: mri.Argv) {
	intro(pc.bgBlue(pc.white(' Initialize OmniSvelte Project ')));

	let projectName = args._[1];

	if (!projectName) {
		const name = await text({
			message: 'What is the name of your project?',
			placeholder: 'my-omni-app',
			defaultValue: 'my-omni-app',
		});

		if (isCancel(name)) {
			cancel('Operation cancelled');
			return process.exit(0);
		}
		projectName = name as string;
	}

	const s = spinner();
	s.start('Creating SvelteKit project...');

	try {
		// Run sv create
		// Using --no-install to modify files before installation
		await execa('pnpm', [
			'dlx',
			'sv',
			'create',
			projectName,
			'--template', 'minimal',
			'--types', 'ts',
			'--add', 'tailwindcss',
			'--no-install'
		], { stdio: 'inherit' });

		s.message('Configuring OmniSvelte...');

		const projectPath = join(process.cwd(), projectName);

		// Update vite.config.ts
		updateViteConfig(projectPath);

		// Add omni-svelte dependency
		addDependency(projectPath);

		s.message('Installing dependencies...');
		await execa('pnpm', ['install'], { cwd: projectPath });

		s.stop('Project created successfully!');

		outro(`
${pc.green('Success!')} Created ${projectName} at ${projectPath}

Next steps:
  cd ${projectName}
  pnpm dev
`);

	} catch (error: any) {
		s.stop('Failed to create project');
		console.error(pc.red(error.message));
		process.exit(1);
	}
}

function updateViteConfig(projectPath: string) {
	const viteConfigPath = join(projectPath, 'vite.config.ts');
	if (existsSync(viteConfigPath)) {
		let content = readFileSync(viteConfigPath, 'utf-8');

		// Add import
		if (!content.includes('omni-svelte/vite')) {
			content = `import { omni } from 'omni-svelte/vite';\n` + content;
		}

		// Add plugin
		// Looking for plugins: [ ... ]
		// We insert omni() before sveltekit()
		if (content.includes('plugins: [')) {
			content = content.replace('plugins: [', 'plugins: [omni(), ');
		}

		writeFileSync(viteConfigPath, content);
	}
}

function addDependency(projectPath: string) {
	const pkgPath = join(projectPath, 'package.json');
	if (existsSync(pkgPath)) {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
		pkg.dependencies = pkg.dependencies || {};
		pkg.dependencies['omni-svelte'] = 'latest'; // Or specific version
		writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t'));
	}
}
