import { cancel, intro, isCancel, log, outro, select, text } from '@clack/prompts';
import pc from 'picocolors';

export type AddFeature =
	| 'auth'
	| 'drizzle'
	| 'shadcn'
	| 'docker'
	| 'tailwind'
	| 'lucia'
	| 'resend'
	| 'stripe';

export interface AddCommandOptions {
	feature?: AddFeature;
	cwd?: string;
}

interface FeatureDef {
	value: AddFeature;
	label: string;
	hint: string;
	available: boolean;
}

const FEATURES: FeatureDef[] = [
	{ value: 'auth', label: 'auth — Authentication (sessions, OAuth, magic links)', hint: 'coming soon', available: false },
	{ value: 'drizzle', label: 'drizzle — Drizzle ORM integration', hint: 'coming soon', available: false },
	{ value: 'shadcn', label: 'shadcn — shadcn-svelte component library', hint: 'coming soon', available: false },
	{ value: 'docker', label: 'docker — Docker + docker-compose setup', hint: 'coming soon', available: false },
	{ value: 'tailwind', label: 'tailwind — Tailwind CSS v4', hint: 'coming soon', available: false },
	{ value: 'lucia', label: 'lucia — Lucia auth adapter', hint: 'coming soon', available: false },
	{ value: 'resend', label: 'resend — Resend email integration', hint: 'coming soon', available: false },
	{ value: 'stripe', label: 'stripe — Stripe payments integration', hint: 'coming soon', available: false }
];

export async function handleAddCommand(options: AddCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();

	intro(pc.bgBlue(pc.white(' OmniSvelte Add ')));

	let feature = options.feature as AddFeature | undefined;

	if (!feature) {
		const selected = await select({
			message: 'Which feature do you want to add?',
			options: FEATURES.map((f) => ({
				value: f.value,
				label: f.label,
				hint: f.hint
			}))
		});

		if (isCancel(selected)) {
			cancel('Operation cancelled');
			return;
		}

		feature = selected as AddFeature;
	}

	const featureDef = FEATURES.find((f) => f.value === feature);
	if (!featureDef) {
		cancel(`Unknown feature: ${pc.bold(feature)}. Available: ${FEATURES.map((f) => f.value).join(', ')}`);
		process.exitCode = 1;
		return;
	}

	if (!featureDef.available) {
		outro(
			pc.yellow(`✦ ${pc.bold(feature)} is coming soon!\n`) +
			pc.dim('  Follow https://github.com/mudiageo/omni-svelte for updates.')
		);
		return;
	}

	// Placeholder — available features will be implemented here
	cancel(`Feature ${pc.bold(feature)} is not yet implemented.`);
	process.exitCode = 1;
}
