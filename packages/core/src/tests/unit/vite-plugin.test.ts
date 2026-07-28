import { describe, it, expect, vi } from 'vitest';
import { omniSvelte, omni } from '../../vite/index';

// mock sveltekit to prevent it from trying to do real vite resolution
vi.mock('@sveltejs/kit/vite', () => ({
	sveltekit: vi.fn((opts) => ({ name: 'sveltekit', options: opts }))
}));

describe('omniSvelte Vite plugin', () => {
	it('auto-enables kit.experimental.remoteFunctions and compilerOptions.experimental.async', () => {
		const plugins = omniSvelte();
		// Find the sveltekit plugin instance (which we mocked to return its options)
		const kitPlugin = plugins.find((p: any) => p.name === 'sveltekit') as any;
		
		expect(kitPlugin).toBeDefined();
		expect(kitPlugin.options.experimental.remoteFunctions).toBe(true);
		expect(kitPlugin.options.compilerOptions.experimental.async).toBe(true);
	});

	it('warns and respects explicit false values for experimental flags', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		
		const plugins = omniSvelte({
			kit: {
				experimental: { remoteFunctions: false }
			},
			compilerOptions: {
				experimental: { async: false }
			}
		} as any);

		const kitPlugin = plugins.find((p: any) => p.name === 'sveltekit') as any;
		
		expect(kitPlugin.options.experimental.remoteFunctions).toBe(false);
		expect(kitPlugin.options.compilerOptions.experimental.async).toBe(false);
		
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('kit.experimental.remoteFunctions is explicitly set to false'));
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('compilerOptions.experimental.async is explicitly set to false'));
		
		warnSpy.mockRestore();
	});

	it('includes omni core plugins', () => {
		const plugins = omniSvelte();
		expect(plugins.find((p: any) => p.name === 'omni-svelte')).toBeDefined();
		expect(plugins.find((p: any) => p.name === 'vite-plugin-omni-virtual-aliases')).toBeDefined();
	});
});

describe('omni Vite plugin (standalone)', () => {
	it('does not inject sveltekit', () => {
		const plugins = omni();
		expect(plugins.find((p: any) => p.name === 'sveltekit')).toBeUndefined();
	});

	it('returns an array of core omni plugins', () => {
		const plugins = omni();
		expect(Array.isArray(plugins)).toBe(true);
		expect(plugins.length).toBeGreaterThan(0);
		expect(plugins.find((p: any) => p.name === 'omni-svelte')).toBeDefined();
		expect(plugins.find((p: any) => p.name === 'vite-plugin-omni-virtual-aliases')).toBeDefined();
	});
});
