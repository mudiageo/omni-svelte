import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function addOmniToViteConfig(projectPath: string): boolean {
	const viteConfigPath = join(projectPath, 'vite.config.ts');
	if (!existsSync(viteConfigPath)) {
		return false;
	}

	const original = readFileSync(viteConfigPath, 'utf-8');
	let updated = original;

	if (!updated.includes('omni-svelte/vite')) {
		updated = `import { omni } from 'omni-svelte/vite';\n${updated}`;
	}

	if (!updated.includes('omni()')) {
		const pluginArrayPattern = /plugins:\s*\[/m;
		if (pluginArrayPattern.test(updated)) {
			updated = updated.replace(pluginArrayPattern, 'plugins: [omni(), ');
		}
	}

	if (updated !== original) {
		writeFileSync(viteConfigPath, updated);
		return true;
	}

	return false;
}

export function hasPackageJson(cwd: string): boolean {
	return existsSync(join(cwd, 'package.json'));
}

export function hasViteConfig(cwd: string): boolean {
	return existsSync(join(cwd, 'vite.config.ts'));
}
