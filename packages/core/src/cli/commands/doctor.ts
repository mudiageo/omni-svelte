import { cancel, intro, log, outro } from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { detectPackageManager } from '../utils/package-manager.js';
import { isSvelteKitProject, isOmniProject } from '../utils/project.js';

export interface DoctorCommandOptions {
	cwd?: string;
}

interface Check {
	label: string;
	ok: boolean;
	hint?: string;
}

export async function handleDoctorCommand(options: DoctorCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();

	intro(pc.bgMagenta(pc.white(' OmniSvelte Doctor ')));

	// ── Package Manager ────────────────────────────────────────────────────
	const pm = await detectPackageManager(cwd);
	log.info(`Detected package manager: ${pc.bold(pm.name)}`);

	// ── Node.js version ────────────────────────────────────────────────────
	const nodeVersion = process.version;
	const nodeOk = parseInt(nodeVersion.slice(1).split('.')[0]) >= 22;

	// ── File checks ────────────────────────────────────────────────────────
	const checks: Check[] = [
		{
			label: 'package.json',
			ok: existsSync(join(cwd, 'package.json')),
			hint: 'No package.json found. Are you in the project root?'
		},
		{
			label: 'vite.config.ts',
			ok: existsSync(join(cwd, 'vite.config.ts')),
			hint: 'vite.config.ts not found. Is this a Vite-based project?'
		},
		{
			label: 'SvelteKit project (@sveltejs/kit dependency)',
			ok: isSvelteKitProject(cwd),
			hint: '@sveltejs/kit not found in dependencies. Is this a SvelteKit project?'
		},
		{
			label: 'omni-svelte installed',
			ok: isOmniProject(cwd),
			hint: 'omni-svelte not found in dependencies. Run `omni add` to install it.'
		},
		{
			label: '.omni directory',
			ok: existsSync(join(cwd, '.omni')),
			hint: 'Optional — .omni directory not present.'
		},
		{
			label: `Node.js >= 22 (${nodeVersion})`,
			ok: nodeOk,
			hint: `Node.js 22+ is required. You are running ${nodeVersion}.`
		}
	];

	// ── DATABASE_URL check ─────────────────────────────────────────────────
	const dbUrlSet = !!process.env.DATABASE_URL;
	checks.push({
		label: 'DATABASE_URL env var',
		ok: dbUrlSet,
		hint: dbUrlSet ? undefined : 'DATABASE_URL is not set. Required for db commands.'
	});

	// ── omni-svelte version ────────────────────────────────────────────────
	try {
		const pkgPath = join(cwd, 'node_modules', 'omni-svelte', 'package.json');
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			log.info(`omni-svelte version: ${pc.bold(pkg.version ?? 'unknown')}`);
		}
	} catch {
		// not installed, already caught by check above
	}

	// ── Print results ──────────────────────────────────────────────────────
	let allOk = true;
	for (const check of checks) {
		if (check.ok) {
			log.success(check.label);
		} else {
			allOk = false;
			log.warn(`${check.label}${check.hint ? pc.dim(` — ${check.hint}`) : ''}`);
		}
	}

	outro(
		allOk
			? pc.green('Everything looks good!')
			: pc.yellow('Some checks failed. See warnings above.')
	);
}
