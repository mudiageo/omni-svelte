import { describe, expect, it } from 'vitest';
import { execa } from 'execa';
import { join } from 'path';

/**
 * Snapshot tests for the OmniSvelte CLI.
 *
 * These tests invoke the CLI via `bun run src/cli/index.ts` as a subprocess,
 * capture its stdout/stderr, and snapshot the output to catch regressions in
 * help text, error messages, and command behaviour.
 *
 * Run with:
 *   pnpm vitest run --project server src/tests/unit/cli-snapshot.test.ts
 *
 * Regenerate snapshots after intentional output changes:
 *   pnpm vitest run --project server src/tests/unit/cli-snapshot.test.ts --update
 */

const CLI_CWD = join(import.meta.dirname, '..', '..', '..');
const CLI_ENTRY = join(CLI_CWD, 'src', 'cli', 'index.ts');

/** Run the CLI with given args and return stdout, stderr, and exitCode. */
async function runCli(args: string[], opts: { timeout?: number } = {}) {
	const result = await execa('bun', ['run', CLI_ENTRY, ...args], {
		cwd: CLI_CWD,
		reject: false,
		timeout: opts.timeout ?? 15_000
	});

	return {
		stdout: normalizeOutput(result.stdout),
		stderr: normalizeOutput(result.stderr),
		exitCode: result.exitCode
	};
}

/**
 * Normalize dynamic / machine-specific values so snapshots are deterministic:
 *   - Strip ANSI escape codes
 *   - Replace absolute Windows paths with <CWD>
 *   - Trim trailing whitespace per line
 */
function normalizeOutput(output: string): string {
	return (
		output
			// Strip ANSI escape codes
			.replace(/\x1B\[\d+m/g, '')
			// eslint-disable-next-line no-control-regex
			.replace(/\x1B\[[\d;]*[A-Za-z]/g, '')
			// Normalize Windows-style backslash paths (e.g. C:\Users\foo\bar)
			.replace(/[A-Z]:\\[^\s")\n]*/gi, '<CWD>')
			// Normalize forward-slash absolute paths that start with a drive letter
			.replace(/[A-Z]:\/[^\s")\n]*/gi, '<CWD>')
			// Trim trailing whitespace on each line
			.replace(/[^\S\n]+$/gm, '')
			.trim()
	);
}

// ─── Top-level CLI ───────────────────────────────────────────────────────────

describe('CLI top-level', () => {
	it('--help output matches snapshot', async () => {
		const { stdout, exitCode } = await runCli(['--help']);
		expect(exitCode).toBe(0);
		expect(stdout).toMatchSnapshot();
	});

	it('--version outputs a semver string', async () => {
		const { stdout, exitCode } = await runCli(['--version']);
		expect(exitCode).toBe(0);
		// Version must be a semver triple — don't snapshot so version bumps don't break CI.
		expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('unknown command exits 1 and shows error + suggestion', async () => {
		const { stderr, exitCode } = await runCli(['unknowncmd']);
		expect(exitCode).toBe(1);
		expect(stderr).toMatchSnapshot();
	});
});

// ─── init command ────────────────────────────────────────────────────────────

describe('CLI init command', () => {
	it('init --help output matches snapshot', async () => {
		const { stdout, exitCode } = await runCli(['init', '--help']);
		expect(exitCode).toBe(0);
		expect(stdout).toMatchSnapshot();
	});

	it('init with unknown option exits 1 and shows error', async () => {
		const { stderr, exitCode } = await runCli(['init', '--nonexistent-flag']);
		expect(exitCode).toBe(1);
		expect(stderr).toMatchSnapshot();
	});
});

// ─── add command ─────────────────────────────────────────────────────────────

describe('CLI add command', () => {
	it('add --help output matches snapshot', async () => {
		const { stdout, exitCode } = await runCli(['add', '--help']);
		expect(exitCode).toBe(0);
		expect(stdout).toMatchSnapshot();
	});

	// Bug 4 fix verification: after the fix, intro() runs before the check so
	// the cancel() message appears on stdout (inside @clack framing) rather than
	// being thrown and caught as a bare red error on stderr.
	it('add --cwd with missing package.json shows styled cancel on stdout and exits non-zero', async () => {
		const { stdout, stderr, exitCode } = await runCli([
			'add',
			'--cwd',
			'C:/nonexistent/missing-project'
		]);
		// After Bug 4 fix, error goes through cancel() → stdout, not throw → stderr
		expect(exitCode).not.toBe(0);
		expect(stdout).toMatchSnapshot('add missing pkg.json stdout');
		expect(stderr).toMatchSnapshot('add missing pkg.json stderr');
	});

	it('add with unknown option exits 1 and shows error', async () => {
		const { stderr, exitCode } = await runCli(['add', '--nonexistent-flag']);
		expect(exitCode).toBe(1);
		expect(stderr).toMatchSnapshot();
	});

	it(
		'add with --package-manager flag skips interactive PM prompt and proceeds to install',
		{ timeout: 35_000 },
		async () => {
			// Use a fake package name so the install fails fast without network access.
			// The important thing: process exits without hanging on the PM select prompt.
			const result = await execa(
				'bun',
				[
					'run',
					CLI_ENTRY,
					'add',
					'--cwd',
					CLI_CWD,
					'--package-manager',
					'pnpm',
					'--omni-pkg',
					'omni-svelte-nonexistent-test-pkg'
				],
				{ cwd: CLI_CWD, reject: false, timeout: 30_000 }
			);
			// Must exit (not hang). The install will fail because the package doesn't exist.
			expect(result.exitCode).not.toBe(0);
		}
	);
});

// ─── package-manager utils (unit) ────────────────────────────────────────────

describe('package-manager utils', () => {
	it('getInstallArgs for deno includes --dev when dev=true (Bug 5 regression test)', async () => {
		const { getInstallArgs } = await import('../../cli/utils/package-manager.js');

		const devArgs = getInstallArgs('deno', ['zod'], true);
		expect(devArgs.args).toContain('--dev');

		const prodArgs = getInstallArgs('deno', ['zod'], false);
		expect(prodArgs.args).not.toContain('--dev');
	});

	it('getInstallArgs for bun uses -d (lowercase) for dev dependencies', async () => {
		const { getInstallArgs } = await import('../../cli/utils/package-manager.js');
		const devArgs = getInstallArgs('bun', ['zod'], true);
		expect(devArgs.args).toContain('-d');
	});

	it('getInstallArgs for npm appends --save-dev for dev dependencies', async () => {
		const { getInstallArgs } = await import('../../cli/utils/package-manager.js');
		const devArgs = getInstallArgs('npm', ['zod'], true);
		expect(devArgs.args).toContain('--save-dev');
		const prodArgs = getInstallArgs('npm', ['zod'], false);
		expect(prodArgs.args).not.toContain('--save-dev');
	});
});
