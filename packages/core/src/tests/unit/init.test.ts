import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleInitCommand } from '../../cli/commands/init.js';
import * as runStep from '../../cli/utils/run-step.js';
import * as pm from '../../cli/utils/package-manager.js';
import * as fs from 'fs';
import * as projectUtils from '../../cli/utils/project.js';

vi.mock('../../cli/utils/run-step.js');
vi.mock('../../cli/utils/package-manager.js');
vi.mock('fs');
vi.mock('../../cli/utils/project.js', () => ({
	addOmniToViteConfig: vi.fn(() => true)
}));
vi.mock('@clack/prompts', () => ({
	intro: vi.fn(),
	outro: vi.fn(),
	log: { warn: vi.fn(), info: vi.fn(), success: vi.fn() },
	note: vi.fn(),
	cancel: vi.fn(),
	isCancel: vi.fn(() => false),
	text: vi.fn(() => 'my-app'),
	select: vi.fn(() => 'pnpm')
}));

describe('init command', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		
		// Mock runStep to always return true
		vi.spyOn(runStep, 'runStep').mockResolvedValue(true);
		
		// Mock runInProcessStep to immediately invoke the callback
		vi.spyOn(runStep, 'runInProcessStep').mockImplementation(async (label, cb) => {
			await (cb as any)();
			return true;
		});

		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		
		// Mock readFileSync to return a fake package.json and CLI package.json
		vi.spyOn(fs, 'readFileSync').mockImplementation((path: any) => {
			const pathStr = path.toString();
			if (pathStr.includes('package.json')) {
				if (pathStr.includes('my-app')) {
					return JSON.stringify({ dependencies: {} });
				}
				// CLI package.json fallback
				return JSON.stringify({ version: '1.2.3' });
			}
			return '';
		});
		
		vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
	});

	it('should manually inject omni-svelte dependency when skipInstall is true', async () => {
		await handleInitCommand({ skipInstall: true, name: 'my-app', packageManager: 'pnpm' });

		// The normal installDependencies should NOT be called for omni-svelte
		expect(pm.installDependencies).not.toHaveBeenCalled();

		// It should read the project's package.json and write it back with the version
		expect(fs.writeFileSync).toHaveBeenCalled();
		const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call => call[0].toString().includes('package.json'));
		expect(writeCall).toBeDefined();
		
		const writtenJson = JSON.parse(writeCall![1] as string);
		expect(writtenJson.dependencies['omni-svelte']).toBe('^1.2.3');
	});
});
