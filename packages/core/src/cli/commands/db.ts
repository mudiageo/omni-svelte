import pc from 'picocolors';
import { execa } from 'execa';
import { runPackageScript } from '../utils/package-manager.js';

export type DbAction = 'seed' | 'studio' | 'push' | 'pull' | 'generate' | 'check' | 'migrate';

export interface DbCommandOptions {
action: DbAction;
cwd?: string;
config?: string;
script?: string;
}

export async function handleDbCommand(options: DbCommandOptions): Promise<void> {
const cwd = options.cwd ?? process.cwd();

switch (options.action) {
case 'seed':
await runDbSeed(cwd, options.script);
break;
case 'studio':
case 'push':
case 'pull':
case 'generate':
case 'check':
case 'migrate':
await runDrizzleCommand(options.action, cwd, options.config);
break;
default:
throw new Error(`Unknown DB command: ${options.action}`);
}
}

async function runDbSeed(cwd: string, script = 'db:seed') {
console.log(pc.dim(`Running ${script} script...`));
await runPackageScript(script, [], cwd);
}

async function runDrizzleCommand(cmd: string, cwd: string, config?: string) {
console.log(pc.dim(`Running drizzle-kit ${cmd}...`));
const args = ['drizzle-kit', cmd, ...(config ? ['--config', config] : [])];
await execa('npx', args, { cwd, stdio: 'inherit' });
}
