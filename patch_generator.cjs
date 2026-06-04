const fs = require('fs');

// Patch generate.ts
let file = 'packages/core/src/cli/commands/generate.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/'model' \| 'migration' \| 'resource' \| 'auth-page' \| 'email'/, `'schema' | 'migration' | 'resource' | 'auth-page' | 'email'`);
code = code.replace(/\{ value: 'model', label: 'Model' \}/, `{ value: 'schema', label: 'Schema' }`);
code = code.replace(/type === 'model'/g, `type === 'schema'`);
code = code.replace(/case 'model':/, `case 'schema':`);

code = code.replace(/generateModel\(name, cwd, options\.output, Boolean\(options\.force\)\);/, `generateSchema(name, cwd, options.output, Boolean(options.force), options);`);

code = code.replace(/export interface GenerateCommandOptions \{/, `export interface GenerateCommandOptions {
	schemaMode?: string;
	schemaOutputDir?: string;`);

code = code.replace(/function generateModel\([\s\S]*?function generateMigration/m, `function generateSchema(name: string, cwd: string, output?: string, force = false, options?: GenerateCommandOptions) {
	const tableName = toSnakeCase(name);
	const targetDir = output ? join(cwd, output) : join(cwd, options?.schemaOutputDir ?? 'src/lib/db/schemas');
	const targetFile = join(targetDir, \`\${tableName}.ts\`);

	ensureDir(targetDir);
	if (existsSync(targetFile) && !force) {
		throw new Error(
			\`Schema \${tableName} already exists at \${targetFile}. Use --force to overwrite.\`
		);
	}

	const content = \`import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('\${tableName}', {
	id: field.uuid().primaryKey().defaultRandom(),
	// Add your fields here
});
\`;

	writeFileSync(targetFile, content);
	console.log(pc.green(\`✓ Schema \${tableName} created at \${targetFile}\`));
}

function toSnakeCase(value: string) {
	return value
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '');
}

function generateMigration`);

fs.writeFileSync(file, code);

// Patch index.ts
file = 'packages/core/src/cli/index.ts';
code = fs.readFileSync(file, 'utf8');

code = code.replace(/omni generate model User --output src\/lib\/models/, "omni generate schema users --output src/lib/db/schemas");
code = code.replace(/Generate model and migration files with interactive fallback/, "Generate schema and migration files with interactive fallback");
code = code.replace(/\{ value: \['generate'\], label: 'generate — Create model or migration' \}/, "{ value: ['generate'], label: 'generate — Create schema or migration' }");

fs.writeFileSync(file, code);
