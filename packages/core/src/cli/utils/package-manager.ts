import { execa } from 'execa';
import { detect, getUserAgent } from 'package-manager-detector/detect';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface PackageManagerContext {
	name: PackageManager;
	cwd: string;
}

export interface InstallDependencyOptions {
	cwd?: string;
	dev?: boolean;
}

export async function detectPackageManager(cwd = process.cwd()): Promise<PackageManagerContext> {
	const detected = await detect({ cwd });
	const userAgent = getUserAgent();
	const userAgentName = userAgent?.name;

	const candidate = [detected?.name, userAgentName].find(
		(name): name is string => name != null && name !== ''
	);

	if (candidate === 'pnpm' || candidate === 'yarn' || candidate === 'bun' || candidate === 'npm') {
		return { name: candidate, cwd };
	}

	return { name: 'npm', cwd };
}

export async function installDependencies(
	packages: string[],
	options: InstallDependencyOptions = {}
): Promise<PackageManagerContext> {
	const cwd = options.cwd ?? process.cwd();
	const pm = await detectPackageManager(cwd);
	const args = getInstallArgs(pm.name, packages, options.dev ?? false);
	await execa(args.command, args.args, { cwd, stdio: 'inherit' });
	return pm;
}

export async function runPackageScript(
	script: string,
	args: string[] = [],
	cwd = process.cwd()
): Promise<PackageManagerContext> {
	const pm = await detectPackageManager(cwd);
	const command = getRunScriptArgs(pm.name, script, args);
	await execa(command.command, command.args, { cwd, stdio: 'inherit' });
	return pm;
}

export async function runPackageInstall(cwd = process.cwd()): Promise<PackageManagerContext> {
	const pm = await detectPackageManager(cwd);
	const command = getInstallCommandArgs(pm.name);
	await execa(command.command, command.args, { cwd, stdio: 'inherit' });
	return pm;
}

export async function runPackageExec(
	packageName: string,
	args: string[] = [],
	cwd = process.cwd(),
	packageManager?: PackageManager
): Promise<PackageManagerContext> {
	const pm = packageManager ? { name: packageManager, cwd } : await detectPackageManager(cwd);
	const command = getExecArgs(pm.name, packageName, args);
	await execa(command.command, command.args, { cwd, stdio: 'inherit' });
	return pm;
}

function getInstallArgs(name: PackageManager, packages: string[], dev: boolean) {
	switch (name) {
		case 'pnpm':
			return { command: 'pnpm', args: ['add', ...(dev ? ['-D'] : []), ...packages] };
		case 'yarn':
			return { command: 'yarn', args: ['add', ...(dev ? ['-D'] : []), ...packages] };
		case 'bun':
			return { command: 'bun', args: ['add', ...(dev ? ['-d'] : []), ...packages] };
		default:
			return {
				command: 'npm',
				args: ['install', ...packages, ...(dev ? ['--save-dev'] : [])]
			};
	}
}

function getRunScriptArgs(name: PackageManager, script: string, args: string[]) {
	switch (name) {
		case 'pnpm':
			return { command: 'pnpm', args: ['run', script, ...args] };
		case 'yarn':
			return { command: 'yarn', args: [script, ...args] };
		case 'bun':
			return { command: 'bun', args: ['run', script, ...args] };
		default:
			return { command: 'npm', args: ['run', script, ...(args.length ? ['--', ...args] : [])] };
	}
}

function getInstallCommandArgs(name: PackageManager) {
	switch (name) {
		case 'pnpm':
			return { command: 'pnpm', args: ['install'] };
		case 'yarn':
			return { command: 'yarn', args: ['install'] };
		case 'bun':
			return { command: 'bun', args: ['install'] };
		default:
			return { command: 'npm', args: ['install'] };
	}
}

function getExecArgs(name: PackageManager, packageName: string, args: string[]) {
	switch (name) {
		case 'pnpm':
			return { command: 'pnpm', args: ['dlx', packageName, ...args] };
		case 'yarn':
			return { command: 'yarn', args: ['dlx', packageName, ...args] };
		case 'bun':
			return { command: 'bunx', args: [packageName, ...args] };
		default:
			return { command: 'npx', args: [packageName, ...args] };
	}
}
