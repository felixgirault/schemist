import {readFileSync} from 'node:fs';
import {run, usage} from './commands.js';

try {
	process.stdout.write(
		`${run(process.argv.slice(2), (path) =>
			readFileSync(path === '-' ? 0 : path, 'utf8')
		)}\n`
	);
} catch (error) {
	process.stderr.write(
		`error: ${(error as Error).message}\n\n${usage}`
	);
	process.exitCode = 1;
}
