# CLI Developer Guide

A practical guide for working on the `omni` CLI — testing, adding commands, and committing safely.

---

## Project Structure

```
packages/core/src/cli/
├── index.ts               # Entry point — Commander.js program, all command registrations
├── commands/
│   ├── init.ts            # omni init — scaffold new SvelteKit app via sv create
│   ├── add.ts             # omni add — add omni-svelte to an existing project
│   ├── generate.ts        # omni generate — generate schema / migration files
│   ├── db.ts              # omni db — Drizzle database tasks (push, pull, generate, etc.)
│   ├── migrate.ts         # omni migrate — run migrations
│   ├── dev.ts             # omni serve/build/test/lint/format — package script aliases
│   ├── doctor.ts          # omni doctor — project health checks
│   ├── install-dependency.ts  # omni install-dependency — install packages with detected PM
│   └── ui.ts              # omni ui — shadcn-svelte init/add flow
└── utils/
    ├── package-manager.ts # PM detection, getInstallArgs, getExecArgs, runPackageExec, etc.
    ├── project.ts         # hasPackageJson, hasViteConfig, addOmniToViteConfig
    └── run-step.ts        # runStep / runInProcessStep — error handling helpers (see below)
```

---

## Running the CLI Locally

Use `bun` to run the CLI directly from source — **no build step required**.

```bash
# From the repo root
bun packages/core/src/cli/index.ts --help

# From packages/core
bun src/cli/index.ts --help

# Test a specific command
bun packages/core/src/cli/index.ts init my-app --package-manager pnpm --skip-install
bun packages/core/src/cli/index.ts add --cwd /path/to/project --package-manager pnpm
bun packages/core/src/cli/index.ts doctor --cwd /path/to/project
bun packages/core/src/cli/index.ts generate schema User --cwd /path/to/project
```

> **Why bun?** Bun executes TypeScript natively with no compilation step. The snapshot tests also use `bun run src/cli/index.ts` for the same reason.

---

## Testing

### Run all unit + CLI tests (no browser required)

```bash
# From packages/core
pnpm vitest run --project server
```

This runs all 12 test files (173 tests) covering:
- CLI snapshot tests (help text, error messages, interactive flows)
- Package manager utility unit tests
- Vite plugin virtual module tests
- Schema generator tests

### Run only the CLI snapshot tests

```bash
pnpm vitest run --project server src/tests/unit/cli-snapshot.test.ts
```

### Update stale snapshots

After intentionally changing CLI output (help text, error messages), regenerate snapshots:

```bash
pnpm vitest run --project server src/tests/unit/cli-snapshot.test.ts --update-snapshot
```

### Manually test a command end-to-end

Create a scratch directory and run the CLI against it:

```bash
mkdir /tmp/cli-test && cd /tmp/cli-test
bun /path/to/omni-svelte/packages/core/src/cli/index.ts init test-app \
  --package-manager pnpm \
  --skip-install
```

---

## Error Handling: `runStep` and `runInProcessStep`

**Never write raw `try/catch` blocks in command handlers.** Use the helper functions from
[`utils/run-step.ts`](./utils/run-step.ts) instead. They handle the full error lifecycle —
spinner label, `try/catch`, `cancel()` display, and `process.exitCode = 1` — in one call.

### `runStep(label, fn)` — for subprocess steps

Use this for any step that calls `runPackageExec`, `installDependencies`, `runPackageInstall`,
or any other function that spawns a subprocess with `stdio: 'inherit'`.

The spinner is stopped before the function runs to prevent output conflicts with the subprocess.

```ts
import { runStep } from '../utils/run-step.js';

// Returns true on success, false on failure.
// On failure: cancel() is called with the error, process.exitCode is set to 1.
// The caller must 'return' immediately when false is returned.
if (!(await runStep('Installing omni-svelte', () =>
    installDependencies(['omni-svelte'], { cwd, packageManager })
)))
    return;
```

### `runInProcessStep(label, fn)` — for in-process steps

Use this for steps that do pure in-process work (file reads/writes, config parsing, etc.)
with no subprocess. The spinner stays animated while `fn` runs.

```ts
import { runInProcessStep } from '../utils/run-step.js';

if (!(await runInProcessStep('Configuring vite plugin', () => addOmniToViteConfig(cwd))))
    return;
```

### Validations before steps

For simple guard checks (not async steps), cancel manually and return:

```ts
if (!hasPackageJson(cwd)) {
    cancel(`No package.json found in ${cwd}.`);
    process.exitCode = 1;
    return;
}
```

---

## Ctrl+C / Signal Handling

A `SIGINT` handler is registered in `index.ts` that:
1. Displays a styled `cancel('Operation cancelled')` message via `@clack`
2. Exits with code `130` (the UNIX convention for Ctrl+C termination)

All subprocess calls use `cleanup: true` in `execa`, which automatically kills child
processes (e.g. `pnpm install`, `sv create`) when the parent CLI process exits.

**You do not need to handle SIGINT in individual command handlers** — it is global.

---

## Key Gotchas

### 1. `execa` does NOT use a shell — no shell quoting

When passing arguments to subprocesses via `runPackageExec` or `execa` directly, each element
of the `args` array is passed **literally** to the process. There is no shell to interpret quotes.

