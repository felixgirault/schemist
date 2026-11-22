import {gradeAll} from './grade.ts';
import {parseOptions, runAll} from './run.ts';

console.log(
	gradeAll(await runAll(parseOptions(process.argv.slice(2))))
);
