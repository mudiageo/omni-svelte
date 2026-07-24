import { cancel, spinner as clackSpinner } from '@clack/prompts';

/**
 * Runs an async CLI step with automatic error handling.
 *
 * - Prints a step label (via spinner start/stop, since subprocesses use stdio:'inherit')
 * - Catches any thrown errors and surfaces them via @clack cancel()
 * - Sets process.exitCode = 1 on failure
 * - Returns true on success, false on failure — callers should `return` immediately on false
 *
 * @example
 * if (!await runStep('Creating SvelteKit project', () => runPackageExec('sv', [...]))) return;
 * if (!await runStep('Installing omni-svelte', () => installDependencies(['omni-svelte']))) return;
 */
export async function runStep(label: string, fn: () => Promise<unknown>): Promise<boolean> {
	const s = clackSpinner();
	// Start then immediately stop: subprocesses use stdio:'inherit' which conflicts
	// with spinner animation, so we use the spinner purely as a step label printer.
	s.start(`${label}...`);
	s.stop(label);

	try {
		await fn();
		return true;
	} catch (err) {
		cancel(`${label} failed: ${err instanceof Error ? err.message : String(err)}`);
		process.exitCode = 1;
		return false;
	}
}

/**
 * Runs an async CLI step that has no subprocess output (pure in-process work).
 * Uses the spinner animation since there's no stdio conflict.
 *
 * - Shows an animated spinner while `fn` runs
 * - On success: stops the spinner with a ✓ stop message
 * - On failure: cancels with a styled error message via @clack cancel()
 * - Returns true on success, false on failure
 *
 * @example
 * if (!await runInProcessStep('Configuring vite plugin', () => addOmniToViteConfig(cwd))) return;
 */
export async function runInProcessStep(
	label: string,
	fn: () => Promise<unknown> | unknown
): Promise<boolean> {
	const s = clackSpinner();
	s.start(`${label}...`);
	try {
		await fn();
		s.stop(label);
		return true;
	} catch (err) {
		s.stop(`${label} failed`, 1);
		cancel(`${label} failed: ${err instanceof Error ? err.message : String(err)}`);
		process.exitCode = 1;
		return false;
	}
}
