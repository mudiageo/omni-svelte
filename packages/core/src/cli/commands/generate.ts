import { cancel, confirm, intro, isCancel, log, outro, select, text } from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, join, resolve, sep } from 'path';
import { findProjectRoot, isSvelteKitProject } from '../utils/project.js';

export type GeneratorType = 'schema' | 'migration' | 'resource' | 'auth-page' | 'email';

export interface GenerateCommandOptions {
	schemaMode?: string;
	schemaOutputDir?: string;
	type?: GeneratorType;
	name?: string;
	output?: string;
	force?: boolean;
	dryRun?: boolean;
	cwd?: string;
}

export async function handleGenerateCommand(options: GenerateCommandOptions): Promise<void> {
	let type = options.type;
	let name = options.name;

	// Auto-detect project root if user is in a subdirectory
	const rawCwd = options.cwd ?? process.cwd();
	const cwd = findProjectRoot(rawCwd);
	if (cwd !== rawCwd) {
		log.info(`Using project root: ${pc.dim(cwd)}`);
	}

	// Guard: only allow running in a SvelteKit project
	if (!isSvelteKitProject(cwd)) {
		cancel(
			`No svelte.config.js found in ${pc.bold(cwd)}.\nRun ${pc.cyan('omni generate')} from within a SvelteKit project.`
		);
		process.exitCode = 1;
		return;
	}

	intro(pc.bgGreen(pc.black(' OmniSvelte Generate ')));

	if (!type) {
		const selectedType = await select({
			message: 'What do you want to generate?',
			options: [
				{ value: 'schema', label: 'schema — Generate a schema' },
				{ value: 'migration', label: 'migration — Create a migration' },
				{ value: 'resource', label: 'resource — Scaffold a new resource' },
				{ value: 'auth-page', label: 'auth-page — Generate an auth page' },
				{ value: 'email', label: 'email — Create an email template' }
			]
		});

		if (isCancel(selectedType)) {
			cancel('Operation cancelled');
			return;
		}

		type = selectedType as GeneratorType;
	}

	if (type !== 'auth-page' && !name) {
		const enteredName = await text({
			message: `Name for ${type}`,
			placeholder: type === 'schema' ? 'User' : type === 'migration' ? 'add_users_table' : 'MyResource',
			validate(value) {
				if (!value.trim()) return 'Name is required';
			}
		});

		if (isCancel(enteredName)) {
			cancel('Operation cancelled');
			return;
		}

		name = String(enteredName);
	}

	if ((type === 'schema' || type === 'migration') && !name) {
		throw new Error(`A name is required for "${type}" generator.`);
	}

	switch (type) {
		case 'schema':
			await generateSchema(name, cwd, options.output, Boolean(options.force), Boolean(options.dryRun), options);
			break;
		case 'migration':
			await generateMigration(name, cwd, options.output, Boolean(options.force), Boolean(options.dryRun));
			break;
		case 'resource':
			log.warn('Resource generator is planned and coming soon.');
			break;
		case 'auth-page':
			log.warn('Auth page generator is planned and coming soon.');
			break;
		case 'email':
			log.warn('Email template generator is planned and coming soon.');
			break;
		default:
			throw new Error(`Unknown generator type: ${type}`);
	}
}

async function generateSchema(
	name: string,
	cwd: string,
	output?: string,
	force = false,
	dryRun = false,
	options?: GenerateCommandOptions
) {
	const safeName = sanitizeName(name);
	const tableName = toSnakeCase(safeName);
	const targetDir = output
		? join(cwd, output)
		: join(cwd, options?.schemaOutputDir ?? 'src/lib/db/schemas');
	const targetFile = join(targetDir, `${tableName}.schema.ts`);

	assertWithinDir(targetFile, targetDir);

	const content = `import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('${tableName}', {
\tid: field.uuid().primaryKey().defaultRandom(),
\t// Add your fields here
});
`;

	if (dryRun) {
		outro(`${pc.cyan('[dry-run]')} Would create: ${pc.bold(targetFile)}\n\n${pc.dim(content)}`);
		return;
	}

	if (existsSync(targetFile) && !force) {
		const shouldOverwrite = await confirm({
			message: `${pc.yellow(targetFile)} already exists. Overwrite?`,
			initialValue: false
		});
		if (isCancel(shouldOverwrite) || !shouldOverwrite) {
			cancel('Aborted. Use --force to overwrite without prompting.');
			process.exitCode = 1;
			return;
		}
	}

	ensureDir(targetDir);
	writeFileSync(targetFile, content);
	outro(`${pc.green('✔')} Schema ${pc.bold(tableName)} created at ${pc.dim(targetFile)}`);
}

async function generateMigration(
	name: string,
	cwd: string,
	output?: string,
	force = false,
	dryRun = false
) {
	const safeName = sanitizeName(name);
	const timestamp = new Date()
		.toISOString()
		.replace(/[-T:.Z]/g, '')
		.slice(0, 14);
	const filename = `${timestamp}_${safeName}.ts`;
	const targetDir = output ? join(cwd, output) : join(cwd, 'migrations');
	const targetFile = join(targetDir, filename);

	assertWithinDir(targetFile, targetDir);

	const content = `import { Migration } from 'omni-svelte/database';

export default class extends Migration {
\tasync up() {
\t\t// Implement migration
\t}

\tasync down() {
\t\t// Rollback migration
\t}
}
`;

	if (dryRun) {
		outro(`${pc.cyan('[dry-run]')} Would create: ${pc.bold(targetFile)}\n\n${pc.dim(content)}`);
		return;
	}

	if (existsSync(targetFile) && !force) {
		const shouldOverwrite = await confirm({
			message: `${pc.yellow(targetFile)} already exists. Overwrite?`,
			initialValue: false
		});
		if (isCancel(shouldOverwrite) || !shouldOverwrite) {
			cancel('Aborted. Use --force to overwrite without prompting.');
			process.exitCode = 1;
			return;
		}
	}

	ensureDir(targetDir);
	writeFileSync(targetFile, content);
	outro(`${pc.green('✔')} Migration created at ${pc.dim(targetFile)}`);
}

export function toSnakeCase(value: string) {
	return value
		.replace(/([A-Z])/g, '_$1')
		.split(/[-_\s]+/)
		.filter(Boolean)
		.join('_')
		.toLowerCase();
}

function ensureDir(path: string) {
	if (!existsSync(path)) {
		mkdirSync(path, { recursive: true });
	}
}

/**
 * Sanitize a user-provided name to prevent path traversal.
 * Strips path separators, `..`, and normalizes to safe characters.
 */
function sanitizeName(name: string): string {
	let safe = basename(name);
	safe = safe.replace(/\.\./g, '');
	safe = safe.replace(/[^a-zA-Z0-9_-]/g, '');
	if (!safe) {
		throw new Error(
			`Invalid name: "${name}". Name must contain at least one alphanumeric character.`
		);
	}
	return safe;
}

/**
 * Assert that a resolved file path is within the expected target directory.
 */
function assertWithinDir(filePath: string, dirPath: string): void {
	const resolvedFile = resolve(filePath);
	const resolvedDir = resolve(dirPath);
	if (!resolvedFile.startsWith(resolvedDir + sep) && resolvedFile !== resolvedDir) {
		throw new Error(`Path traversal detected: ${filePath} escapes ${dirPath}`);
	}
}
