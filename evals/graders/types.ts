import type {Cli} from '../schemist.ts';

export type PairExpect = {
	fg: string;
	bg: string;
	wcag2?: number;
	apca?: number;
	difference?: number;
};

// What a case expects of the trees an agent writes, from expect.json.
export type Expect = {
	trees: string[];
	// The variants each tree must declare (ADR 19): its pairs are then
	// checked in every one, instead of one tree per theme.
	variants?: string[];
	pairs: PairExpect[];
	hex?: string[];
};

export type PairResult = {
	tree: string;
	variant?: string;
	fg: string;
	bg: string;
	metric: 'wcag2' | 'apca' | 'difference';
	target: number;
	level: number;
	pass: boolean;
};

export type Result = {
	pass: boolean;
	detail?: string;
	// `check` only: what failed besides pairs, and each pair's levels.
	problems?: string[];
	pairs?: PairResult[];
};

export type Context = {
	// The run's directory: `out/` and the other saved files.
	dir: string;
	transcript: string;
	expect?: Expect;
	cli: Cli;
};
