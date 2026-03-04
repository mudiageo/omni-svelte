/**
 * Omni CLI - Command line interface
 * 
 * Provides the CLI tooling for schema generation, migrations,
 * code scaffolding, and other developer utilities
 */

// Types
export interface CliCommand {
    name: string;
    description: string;
    aliases?: string[];
    args?: CliArgument[];
    options?: CliOption[];
    action: (args: Record<string, any>, options: Record<string, any>) => Promise<void>;
}

export interface CliArgument {
    name: string;
    description: string;
    required?: boolean;
    default?: any;
}

export interface CliOption {
    name: string;
    alias?: string;
    description: string;
    type: 'string' | 'number' | 'boolean';
    default?: any;
    required?: boolean;
}

// Command registry
const commands = new Map<string, CliCommand>();

/**
 * Register a CLI command
 */
export function registerCommand(command: CliCommand): void {
    commands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            commands.set(alias, command);
        }
    }
}

/**
 * Run the CLI with the given arguments
 */
export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
    const [commandName, ...rest] = argv;

    if (!commandName || commandName === 'help' || commandName === '--help') {
        printHelp();
        return;
    }

    const command = commands.get(commandName);
    if (!command) {
        console.error(`❌ Unknown command: ${commandName}`);
        console.log(`Run 'omni help' to see available commands.\n`);
        process.exit(1);
    }

    // Parse arguments and options
    const { args, options } = parseArgs(rest, command);
    await command.action(args, options);
}

/**
 * Parse CLI arguments and options
 */
function parseArgs(
    argv: string[],
    command: CliCommand
): { args: Record<string, any>; options: Record<string, any> } {
    const args: Record<string, any> = {};
    const options: Record<string, any> = {};
    const positional: string[] = [];

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const opt = command.options?.find(o => o.name === key);
            if (opt?.type === 'boolean') {
                options[key] = true;
            } else {
                options[key] = argv[++i];
            }
        } else if (arg.startsWith('-')) {
            const alias = arg.slice(1);
            const opt = command.options?.find(o => o.alias === alias);
            if (opt) {
                if (opt.type === 'boolean') {
                    options[opt.name] = true;
                } else {
                    options[opt.name] = argv[++i];
                }
            }
        } else {
            positional.push(arg);
        }
    }

    // Map positional args
    if (command.args) {
        command.args.forEach((argDef, index) => {
            args[argDef.name] = positional[index] ?? argDef.default;
        });
    }

    // Apply option defaults
    if (command.options) {
        for (const opt of command.options) {
            if (options[opt.name] === undefined && opt.default !== undefined) {
                options[opt.name] = opt.default;
            }
        }
    }

    return { args, options };
}

/**
 * Print help text
 */
function printHelp(): void {
    console.log('\n🚀 Omni CLI\n');
    console.log('Usage: omni <command> [options]\n');
    console.log('Commands:');

    const allCommands = new Map<string, CliCommand>();
    for (const [name, cmd] of commands) {
        if (cmd.name === name) { // Skip aliases
            allCommands.set(name, cmd);
        }
    }

    for (const [name, cmd] of allCommands) {
        const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
        console.log(`  ${name.padEnd(20)}${cmd.description}${aliases}`);
    }

    console.log('\nRun "omni <command> --help" for more information on a command.\n');
}

// ─── Built-in Commands ───────────────────────────────────────────────────────

registerCommand({
    name: 'generate',
    description: 'Generate code from schema definitions',
    aliases: ['g', 'gen'],
    args: [
        { name: 'type', description: 'Type to generate (schema, model, migration)', required: true }
    ],
    options: [
        { name: 'output', alias: 'o', description: 'Output directory', type: 'string' },
        { name: 'force', alias: 'f', description: 'Overwrite existing files', type: 'boolean', default: false },
    ],
    action: async (args, options) => {
        console.log(`🔧 Generating ${args.type}...`);
        console.warn('⚠️  Generate command not yet implemented.');
    },
});

registerCommand({
    name: 'migrate',
    description: 'Run database migrations',
    aliases: ['m'],
    args: [
        { name: 'action', description: 'Migration action (run, rollback, status, fresh)', default: 'run' }
    ],
    options: [
        { name: 'seed', alias: 's', description: 'Run seeders after migration', type: 'boolean', default: false },
        { name: 'step', description: 'Number of migrations to run/rollback', type: 'number' },
    ],
    action: async (args, options) => {
        console.log(`🗄️  Running migration: ${args.action}...`);
        console.warn('⚠️  Migrate command not yet implemented.');
    },
});

registerCommand({
    name: 'make',
    description: 'Scaffold new files (model, schema, migration, etc.)',
    args: [
        { name: 'type', description: 'What to create (model, schema, migration, job, mail)', required: true },
        { name: 'name', description: 'Name of the file to create', required: true },
    ],
    options: [
        { name: 'directory', alias: 'd', description: 'Target directory', type: 'string' },
    ],
    action: async (args, options) => {
        console.log(`📝 Creating ${args.type}: ${args.name}...`);
        console.warn('⚠️  Make command not yet implemented.');
    },
});

registerCommand({
    name: 'seed',
    description: 'Run database seeders',
    options: [
        { name: 'class', alias: 'c', description: 'Specific seeder class to run', type: 'string' },
    ],
    action: async (args, options) => {
        console.log('🌱 Running seeders...');
        console.warn('⚠️  Seed command not yet implemented.');
    },
});

registerCommand({
    name: 'dev',
    description: 'Start the development server with Omni features',
    options: [
        { name: 'port', alias: 'p', description: 'Port number', type: 'number', default: 5173 },
        { name: 'host', description: 'Host to bind to', type: 'string', default: 'localhost' },
    ],
    action: async (args, options) => {
        console.log(`🚀 Starting Omni dev server on ${options.host}:${options.port}...`);
        console.warn('⚠️  Dev command not yet implemented.');
    },
});
