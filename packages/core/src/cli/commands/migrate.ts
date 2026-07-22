import { cancel, intro, isCancel, log, note, outro, select } from '@clack/prompts';
import pc from 'picocolors';
import { addOmniToViteConfig, hasPackageJson, hasViteConfig, isSvelteKitProject } from '../utils/project.js';
import {
	type PackageManager,
	SUPPORTED_PACKAGE_MANAGERS,
	installDependencies
} from '../utils/package-manager.js';
import { runStep } from '../utils/run-step.js';

export type MigrationType = 'sveltekit';

export interface MigrateCommandOptions {
	/** The type of migration to run. Defaults to interactive prompt. */
	type?: MigrationType;
	omniPkg?: string;
	cwd?: string;
	dev?: boolean;
	packageManager?: PackageManager;
}

const MIGRATION_TYPES: { value: MigrationType; label: string; hint: string }[] = [
	{
		value: 'sveltekit',
		label: 'sveltekit — Migrate an existing SvelteKit project to OmniSvelte',
		hint: 'Installs omni-svelte and configures the Vite plugin'
	}
];

export async function handleMigrateCommand(options: MigrateCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();

	intro(pc.bgCyan(pc.black(' OmniSvelte Migrate ')));

	if (!hasPackageJson(cwd)) {
		cancel(`No package.json found in ${pc.bold(cwd)}.`);
		process.exitCode = 1;
		return;
	}

	// Resolve migration type — prompt if not provided
	let migrationType = options.type;
	if (!migrationType) {
		if (MIGRATION_TYPES.length === 1) {
			// Only one type available — use it directly and tell the user
			migrationType = MIGRATION_TYPES[0].value;
			log.info(`Running ${pc.bold(migrationType)} migration`);
		} else {
			const selected = await select({
				message: 'What type of migration do you want to run?',
				options: MIGRATION_TYPES
			});
			if (isCancel(selected)) {
				cancel('Operation cancelled');
				return;
			}
			migrationType = selected as MigrationType;
		}
	}

	switch (migrationType) {
		case 'sveltekit':
			await runSvelteKitMigration(cwd, options);
			break;
		default:
			cancel(`Unknown migration type: ${pc.bold(migrationType)}. Available: ${MIGRATION_TYPES.map((t) => t.value).join(', ')}`);
			process.exitCode = 1;
	}
}

async function runSvelteKitMigration(cwd: string, options: MigrateCommandOptions) {
	// Non-blocking warning if this doesn't look like a SvelteKit project
	if (!isSvelteKitProject(cwd)) {
		log.warn(
			`@sveltejs/kit not found in dependencies. This may not be a SvelteKit project.\nContinuing anyway — configure OmniSvelte manually if needed.`
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

	outro(pc.green('✔ Migration complete! Your project is now powered by OmniSvelte.'));
}
