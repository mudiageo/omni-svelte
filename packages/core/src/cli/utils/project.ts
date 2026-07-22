import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * Walk up from `start` until we find a directory containing package.json.
 * Returns the found directory, or `start` if none found.
 */
export function findProjectRoot(start = process.cwd()): string {
	let current = resolve(start);
	while (true) {
		if (existsSync(join(current, 'package.json'))) {
			return current;
		}
		const parent = dirname(current);
		if (parent === current) break; // reached filesystem root
		current = parent;
	}
	return start; // fallback to original
}

export function hasPackageJson(cwd: string): boolean {
	return existsSync(join(cwd, 'package.json'));
}

export function hasViteConfig(cwd: string): boolean {
	return existsSync(join(cwd, 'vite.config.ts'));
}

/**
 * Returns true if cwd is a SvelteKit project.
 * Checks for @sveltejs/kit in dependencies — works for all SvelteKit versions
 * including v3+ where svelte.config.js is optional/removed.
 * Falls back to checking for svelte.config.js/ts for older projects.
 */
export function isSvelteKitProject(cwd: string): boolean {
	// Primary: check package.json for @sveltejs/kit (works for all versions)
	const pkgPath = join(cwd, 'package.json');
	if (existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			const allDeps = {
				...pkg.dependencies,
				...pkg.devDependencies,
				...pkg.peerDependencies
			};
			if ('@sveltejs/kit' in allDeps) return true;
		} catch {
			// fall through to file-based check
		}
	}
	// Fallback: legacy svelte.config.js/ts (SvelteKit < 3)
	return (
		existsSync(join(cwd, 'svelte.config.js')) ||
		existsSync(join(cwd, 'svelte.config.ts'))
	);
}

/**
 * Returns true if omni-svelte is listed as a dependency in package.json.
 * Checks both dependencies and devDependencies.
 */
export function isOmniProject(cwd: string): boolean {
	const pkgPath = join(cwd, 'package.json');
	if (!existsSync(pkgPath)) return false;
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
		return (
			'omni-svelte' in (pkg.dependencies ?? {}) ||
			'omni-svelte' in (pkg.devDependencies ?? {})
		);
	} catch {
		return false;
	}
}

export function addOmniToViteConfig(projectPath: string): boolean {
	const viteConfigPath = join(projectPath, 'vite.config.ts');
	if (!existsSync(viteConfigPath)) {
		return false;
	}

	const original = readFileSync(viteConfigPath, 'utf-8');
	let updated = original;

	if (!updated.includes('omni-svelte/vite')) {
		updated = `import { omniSvelte } from 'omni-svelte/vite';\n${updated}`;
	}

	if (!updated.includes('omniSvelte()')) {
		const pluginArrayPattern = /plugins:\s*\[/m;
		if (pluginArrayPattern.test(updated)) {
			updated = updated.replace(pluginArrayPattern, 'plugins: [omniSvelte(), ');
		}
	}

	if (updated !== original) {
		writeFileSync(viteConfigPath, updated);
		return true;
	}

	return false;
}
