const fs = require('fs');
const file = 'packages/core/src/cli/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
	/\.description\('OmniSvelte CLI for scaffolding, database workflows, and DX tooling'\)/,
	`.description('OmniSvelte CLI for scaffolding, database workflows, and DX tooling for the OmniSvelte full-stack framework')`
);

if (!code.includes('/**')) {
	code = code.replace(
		/const program = new Command\(\);/,
		`/**
 * OmniSvelte CLI entry point.
 * This file configures the Commander.js program and its subcommands.
 */
const program = new Command();`
	);
	code = code.replace(
		/async function main\(\) {/,
		`/**
 * Main execution function for the CLI.
 * If no arguments are provided, it launches the interactive menu.
 */
async function main() {`
	);
	code = code.replace(
		/async function showInteractiveMenu\(\) {/,
		`/**
 * Displays an interactive selection menu for standard CLI commands
 * using @clack/prompts when the CLI is run without arguments.
 */
async function showInteractiveMenu() {`
	);
	code = code.replace(
		/async function runAction\(action: \(\) => Promise<void>\) {/,
		`/**
 * Runs a given CLI action function and handles top-level error catching.
 * @param {() => Promise<void>} action The async action to execute.
 */
async function runAction(action: () => Promise<void>) {`
	);
}
fs.writeFileSync(file, code);
