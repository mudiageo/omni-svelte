import { cancel, isCancel, select, text } from '@clack/prompts';
import { execa } from 'execa';
import pc from 'picocolors';

export interface UiCommandOptions {
action?: 'init' | 'add';
components?: string[];
cwd?: string;
yes?: boolean;
}

export async function handleUiCommand(options: UiCommandOptions): Promise<void> {
let action = options.action;
const cwd = options.cwd ?? process.cwd();

if (!action) {
const selection = await select({
message: 'UI action',
options: [
{ value: 'init', label: 'Initialize shadcn-svelte' },
{ value: 'add', label: 'Add shadcn component' },
],
});

if (isCancel(selection)) {
cancel('Operation cancelled');
return;
}

action = selection as UiCommandOptions['action'];
}

let components = options.components ?? [];
if (action === 'add' && components.length === 0) {
const value = await text({
message: 'Component names (space separated)',
placeholder: 'button card dialog',
});

if (isCancel(value)) {
cancel('Operation cancelled');
return;
}

components = String(value)
.split(/\s+/)
.map((entry) => entry.trim())
.filter(Boolean);
}

const args =
action === 'add'
? ['shadcn-svelte@latest', 'add', ...components, ...(options.yes ? ['--yes'] : [])]
: ['shadcn-svelte@latest', 'init', ...(options.yes ? ['--yes'] : [])];

console.log(pc.dim(`Running npx ${args.join(' ')}`));
await execa('npx', args, { cwd, stdio: 'inherit' });
}
