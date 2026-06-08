import { runPackageExec } from '../utils/package-manager.js';
import pc from 'picocolors';

export type MigrateAction = 'up' | 'rollback' | 'fresh';

export interface MigrateCommandOptions {
	dbUrl?: string;
	action?: MigrateAction;
	cwd?: string;
	config?: string;
}

export async function handleMigrateCommand(options: MigrateCommandOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();
	const action = options.action ?? 'up';

	switch (action) {
		case 'up':
			await runDrizzleMigration('migrate', cwd, options.config, options.dbUrl);
			break;
		case 'rollback':
			console.log(pc.yellow('Rollback workflow depends on your migration strategy.'));
			console.log(pc.dim('Run `omni db check` and apply manual rollback migration if needed.'));
			break;
		case 'fresh':
			console.log(pc.yellow('Fresh reset is not automated yet for safety.'));
			console.log(pc.dim('Drop your schema/database manually, then run `omni migrate`.'));
			break;
		default:
			throw new Error(`Unknown migrate action: ${action}`);
	}
}

async function runDrizzleMigration(action: string, cwd: string, config?: string, dbUrl?: string) {
	console.log(pc.dim(`Running drizzle-kit ${action}...`));
	await runPackageExec(
		'drizzle-kit',
		[action, ...(config ? ['--config', config] : [])],
		cwd,
		undefined,
		{
			env: { ...process.env, ...(dbUrl ? { DATABASE_URL: dbUrl } : {}) }
		}
	);
}
