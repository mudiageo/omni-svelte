import mri from 'mri';
import { select, isCancel, cancel } from '@clack/prompts';
import { execa } from 'execa';
import pc from 'picocolors';

export async function handleDbCommand(args: mri.Argv) {
	let subCommand = args._[1];

	if (!subCommand) {
		const action = await select({
			message: 'Database operations:',
			options: [
				{ value: 'seed', label: 'Seed Database' },
				{ value: 'studio', label: 'Open Drizzle Studio' },
				{ value: 'push', label: 'Push Schema (Prototyping)' },
				{ value: 'generate', label: 'Generate Migrations' },
				{ value: 'check', label: 'Check Database' },
			],
		});
		if (isCancel(action)) {
			cancel('Operation cancelled');
			return process.exit(0);
		}
		subCommand = action as string;
	}

	switch (subCommand) {
		case 'seed':
			await runDbSeed();
			break;
		case 'studio':
			await runDrizzleCommand('studio');
			break;
		case 'push':
			await runDrizzleCommand('push');
			break;
		case 'generate':
			await runDrizzleCommand('generate');
			break;
		case 'check':
			await runDrizzleCommand('check');
			break;
		default:
			console.log(pc.red(`Unknown DB command: ${subCommand}`));
	}
}

async function runDbSeed() {
	// Need to check if a seeder exists or if we have a seed script
	console.log(pc.dim('Running seed script...'));
	try {
        // Looking for a seed script in package.json or running a default location
        // For now, assuming standard sveltekit structure, maybe we run a specific file with ts-node or similar?
        // But sveltekit uses vite-node or similar usually.
        // Simplest is checking if there is a db:seed script in package.json
        await execa('npm', ['run', 'db:seed'], { stdio: 'inherit' });
    } catch (e) {
         console.log(pc.yellow('Could not find or run "db:seed" script. Please ensure it is defined in package.json or implemented.'));
    }
}

async function runDrizzleCommand(cmd: string) {
    try {
        console.log(pc.dim(`Running drizzle-kit ${cmd}...`));
        await execa('npx', ['drizzle-kit', cmd], { stdio: 'inherit' });
    } catch (e) {
        // Error handling delegated to the child process output
    }
}
