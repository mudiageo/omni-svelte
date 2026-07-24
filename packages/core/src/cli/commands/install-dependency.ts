import pc from 'picocolors';
import { installDependencies } from '../utils/package-manager.js';

export interface InstallDependencyCommandOptions {
	packages: string[];
	cwd?: string;
	dev?: boolean;
}

export async function handleInstallDependencyCommand(
	options: InstallDependencyCommandOptions
): Promise<void> {
	if (options.packages.length === 0) {
		throw new Error('At least one package name is required.');
	}

	const pm = await installDependencies(options.packages, {
		cwd: options.cwd,
		dev: Boolean(options.dev)
	});

	console.log(pc.green(`Installed ${options.packages.join(', ')} using ${pm.name}.`));
}
