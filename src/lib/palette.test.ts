import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import {argOf} from '#lib/core/nodes.js';
import color from '#lib/definitions/nodes/color.js';
import {pack} from '#lib/packing/index.js';
import {afterEach, expect, test, vi} from 'vitest';
import {loadPalette} from './palette';

const packed = (hex: string) =>
	pack({type: 'clr', args: {color: parseColor(hex)[1]!}});

const loaded = (
	preset: string | null,
	stored: string | null = null
) => {
	vi.stubGlobal('location', {
		search: preset
			? `?preset=${encodeURIComponent(preset)}`
			: ''
	});

	vi.stubGlobal('localStorage', {getItem: () => stored});
	return loadPalette();
};

const load = (preset: string | null, stored: string | null) =>
	formatSchemistToHex(
		argOf(loaded(preset, stored).root.args, color.params[0])
	);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('the link wins over the stored palette', () => {
	expect(load(packed('#ff0000'), packed('#0000ff'))).toBe(
		'#ff0000'
	);
});

test('the stored palette is used without a link', () => {
	expect(load(null, packed('#0000ff'))).toBe('#0000ff');
});

const color1 = () => parseColor('#ff0000')[1]!;

test('a new palette gets the default requirements', () => {
	const {roles, rules, pairs} = loaded(null);

	expect(roles.map((r) => r.name)).toEqual([
		'Surfaces',
		'Text',
		'Borders',
		'Accents',
		'Text on accents',
		'Categories'
	]);
	expect(roles.every((r) => !r.colors.length)).toBe(true);
	expect(rules).toHaveLength(6);
	expect(rules.every((r) => r.use)).toBe(true);
	expect(pairs).toEqual([]);
});

test('a palette without requirements gets the defaults', () => {
	expect(loaded(packed('#ff0000')).roles).toHaveLength(6);
});

test('a palette with some requirements keeps them', () => {
	const rolesOnly = loaded(
		pack({
			type: 'clr',
			args: {color: color1()},
			roles: [{name: 'Mine', colors: []}]
		})
	);
	const pairsOnly = loaded(
		pack({
			type: 'clr',
			args: {color: color1()},
			pairs: [{fg: 'a', bg: 'b', wcag2: 3}]
		})
	);
	vi.spyOn(console, 'error').mockImplementation(() => {});

	expect(rolesOnly.roles.map((r) => r.name)).toEqual(['Mine']);
	expect(rolesOnly.rules).toEqual([]);
	expect(pairsOnly.roles).toEqual([]);
});

test('invalid palettes fall back to the next source', () => {
	vi.spyOn(console, 'error').mockImplementation(() => {});

	expect(load('invalid', packed('#0000ff'))).toBe('#0000ff');
	expect(load('invalid', 'invalid')).toMatch(/^#[0-9a-f]{6}$/);
});
