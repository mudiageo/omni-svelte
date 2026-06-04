import pc from 'picocolors';
import { runPackageScript } from '../utils/package-manager.js';

export type DevAction = 'serve' | 'build' | 'test' | 'lint' | 'format';

export interface DevCommandOptions {
action: DevAction;
cwd?: string;
scriptArgs?: string[];
}

export async function handleDevCommand(options: DevCommandOptions): Promise<void> {
const cwd = options.cwd ?? process.cwd();
const scriptArgs = options.scriptArgs ?? [];

switch (options.action) {
case 'serve':
console.log(pc.dim('Starting development server...'));
await runPackageScript('dev', scriptArgs, cwd);
break;
case 'build':
await runPackageScript('build', scriptArgs, cwd);
break;
case 'test':
await runPackageScript('test', scriptArgs, cwd);
break;
case 'lint':
await runPackageScript('lint', scriptArgs, cwd);
break;
case 'format':
await runPackageScript('format', scriptArgs, cwd);
break;
default:
throw new Error(`Unknown dev command: ${options.action}`);
}
}
