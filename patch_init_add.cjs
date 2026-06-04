const fs = require('fs');

// Patch init.ts
let file = 'packages/core/src/cli/commands/init.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/export interface InitCommandOptions {/, `export interface InitCommandOptions {
	omniPkg?: string;`);
code = code.replace(/await installDependencies\(\['omni-svelte'\], { cwd: projectPath }\);/, `await installDependencies([options.omniPkg ?? 'omni-svelte'], { cwd: projectPath });`);
fs.writeFileSync(file, code);

// Patch add.ts
file = 'packages/core/src/cli/commands/add.ts';
code = fs.readFileSync(file, 'utf8');

code = code.replace(/export interface AddCommandOptions {/, `export interface AddCommandOptions {
	omniPkg?: string;`);
code = code.replace(/await installDependencies\(\['omni-svelte'\], { cwd, dev: Boolean\(options\.dev\) }\);/, `await installDependencies([options.omniPkg ?? 'omni-svelte'], { cwd, dev: Boolean(options.dev) });`);
fs.writeFileSync(file, code);

// Patch index.ts
file = 'packages/core/src/cli/index.ts';
code = fs.readFileSync(file, 'utf8');

code = code.replace(/\.option\('--package-manager <name>', 'Force package manager \(npm\|pnpm\|yarn\|bun\)'\)/, `.option('--package-manager <name>', 'Force package manager (npm|pnpm|yarn|bun)')
	.option('--omni-pkg <package>', 'Install omni-svelte from a specific package/path (for testing)')`);

code = code.replace(/skipInstall: options\.skipInstall,/, `skipInstall: options.skipInstall,
				omniPkg: options.omniPkg,`);

code = code.replace(/\.option\('-D, --dev', 'Install as a dev dependency', false\)/, `.option('-D, --dev', 'Install as a dev dependency', false)
	.option('--omni-pkg <package>', 'Install omni-svelte from a specific package/path (for testing)')`);

code = code.replace(/handleAddCommand\(\{ cwd: options\.cwd, dev: options\.dev \}\)/, `handleAddCommand({ cwd: options.cwd, dev: options.dev, omniPkg: options.omniPkg })`);

fs.writeFileSync(file, code);
