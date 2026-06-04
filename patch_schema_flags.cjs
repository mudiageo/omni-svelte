const fs = require('fs');

let file = 'packages/core/src/cli/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
/program\n\t\.command\('generate \[type\] \[name\]'\)[\s\S]*?\.option\('--cwd <path>', 'Working directory', process\.cwd\(\)\)/,
`program
	.command('generate [type] [name]')
	.alias('g')
	.description('Generate schema and migration files with interactive fallback')
	.option('-o, --output <path>', 'Custom output directory')
	.option('-f, --force', 'Overwrite existing output files', false)
	.option('--cwd <path>', 'Working directory', process.cwd())
	.option('--schema-mode <mode>', 'Override OmniConfig.schema.mode')
	.option('--schema-output-dir <dir>', 'Override OmniConfig.schema.output.directory')`
);

code = code.replace(
/handleGenerateCommand\(\{[\s\S]*?cwd: options\.cwd\n\t\t\t\}\)/,
`handleGenerateCommand({
				type,
				name,
				output: options.output,
				force: options.force,
				cwd: options.cwd,
				schemaMode: options.schemaMode,
				schemaOutputDir: options.schemaOutputDir
			})`
);

fs.writeFileSync(file, code);
