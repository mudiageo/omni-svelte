import { execa } from 'execa';
import { detect, getUserAgent } from 'package-manager-detector/detect';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno' | 'vp';

/** All supported package managers for use in prompts and validation. */
export const SUPPORTED_PACKAGE_MANAGERS: PackageManager[] = [
	'npm',
	'pnpm',
	'yarn',
	'bun',
	'deno',
	'vp'
];

export interface PackageManagerContext {
	name: PackageManager;
	cwd: string;
}

export interface InstallDependencyOptions {
	cwd?: string;
	dev?: boolean;
	packageManager?: PackageManager;
}

/**
 * Detect the active package manager for a project.
 *
 * Detection order:
 *  1. Upstream `package-manager-detector` (lockfiles, packageManager field, user-agent)
 *  2. Vite+ (`vp`) heuristic — checks for `vite-plus` import in vite.config.ts
 *  3. Falls back to `npm`
 */
export async function detectPackageManager(cwd = process.cwd()): Promise<PackageManagerContext> {
	const detected = await detect({ cwd });
	const userAgent = getUserAgent();
	const userAgentName = userAgent?.name;

	const candidate = [detected?.name, userAgentName].find(
		(name): name is string => name != null && name !== ''
	);

	// Upstream detects npm, pnpm, yarn, bun, deno
	if (
		candidate === 'pnpm' ||
		candidate === 'yarn' ||
		candidate === 'bun' ||
		candidate === 'npm' ||
		candidate === 'deno'
	) {
		return { name: candidate, cwd };
	}

	// Vite+ (vp) heuristic: check for vite-plus import in vite.config.ts
	if (isVitePlusProject(cwd)) {
		return { name: 'vp', cwd };
	}

	return { name: 'npm', cwd };
}

/**
 * Check if a project uses Vite+ by looking for `vite-plus` imports
 * in the vite config file.
 */
function isVitePlusProject(cwd: string): boolean {
	const configCandidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mts'];
	for (const configFile of configCandidates) {
		const configPath = join(cwd, configFile);
		if (existsSync(configPath)) {
			try {
				const content = readFileSync(configPath, 'utf-8');
				if (content.includes('vite-plus')) {
					return true;
				}
			} catch {
				// Ignore read errors
			}
		}
	}
	return false;
}

export async function installDependencies(
	packages: string[],
	options: InstallDependencyOptions = {}
): Promise<PackageManagerContext> {
	const cwd = options.cwd ?? process.cwd();
	const pm = options.packageManager
		? { name: options.packageManager, cwd }
		: await detectPackageManager(cwd);
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

export async function runPackageInstall(
	cwd = process.cwd(),
	// Bug 3 fix: accept an explicit packageManager so callers that already know
	// which PM the user chose don't fall back to auto-detection (which may pick
	// the wrong PM if no lockfile has been written yet).
	packageManager?: PackageManager
): Promise<PackageManagerContext> {
	const pm = packageManager ? { name: packageManager, cwd } : await detectPackageManager(cwd);
	const command = getInstallCommandArgs(pm.name);
	await execa(command.command, command.args, { cwd, stdio: 'inherit' });
	return pm;
}

export async function runPackageExec(
	packageName: string,
	args: string[] = [],
	cwd = process.cwd(),
	packageManager?: PackageManager,
	execaOptions: any = {}
): Promise<PackageManagerContext> {
	const pm = packageManager ? { name: packageManager, cwd } : await detectPackageManager(cwd);
	const command = getExecArgs(pm.name, packageName, args);
	await execa(command.command, command.args, { cwd, stdio: 'inherit', ...execaOptions });
	return pm;
}

/** @internal Exported for unit-testing only. */
export function getInstallArgs(name: PackageManager, packages: string[], dev: boolean) {
	switch (name) {
		case 'pnpm':
			return { command: 'pnpm', args: ['add', ...(dev ? ['-D'] : []), ...packages] };
		case 'yarn':
			return { command: 'yarn', args: ['add', ...(dev ? ['-D'] : []), ...packages] };
		case 'bun':
			return { command: 'bun', args: ['add', ...(dev ? ['-d'] : []), ...packages] };
		case 'deno':
			// Bug 5 fix: deno supports --dev for dev-only dependencies.
			return { command: 'deno', args: ['add', ...(dev ? ['--dev'] : []), ...packages] };
		case 'vp':
			return { command: 'vp', args: ['add', ...(dev ? ['-D'] : []), ...packages] };
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
			return { command: 'pnpm', args: ['run', script, ...(args.length ? ['--', ...args] : [])] };
		case 'yarn':
			return { command: 'yarn', args: [script, ...args] };
		case 'bun':
			return { command: 'bun', args: ['run', script, ...args] };
		case 'deno':
			return { command: 'deno', args: ['task', script, ...args] };
		case 'vp':
			return { command: 'vp', args: ['run', script, ...args] };
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
		case 'deno':
			return { command: 'deno', args: ['install'] };
		case 'vp':
			return { command: 'vp', args: ['install'] };
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
		case 'deno':
			return { command: 'deno', args: ['x', `npm:${packageName}`, ...args] };
		case 'vp':
			return { command: 'vp', args: ['dlx', packageName, ...args] };
		default:
			return { command: 'npx', args: [packageName, ...args] };
	}
}
