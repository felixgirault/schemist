import {parseColor} from '#lib/color/parsing.js';
import {pack, unpack} from '#lib/packing/index.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {
	parsePairs,
	parseRoles,
	parseTree,
	serializeTree
} from '#lib/tree.js';
import {beforeEach, expect, test, vi} from 'vitest';
import {history, read} from './history.svelte';

vi.mock('$app/navigation', () => ({goto: vi.fn()}));
vi.mock('#lib/palette.js', () => ({storePalette: vi.fn()}));

vi.stubGlobal('location', {pathname: '/', search: ''});

// The pairs as node tokens, whatever the node objects.
const pairs = () =>
	palette.pairs.map(({fg, bg, wcag2}) => [
		token(fg),
		token(bg),
		wcag2
	]);

const token = (id: string) =>
	collectNodes(palette.root!).find((n) => n.id === id)!.token;

const snapshot = () =>
	read(
		palette.root!,
		palette.pairs,
		palette.roles,
		palette.rules
	);

const node = (token: string) =>
	collectNodes(palette.root!).find((n) => n.token === token)!;

beforeEach(() => {
	palette.root = parseTree({
		type: 'clr',
		token: 'Bg',
		args: {color: parseColor('#ffffff')[1]!},
		children: [
			{type: 'ctr', token: 'Text'},
			{type: 'cmp', token: 'Accent'}
		]
	});
	palette.storedPairs = [];
	palette.storedRoles = [];
	palette.rules = [];
	history.reset(snapshot());
});

// What the effect of `startHistory` does after a change.
const step = (change: () => void) => {
	change();
	history.record(snapshot());
};

test('undo and redo keep the pairs of each state', () => {
	step(() =>
		palette.setPair(node('Text').id, node('Bg').id, {
			wcag2: 4.5
		})
	);
	step(() => {
		palette.root!.args.color = parseColor('#ff0000')[1]!;
	});

	history.undo();
	expect(pairs()).toEqual([['Text', 'Bg', 4.5]]);
	expect(palette.root!.args.color).toMatchObject(
		parseColor('#ffffff')[1]!
	);

	history.redo();
	expect(pairs()).toEqual([['Text', 'Bg', 4.5]]);
	expect(palette.pairs[0].fg).toBe(node('Text').id);
});

test('declaring and removing a pair are undoable', () => {
	step(() =>
		palette.setPair(node('Text').id, node('Bg').id, {
			wcag2: 4.5
		})
	);
	step(() =>
		palette.setPair(node('Text').id, node('Bg').id, {})
	);
	expect(pairs()).toEqual([]);

	history.undo();
	expect(pairs()).toEqual([['Text', 'Bg', 4.5]]);

	history.undo();
	expect(pairs()).toEqual([]);

	history.redo();
	expect(pairs()).toEqual([['Text', 'Bg', 4.5]]);
});

test('swapping a color keeps its pairs', () => {
	const text = node('Text');

	step(() =>
		palette.setPair(text.id, node('Bg').id, {wcag2: 4.5})
	);
	step(() => text.setType('cmp'));

	expect(pairs()).toEqual([['Text', 'Bg', 4.5]]);
	expect(palette.pairs[0].fg).toBe(text.id);
});

test('the saved palette holds the pairs', () => {
	step(() =>
		palette.setPair(node('Text').id, node('Bg').id, {
			wcag2: 4.5
		})
	);

	const data = unpack(
		pack(serializeTree(palette.root!, palette.pairs))
	);
	const root = parseTree(data);

	expect(
		parsePairs(data, root).map(({wcag2}) => wcag2)
	).toEqual([4.5]);
});

test('undo, redo and saving keep roles and rules', () => {
	const roles = [
		{id: 'r1', name: 'Surfaces', colors: [node('Bg').id]},
		{id: 'r2', name: 'Content', colors: [node('Text').id]}
	];
	const rules = [{id: 'u1', fg: 'r2', bg: 'r1', use: 'body'}];

	step(() => {
		palette.storedRoles = roles;
		palette.rules = rules;
	});
	step(() => {
		palette.rules = [];
	});

	history.undo();
	expect(palette.roles).toEqual(roles);
	expect(palette.rules).toEqual(rules);
	// the rule is checked, with no one-off pair
	expect(palette.expandedPairs).toMatchObject([
		{fg: node('Text').id, bg: node('Bg').id, wcag2: 4.5}
	]);

	const data = unpack(
		pack(
			serializeTree(
				palette.root!,
				palette.pairs,
				palette.roles,
				palette.rules
			)
		)
	);

	expect(data.rules).toEqual([
		{fg: 'Content', bg: 'Surfaces', use: 'body'}
	]);
	expect(data.roles).toEqual([
		{name: 'Surfaces', colors: ['Bg']},
		{name: 'Content', colors: ['Text']}
	]);
	expect(parseRoles(data, parseTree(data))).toHaveLength(2);

	history.undo();
	expect(palette.roles).toEqual([]);
});
