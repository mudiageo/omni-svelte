import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInProcessStep, runStep } from '../../cli/utils/run-step.js';
import * as prompts from '@clack/prompts';

vi.mock('@clack/prompts', () => {
	const spinnerObj = {
		start: vi.fn(),
		stop: vi.fn(),
	};
	return {
		cancel: vi.fn(),
		spinner: vi.fn(() => spinnerObj),
	};
});

describe('run-step helpers', () => {
	let originalExitCode: number | undefined;

	beforeEach(() => {
		originalExitCode = process.exitCode;
		process.exitCode = undefined;
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.exitCode = originalExitCode;
	});

	describe('runStep', () => {
		it('should return true and stop spinner on success', async () => {
			const fn = vi.fn().mockResolvedValue(undefined);
			const result = await runStep('Test Step', fn);

			expect(result).toBe(true);
			expect(fn).toHaveBeenCalled();
			expect(process.exitCode).toBeUndefined();

			const spinnerObj = prompts.spinner();
			expect(spinnerObj.start).toHaveBeenCalledWith('Test Step...');
			expect(spinnerObj.stop).toHaveBeenCalledWith('Test Step');
		});

		it('should return false, call cancel, and set exitCode 1 on failure', async () => {
			const error = new Error('Something went wrong');
			const fn = vi.fn().mockRejectedValue(error);

			const result = await runStep('Test Step', fn);

			expect(result).toBe(false);
			expect(prompts.cancel).toHaveBeenCalledWith('Test Step failed: Something went wrong');
			expect(process.exitCode).toBe(1);

			const spinnerObj = prompts.spinner();
			expect(spinnerObj.start).toHaveBeenCalledWith('Test Step...');
			expect(spinnerObj.stop).toHaveBeenCalledWith('Test Step');
		});
	});

	describe('runInProcessStep', () => {
		it('should return true and stop spinner with success message', async () => {
			const fn = vi.fn().mockResolvedValue(undefined);
			const result = await runInProcessStep('In-process Step', fn);

			expect(result).toBe(true);
			expect(fn).toHaveBeenCalled();
			expect(process.exitCode).toBeUndefined();

			const spinnerObj = prompts.spinner();
			expect(spinnerObj.start).toHaveBeenCalledWith('In-process Step...');
			expect(spinnerObj.stop).toHaveBeenCalledWith('In-process Step');
		});

		it('should return false, stop spinner with error message, call cancel, and set exitCode 1 on failure', async () => {
			const error = new Error('In-process failure');
			const fn = vi.fn().mockRejectedValue(error);

			const result = await runInProcessStep('In-process Step', fn);

			expect(result).toBe(false);
			expect(prompts.cancel).toHaveBeenCalledWith('In-process Step failed: In-process failure');
			expect(process.exitCode).toBe(1);

			const spinnerObj = prompts.spinner();
			expect(spinnerObj.start).toHaveBeenCalledWith('In-process Step...');
			expect(spinnerObj.stop).toHaveBeenCalledWith('In-process Step failed', 1);
		});

		it('should handle synchronous functions', async () => {
			const fn = vi.fn().mockReturnValue(undefined);
			const result = await runInProcessStep('Sync Step', fn);

			expect(result).toBe(true);
			expect(fn).toHaveBeenCalled();

			const spinnerObj = prompts.spinner();
			expect(spinnerObj.start).toHaveBeenCalledWith('Sync Step...');
			expect(spinnerObj.stop).toHaveBeenCalledWith('Sync Step');
		});
	});
});
