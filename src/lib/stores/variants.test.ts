import {formatSchemistToHex} from '#lib/color/formatting.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {parseTree} from '#lib/tree.js';
import {beforeEach, expect, test, vi} from 'vitest';
import {history, read} from './history.svelte';

vi.mock('$app/navigation', () => ({goto: vi.fn()}));
vi.mock('#lib/palette.js', () => ({storePalette: vi.fn()}));
vi.stubGlobal('location', {pathname: '/', search: ''});

const snapshot = () =>
	read(
		palette.root!,
		palette.pairs,
		palette.roles,
		palette.rules,
		palette.variants
	);

const step = (change: () => void) => {
	change();
	history.record(snapshot());
};

const child = () => palette.root!.children[0];
const hex = () => formatSchemistToHex(child().output.color);

beforeEach(() => {
	palette.root = parseTree(
		rootTree('#3b82f6', [{type: 'l', args: {amount: 10}}])
	);
	palette.variants = [];
	palette.selectVariant();
	history.reset(snapshot());
});

test('adding the first variant writes the base, and selects the new one', () => {
	const id = palette.addVariant();

	expect(palette.variants.map((v) => v.name)).toEqual([
		'Light',
		'Dark'
	]);
	expect(palette.selectedVariant?.id).toBe(id);
	expect(palette.addVariant()).not.toBe(id);
	expect(palette.variants[2].name).toBe('Variant 2');
});

test('names are free and not blank, the base included', () => {
	palette.addVariant();
	const [base, dark] = palette.variants;

	expect(palette.renameVariant(dark.id, 'Light')).toBe(false);
	expect(palette.renameVariant(dark.id, ' ')).toBe(false);
	expect(palette.renameVariant(base.id, 'Day')).toBe(true);
	expect(palette.variants[0].name).toBe('Day');
});

test('an edit in a variant writes an override, and reset removes it', () => {
	const before = hex();
	const dark = palette.addVariant();

	child().setArg('amount', 40);
	expect(child().args.amount).toBe(10);
	expect(child().overrides).toEqual({[dark]: {amount: 40}});
	expect(child().isOverridden()).toBe(true);
	expect(hex()).not.toBe(before);

	palette.selectVariant(palette.variants[0].id);
	expect(hex()).toBe(before);
	expect(child().isOverridden()).toBe(false);

	palette.selectVariant(dark);
	child().resetArg('amount');
	expect(child().overrides).toEqual({});
	expect(hex()).toBe(before);
});

test('deleting a variant deletes its overrides and falls back to the base', () => {
	const dark = palette.addVariant();

	child().setArg('amount', 40);
	palette.deleteVariant(palette.variants[0].id);
	expect(palette.variants).toHaveLength(2);

	palette.deleteVariant(dark);
	expect(palette.variants).toHaveLength(1);
	expect(
		collectNodes(palette.root!).map((n) => n.overrides)
	).toEqual([{}, {}]);
	expect(palette.selectedVariant?.name).toBe('Light');
});

test('variant changes are undone, and the selection falls back', () => {
	step(() => palette.addVariant());
	step(() => child().setArg('amount', 40));
	step(() => child().setArg('amount', 41));
	// The two edits of the same override are one step.
	expect(history.past).toHaveLength(2);

	history.undo();
	expect(child().overrides).toEqual({});
	history.undo();
	expect(palette.variants).toEqual([]);
	expect(palette.selectedVariant).toBeUndefined();
});
