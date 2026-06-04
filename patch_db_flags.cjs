const fs = require('fs');

// Patch db/migrate flags
let file = 'packages/core/src/cli/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
/program\n\t\.command\('db \[action\]'\)[\s\S]*?\.option\('--cwd <path>', 'Working directory', process\.cwd\(\)\)/,
`program
	.command('db [action]')
	.description('Run Drizzle database tasks (push, pull, generate, migrate, seed)')
	.option('--config <path>', 'Path to drizzle config file')
	.option('--script <name>', 'Script name for db seed task', 'db:seed')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('--db-url <url>', 'Override database connection URL')`
);

code = code.replace(
/handleDbCommand\(\{[\s\S]*?cwd: options\.cwd,[\s\S]*?config: options\.config,[\s\S]*?script: options\.script\n\t\t\t\}\)/,
`handleDbCommand({
				action: selectedAction,
				cwd: options.cwd,
				config: options.config,
				script: options.script,
				dbUrl: options.dbUrl
			})`
);

code = code.replace(
/program\n\t\.command\('migrate \[action\]'\)[\s\S]*?\.option\('--config <path>', 'Path to drizzle config file'\)/,
`program
	.command('migrate [action]')
	.description('Run migrations with safe defaults')
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('--config <path>', 'Path to drizzle config file')
	.option('--db-url <url>', 'Override database connection URL')`
);

code = code.replace(
/handleMigrateCommand\(\{[\s\S]*?action,[\s\S]*?cwd: options\.cwd,[\s\S]*?config: options\.config\n\t\t\t\}\)/,
`handleMigrateCommand({
				action,
				cwd: options.cwd,
				config: options.config,
				dbUrl: options.dbUrl
			})`
);

fs.writeFileSync(file, code);

// Patch commands/db.ts
file = 'packages/core/src/cli/commands/db.ts';
code = fs.readFileSync(file, 'utf8');

if(!code.includes('dbUrl?: string;')) {
    code = code.replace(/export interface DbCommandOptions \{/, `export interface DbCommandOptions {
	dbUrl?: string;`);
}

fs.writeFileSync(file, code);

// Patch commands/migrate.ts
file = 'packages/core/src/cli/commands/migrate.ts';
code = fs.readFileSync(file, 'utf8');

if(!code.includes('dbUrl?: string;')) {
    code = code.replace(/export interface MigrateCommandOptions \{/, `export interface MigrateCommandOptions {
	dbUrl?: string;`);
}

fs.writeFileSync(file, code);
