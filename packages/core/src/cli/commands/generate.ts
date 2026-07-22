import { cancel, isCancel, select, text } from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, join, resolve, sep } from 'path';

export type GeneratorType = 'schema' | 'migration' | 'resource' | 'auth-page' | 'email';

export interface GenerateCommandOptions {
	schemaMode?: string;
	schemaOutputDir?: string;
	type?: GeneratorType;
	name?: string;
	output?: string;
	force?: boolean;
	cwd?: string;
}

export async function handleGenerateCommand(options: GenerateCommandOptions): Promise<void> {
	let type = options.type;
	let name = options.name;
	const cwd = options.cwd ?? process.cwd();

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
			placeholder: 'User',
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
			generateSchema(name, cwd, options.output, Boolean(options.force), options);
			break;
		case 'migration':
			generateMigration(name, cwd, options.output, Boolean(options.force));
			break;
		case 'resource':
			console.log(pc.yellow('Resource generator is planned and coming soon.'));
			break;
		case 'auth-page':
			console.log(pc.yellow('Auth page generator is planned and coming soon.'));
			break;
		case 'email':
			console.log(pc.yellow('Email template generator is planned and coming soon.'));
			break;
		default:
			throw new Error(`Unknown generator type: ${type}`);
	}
}

function generateSchema(
	name: string,
	cwd: string,
	output?: string,
	force = false,
	options?: GenerateCommandOptions
) {
	const safeName = sanitizeName(name);
	const tableName = toSnakeCase(safeName);
	const targetDir = output
		? join(cwd, output)
		: join(cwd, options?.schemaOutputDir ?? 'src/lib/db/schemas');
	const targetFile = join(targetDir, `${tableName}.schema.ts`);

	assertWithinDir(targetFile, targetDir);

	ensureDir(targetDir);
	if (existsSync(targetFile) && !force) {
		throw new Error(
			`Schema ${tableName} already exists at ${targetFile}. Use --force to overwrite.`
		);
	}

	const content = `import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('${tableName}', {
	id: field.uuid().primaryKey().defaultRandom(),
	// Add your fields here
});
`;

	writeFileSync(targetFile, content);
	console.log(pc.green(`✓ Schema ${tableName} created at ${targetFile}`));
}

export function toSnakeCase(value: string) {
	return value
		.replace(/([A-Z])/g, '_$1')
		.split(/[-_\s]+/)
		.filter(Boolean)
		.join('_')
		.toLowerCase();
}

function generateMigration(name: string, cwd: string, output?: string, force = false) {
	const safeName = sanitizeName(name);
	const timestamp = new Date()
		.toISOString()
		.replace(/[-T:.Z]/g, '')
		.slice(0, 14);
	const filename = `${timestamp}_${safeName}.ts`;
	const targetDir = output ? join(cwd, output) : join(cwd, 'migrations');
	const targetFile = join(targetDir, filename);

	assertWithinDir(targetFile, targetDir);

	ensureDir(targetDir);
	if (existsSync(targetFile) && !force) {
		throw new Error(
			`Migration ${filename} already exists at ${targetFile}. Use --force to overwrite.`
		);
	}

	const content = `import { Migration } from 'omni-svelte/database';

export default class extends Migration {
	async up() {
		// Implement migration
	}

	async down() {
		// Rollback migration
	}
}
`;

	writeFileSync(targetFile, content);
	console.log(pc.green(`✓ Migration created at ${targetFile}`));
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
	// Take only the basename to strip any directory segments
	let safe = basename(name);
	// Remove any remaining path traversal patterns
	safe = safe.replace(/\.\./g, '');
	// Keep only safe characters: letters, digits, hyphens, underscores
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
