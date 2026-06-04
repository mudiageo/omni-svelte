import pc from 'picocolors';
import { existsSync } from 'fs';
import { join } from 'path';
import { detectPackageManager } from '../utils/package-manager.js';

export interface DoctorCommandOptions {
cwd?: string;
}

export async function handleDoctorCommand(options: DoctorCommandOptions): Promise<void> {
const cwd = options.cwd ?? process.cwd();
const pm = await detectPackageManager(cwd);
const checks = [
{ label: 'package.json', ok: existsSync(join(cwd, 'package.json')) },
{ label: 'vite.config.ts', ok: existsSync(join(cwd, 'vite.config.ts')) },
{ label: 'svelte.config.js', ok: existsSync(join(cwd, 'svelte.config.js')) },
{ label: '.omni directory', ok: existsSync(join(cwd, '.omni')) },
];

console.log(pc.bold('OmniSvelte Doctor'));
console.log(pc.dim(`Detected package manager: ${pm.name}`));
for (const check of checks) {
const icon = check.ok ? pc.green('✓') : pc.red('✗');
console.log(`${icon} ${check.label}`);
}
}
