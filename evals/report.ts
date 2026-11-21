import type {Result} from './graders.ts';

export type Meta = {
	cost?: number;
	turns?: number;
	durationMs?: number;
	model?: string;
	ref?: string;
	status?: string;
};

export type GradedRun = {
	name: string;
	meta: Meta;
	// Grader name to its result.
	results: Record<string, Result>;
	score: number;
};

export type GradedCase = {
	name: string;
	weights: Record<string, number>;
	runs: GradedRun[];
	score: number;
};

const mean = (values: number[]) =>
	values.length
		? values.reduce((a, b) => a + b, 0) / values.length
		: 0;

// Weighted fraction of graders passed.
export const score = (
	weights: Record<string, number>,
	results: Record<string, Result>
) => {
	const total = Object.values(weights).reduce(
		(a, b) => a + b,
		0
	);
	const passed = Object.entries(weights)
		.filter(([name]) => results[name]?.pass)
		.reduce((sum, [, weight]) => sum + weight, 0);

	return total ? passed / total : 0;
};

export const gradeCase = (
	name: string,
	weights: Record<string, number>,
	runs: Omit<GradedRun, 'score'>[]
): GradedCase => {
	const graded = runs.map((run) => ({
		...run,
		score: score(weights, run.results)
	}));

	return {
		name,
		weights,
		runs: graded,
		score: mean(graded.map((run) => run.score))
	};
};

const fixed = (n: number) => n.toFixed(2);

const row = (cells: (string | number)[]) =>
	`| ${cells.join(' | ')} |`;

const metric = (
	label: string,
	runs: GradedRun[],
	get: (meta: Meta) => string | number | undefined,
	show: (value: string | number) => string = String
) =>
	row([
		label,
		'',
		...runs.map((run) => {
			const value = get(run.meta);
			return value === undefined ? '-' : show(value);
		})
	]);

// What failed in a run, besides the pass/fail marks.
const problems = ({runs}: GradedCase) =>
	runs.flatMap((run) =>
		Object.entries(run.results).flatMap(([grader, result]) =>
			[
				...(result.problems ?? []),
				...(result.pairs ?? [])
					.filter(({pass}) => !pass)
					.map(
						(p) =>
							`${p.tree}: ${p.fg} on ${p.bg}, ${p.metric} ${p.level} < ${p.target}`
					)
			].map((line) => `- ${run.name}, ${grader}: ${line}`)
		)
	);

const section = (c: GradedCase) => {
	const names = c.runs.map((run) => run.name);
	const lines = problems(c);

	return [
		`## ${c.name}`,
		`Score: ${fixed(c.score)}`,
		[
			row(['Grader', 'Weight', ...names]),
			row(['---', '---', ...names.map(() => '---')]),
			...Object.entries(c.weights).map(([name, weight]) =>
				row([
					name,
					weight,
					...c.runs.map((run) =>
						run.results[name]?.pass ? '✓' : '✗'
					)
				])
			),
			row([
				'**Score**',
				'',
				...c.runs.map((run) => fixed(run.score))
			]),
			metric(
				'Cost',
				c.runs,
				(m) => m.cost,
				(v) => `$${fixed(v as number)}`
			),
			metric('Turns', c.runs, (m) => m.turns),
			metric(
				'Duration',
				c.runs,
				(m) => m.durationMs,
				(v) => `${Math.round((v as number) / 1000)} s`
			),
			metric('Model', c.runs, (m) => m.model),
			metric('Status', c.runs, (m) => m.status)
		].join('\n'),
		...(lines.length
			? ['Failed checks:', lines.join('\n')]
			: [])
	];
};

export const report = (cases: GradedCase[]) =>
	`${['# Eval report', ...cases.flatMap(section)].join('\n\n')}\n`;
