// src/package/cli/commands/dev.ts
import mri from 'mri';
import { select, isCancel, cancel } from '@clack/prompts';
import { execa } from 'execa';
import pc from 'picocolors';

export async function handleDevCommand(args: mri.Argv) {
    let subCommand = args._[1];

    if (!subCommand) {
        const action = await select({
            message: 'Development Tools:',
            options: [
                { value: 'serve', label: 'Start Dev Server' },
                { value: 'build', label: 'Build Project' },
                { value: 'test', label: 'Run Tests' },
                { value: 'lint', label: 'Lint Code' },
                { value: 'format', label: 'Format Code' },
            ],
        });
        if (isCancel(action)) {
            cancel('Operation cancelled');
            return process.exit(0);
        }
        subCommand = action as string;
    }

    switch(subCommand) {
        case 'serve':
            await runScript('dev');
            break;
        case 'build':
            await runScript('build');
            break;
        case 'test':
            await runScript('test');
            break;
        case 'lint':
            await runScript('lint');
            break;
        case 'format':
            await runScript('format');
            break;
        default:
            console.log(pc.red(`Unknown dev command: ${subCommand}`));
    }
}

async function runScript(scriptName: string) {
    console.log(pc.dim(`Running npm run ${scriptName}...`));
    try {
        await execa('npm', ['run', scriptName], { stdio: 'inherit' });
    } catch (e) {
        console.log(pc.yellow(`Failed to run script: ${scriptName}`));
    }
}
