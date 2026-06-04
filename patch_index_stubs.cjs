const fs = require('fs');
const file = 'packages/core/src/cli/index.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('tinker')) {
const stubs = `
program
	.command('tinker')
	.description('Interactive REPL with models pre-loaded (planned)')
	.action(() => {
		console.log(pc.yellow('Tinker command is planned and coming soon.'));
	});

program
	.command('deploy')
	.description('Deployment helper (planned)')
	.option('--env <name>', 'Target environment')
	.action(() => {
		console.log(pc.yellow('Deploy command is planned and coming soon.'));
	});

program
	.command('docs:generate')
	.description('Generate API docs from schema + JSDoc (planned)')
	.action(() => {
		console.log(pc.yellow('Docs generate command is planned and coming soon.'));
	});

program
	.command('docs:serve')
	.description('Serve generated docs locally (planned)')
	.action(() => {
		console.log(pc.yellow('Docs serve command is planned and coming soon.'));
	});

program
	.command('debug [target]')
	.description('Diagnostic commands (routes, models, config) (planned)')
	.action(() => {
		console.log(pc.yellow('Debug command is planned and coming soon.'));
	});

program
	.command('cache:clear')
	.description('Clear application cache (planned)')
	.action(() => {
		console.log(pc.yellow('Cache clear command is planned and coming soon.'));
	});

program
	.command('monitor [target]')
	.description('Monitor queries or realtime connections (planned)')
	.action(() => {
		console.log(pc.yellow('Monitor command is planned and coming soon.'));
	});

addDevAlias('serve', 'Run local development server', 'serve');`;

code = code.replace(/addDevAlias\('serve', 'Run local development server', 'serve'\);/, stubs);
fs.writeFileSync(file, code);
}
