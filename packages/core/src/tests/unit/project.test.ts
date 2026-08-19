import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { addOmniToViteConfig } from '../../cli/utils/project.js';
import { writeFileSync, existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('project utils', () => {
	const tempDir = join(tmpdir(), 'omni-svelte-project-test-' + Date.now());

	beforeEach(() => {
		if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
	});

	describe('addOmniToViteConfig', () => {
		it('should replace sveltekit() with omniSvelte() and preserve options', () => {
			const configPath = join(tempDir, 'vite.config.ts');
			const originalConfig = `
				import { sveltekit } from '@sveltejs/kit/vite';
				import { defineConfig } from 'vite';

				export default defineConfig({
					plugins: [sveltekit({ compilerOptions: { dev: true } })]
				});
			`;
			writeFileSync(configPath, originalConfig);

			const result = addOmniToViteConfig(tempDir);
			expect(result).toBe(true);

			const updatedConfig = readFileSync(configPath, 'utf-8');
			expect(updatedConfig).toContain(`import { omniSvelte } from 'omni-svelte/vite'`);
			expect(updatedConfig).not.toContain(`import { sveltekit }`);
			expect(updatedConfig).toContain(`plugins: [omniSvelte({ compilerOptions: { dev: true } })]`);
		});

		it('should add omniSvelte() to an existing plugins array', () => {
			const configPath = join(tempDir, 'vite.config.ts');
			const originalConfig = `
				import { somePlugin } from 'some-plugin';
				import { defineConfig } from 'vite';

				export default defineConfig({
					plugins: [somePlugin()]
				});
			`;
			writeFileSync(configPath, originalConfig);

			const result = addOmniToViteConfig(tempDir);
			expect(result).toBe(true);

			const updatedConfig = readFileSync(configPath, 'utf-8');
			expect(updatedConfig).toContain(`import { omniSvelte } from 'omni-svelte/vite'`);
			expect(updatedConfig).toContain(`plugins: [omniSvelte(), somePlugin()]`);
		});
	});
});