❌ Wrong:
```ts
'tailwindcss="plugins:none"'  // sv create receives literal quotes — Invalid option error
```

✅ Correct:
```ts
'tailwindcss=plugins:none'    // sv create receives the value as-is
```

> This was the root cause of the `omni init` tailwindcss bug (fixed in `fa7ff18`).

### 2. Stop spinners before `stdio: 'inherit'` subprocesses

`@clack/prompts` spinners animate the terminal. Running a subprocess with `stdio: 'inherit'`
while a spinner is active causes output to clash visually.

`runStep()` handles this automatically — it stops the spinner before calling your function.
Only use `runInProcessStep()` (which keeps the spinner running) for purely in-process work.

### 3. Run `intro()` before any validation

Always call `intro()` at the top of a command handler, **before** any validation that might
call `cancel()`. This ensures all output (including errors) is framed inside the `@clack` UI.

❌ Wrong:
```ts
if (!hasPackageJson(cwd)) cancel('No package.json found.'); // no intro box = unstyled output
intro(...);
```

✅ Correct:
```ts
intro(...);
if (!hasPackageJson(cwd)) {
    cancel('No package.json found.');
    process.exitCode = 1;
    return;
}
```

### 4. `process.cwd()` defaults are evaluated at import time

Commander evaluates `.option('--cwd <path>', 'desc', process.cwd())` when the module loads,
not when the command runs. This is intentional — it correctly defaults to the user's terminal
CWD. Snapshot tests normalize this value with `<CWD>` via `normalizeOutput()`.

---

## Adding a New Command

**1. Create `src/cli/commands/my-command.ts`**

```ts
import { cancel, intro, outro } from '@clack/prompts';
import pc from 'picocolors';
import { runStep, runInProcessStep } from '../utils/run-step.js';
import { installDependencies } from '../utils/package-manager.js';

export interface MyCommandOptions {
    cwd?: string;
}

export async function handleMyCommand(options: MyCommandOptions): Promise<void> {
    const cwd = options.cwd ?? process.cwd();

    intro(pc.bgGreen(pc.black(' OmniSvelte My Command ')));

    // Validation: manual cancel + return
    if (!someCondition) {
        cancel('Required condition not met.');
        process.exitCode = 1;
        return;
    }

    // Subprocess step: use runStep
    if (!(await runStep('Doing subprocess work', () => installDependencies(['some-pkg'], { cwd }))))
        return;

    // In-process step: use runInProcessStep
    if (!(await runInProcessStep('Doing in-process work', () => someInProcessFn(cwd))))
        return;

    outro(pc.green('Done!'));
}
```

**2. Register it in `src/cli/index.ts`**

```ts
import { handleMyCommand } from './commands/my-command.js';

program
    .command('my-command')
    .description('What it does')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
        await runAction(() => handleMyCommand({ cwd: options.cwd }));
    });
```

**3. Add snapshot tests in `src/tests/unit/cli-snapshot.test.ts`**

```ts
describe('CLI my-command', () => {
    it('my-command --help output matches snapshot', async () => {
        const { stdout, exitCode } = await runCli(['my-command', '--help']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatchSnapshot();
    });

    it('my-command with unknown option exits 1', async () => {
        const { stderr, exitCode } = await runCli(['my-command', '--bad-flag']);
        expect(exitCode).toBe(1);
        expect(stderr).toMatchSnapshot();
    });
});
```

**4. Generate initial snapshots**

```bash
pnpm vitest run --project server src/tests/unit/cli-snapshot.test.ts --update-snapshot
```

---

## Commit Checklist

Before committing CLI changes:

- [ ] `bun src/cli/index.ts --help` renders cleanly
- [ ] Manually tested the affected command(s) end-to-end
- [ ] `pnpm vitest run --project server` — all tests pass
- [ ] If CLI output changed: ran `--update-snapshot` and reviewed the diff
- [ ] All subprocess steps use `runStep()`, not raw `try/catch`
- [ ] All in-process steps use `runInProcessStep()`, not raw `try/catch`
- [ ] `intro()` is called before any `cancel()` / validation
- [ ] Subprocess args don't use shell-style quoting (see Gotcha #1)

---

## Package Manager Utilities Reference

All PM-specific logic lives in [`utils/package-manager.ts`](./utils/package-manager.ts).

| Function | Purpose |
|---|---|
| `detectPackageManager(cwd)` | Auto-detect PM from lockfile |
| `installDependencies(pkgs, opts)` | Install packages using detected or specified PM |
| `runPackageInstall(cwd, pm?)` | Run full `install` (e.g. `pnpm install`) |
| `runPackageExec(pkg, args, cwd, pm?)` | Run `dlx`/`bunx`/`npx` equivalent |
| `runScript(script, args, cwd, pm?)` | Run a `package.json` script |
| `getInstallArgs(pm, pkgs, dev)` | *(unit-testable)* Returns `{ command, args }` for install |
| `getExecArgs(pm, pkg, args)` | *(unit-testable)* Returns `{ command, args }` for exec |

All functions throw a descriptive `Error` on non-zero subprocess exit.
All subprocess calls use `cleanup: true` so child processes die with the parent.

`SUPPORTED_PACKAGE_MANAGERS` = `['npm', 'pnpm', 'yarn', 'bun', 'deno', 'vp']`
