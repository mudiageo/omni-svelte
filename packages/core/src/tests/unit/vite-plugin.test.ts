import { describe, it, expect, vi } from 'vitest';
import { omniSvelte } from '../../vite/index';

// mock sveltekit to prevent it from trying to do real vite resolution
vi.mock('@sveltejs/kit/vite', () => ({
	sveltekit: vi.fn((opts) => ({ name: 'sveltekit', options: opts }))
}));

// mock auth and migrations plugins which might rely on fs or other stuff
vi.mock('../../vite/plugins/auth', () => ({
	plugin_auth_resolver: vi.fn(() => ({ name: 'omni:auth-resolver' })),
	plugin_auth_codegen: vi.fn(() => ({ name: 'omni:auth-codegen' }))
}));
vi.mock('../../vite/plugins/migrations', () => ({
	omniMigrationsPlugin: vi.fn(() => ({ name: 'omni:migrations' }))
}));
vi.mock('../../vite/plugins/virtual-modules', () => ({
	plugin_omni_virtual_aliases: vi.fn(() => ({ name: 'omni:virtual-aliases' }))
}));
vi.mock('../../vite/plugins/core', () => ({
	omni: vi.fn(() => ({ name: 'omni:core' }))
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
});
