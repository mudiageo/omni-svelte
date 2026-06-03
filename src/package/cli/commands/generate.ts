import mri from 'mri';
import { select, text, isCancel, outro, cancel } from '@clack/prompts';
import pc from 'picocolors';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

export async function handleGenerateCommand(args: mri.Argv) {
	let type = args._[1];
	let name = args._[2];

	if (!type) {
		const typeSelection = await select({
			message: 'What do you want to generate?',
			options: [
				{ value: 'model', label: 'Model' },
				{ value: 'migration', label: 'Migration' },
				{ value: 'controller', label: 'Controller' },
				{ value: 'middleware', label: 'Middleware' },
				{ value: 'policy', label: 'Policy' },
				{ value: 'resource', label: 'Resource' },
			],
		});
		if (isCancel(typeSelection)) {
			cancel('Operation cancelled');
			return process.exit(0);
		}
		type = typeSelection as string;
	}

	if (!name) {
		const nameInput = await text({
			message: `What is the name of the ${type}?`,
			placeholder: 'User',
			validate(value) {
				if (value.length === 0) return 'Name is required';
			},
		});
		if (isCancel(nameInput)) {
			cancel('Operation cancelled');
			return process.exit(0);
		}
		name = nameInput as string;
	}

	switch (type) {
		case 'model':
			generateModel(name);
			break;
		case 'migration':
			generateMigration(name);
			break;
		case 'controller':
		case 'middleware':
		case 'policy':
		case 'resource':
			console.log(pc.yellow(`${type} generation not yet implemented.`));
			break;
		default:
			console.log(pc.red(`Unknown generator type: ${type}`));
	}
}

function generateModel(name: string) {
const className = name.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
	const content = `import { Model } from 'omni-svelte/database';
// import { ${name.toLowerCase()}Table } from '$lib/schema/${name.toLowerCase()}';

export class ${className} extends Model {
  // static table = ${name.toLowerCase()}Table;
}
`;
	const dir = join(process.cwd(), 'src/lib/models');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const filepath = join(dir, `${className}.ts`);
	if (existsSync(filepath)) {
		console.log(pc.red(`Model ${className} already exists at ${filepath}`));
		return;
	}

	writeFileSync(filepath, content);
	console.log(pc.green(`✓ Model ${className} created at ${filepath}`));
}

function generateMigration(name: string) {
	const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
	const filename = `${timestamp}_${name}.ts`;
	const content = `import { Migration } from 'omni-svelte/database';

export default class extends Migration {
  async up() {
    // await this.createTable('table_name', \` ... \`);
  }

  async down() {
    // await this.dropTable('table_name');
  }
}
`;
	const dir = join(process.cwd(), 'migrations');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const filepath = join(dir, filename);
	writeFileSync(filepath, content);
	console.log(pc.green(`✓ Migration created at ${filepath}`));
}
