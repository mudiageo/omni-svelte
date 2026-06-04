import mri from 'mri';
import { execa } from 'execa';
import pc from 'picocolors';

export async function handleMigrateCommand(args: mri.Argv) {
	// 'omni migrate' -> typically 'drizzle-kit migrate'
    // But drizzle-kit migrate requires config.
    // We can wrap it.

    console.log(pc.dim('Running migrations...'));
    try {
         await execa('npx', ['drizzle-kit', 'migrate'], { stdio: 'inherit' });
    } catch (e) {
        //
    }
}
