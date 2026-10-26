import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import {pack} from '#lib/packing/index.js';
import {afterEach, expect, test, vi} from 'vitest';
import {getRootNode} from './palette';

const packed = (hex: string) =>
	pack({type: 'clr', args: {color: parseColor(hex)[1]!}});

const load = (preset: string | null, stored: string | null) => {
	vi.stubGlobal('location', {
		search: preset
			? `?preset=${encodeURIComponent(preset)}`
			: ''
	});

	vi.stubGlobal('localStorage', {getItem: () => stored});
	return formatSchemistToHex(getRootNode().args.color);
};

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

test('invalid palettes fall back to the next source', () => {
	vi.spyOn(console, 'error').mockImplementation(() => {});

	expect(load('invalid', packed('#0000ff'))).toBe('#0000ff');
	expect(load('invalid', 'invalid')).toMatch(/^#[0-9a-f]{6}$/);
});
