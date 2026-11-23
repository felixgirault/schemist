import {evaluate} from '#lib/core/evaluate.js';
import {
	exportTokens,
	exportVariables,
	requirementRows,
	toExportEntries
} from '#lib/core/export.js';
import type {NodeData} from '#lib/core/nodes.js';
import {rootTree} from '#lib/testing/tree.js';
import {expect, test} from 'vitest';

const named = (token: string, hex: string): NodeData => ({
	type: 'clr',
	token,
	args: {color: rootTree(hex, []).args.color}
});

// Tokens under `Colors`, without the root, which has a generated name.
const run = (...nodes: NodeData[]) => {
	const {json, conflicts} = exportTokens(
		evaluate(rootTree('#3b82f6', nodes)).slice(1),
		'https://schemist.test'
	);
	const {Colors} = JSON.parse(json);
	delete Colors.$description;
	return {colors: Colors, conflicts};
};

const tokens = (...nodes: NodeData[]) => run(...nodes).colors;

const token = (hex: string) => ({$type: 'color', $value: hex});

test('slashes nest into groups', () => {
	expect(tokens(named('button/primary/bg', '#ff0000'))).toEqual(
		{
			button: {primary: {bg: token('#ff0000')}}
		}
	);
});

test('dots nest into groups', () => {
	expect(tokens(named('button.primary.bg', '#ff0000'))).toEqual(
		{
			button: {primary: {bg: token('#ff0000')}}
		}
	);
});

test('dots and slashes mix, and spaces stay in segments', () => {
	expect(
		tokens(named('Brand name/button.primary bg', '#ff0000'))
	).toEqual({
		'Brand name': {button: {'primary bg': token('#ff0000')}}
	});
});

test('names without separators stay flat', () => {
	const {colors, conflicts} = run(
		named('Neutral white', '#ffffff')
	);
	expect(colors).toEqual({'Neutral white': token('#ffffff')});
	expect(conflicts).toEqual([]);
});

test('deep names nest deep', () => {
	expect(tokens(named('a/b/c/d/e', '#ff0000'))).toEqual({
		a: {b: {c: {d: {e: token('#ff0000')}}}}
	});
});

test('empty segments are dropped', () => {
	const hexes = ['#ff0000', '#00ff00', '#0000ff'];
	expect(
		tokens(
			named('a//b', hexes[0]),
			named('/c', hexes[1]),
			named('d/', hexes[2])
		)
	).toEqual({
		a: {b: token(hexes[0])},
		c: token(hexes[1]),
		d: token(hexes[2])
	});
});

test('a token that is a group prefix stays flat', () => {
	const {colors, conflicts} = run(
		named('button/primary', '#ff0000'),
		named('button/primary/bg', '#00ff00')
	);
	expect(colors).toEqual({
		button: {primary: {bg: token('#00ff00')}},
		'button/primary': token('#ff0000')
	});
	expect(conflicts).toEqual(['button/primary']);
});

test('group and token give the same output in either order', () => {
	const token1 = named('button/primary', '#ff0000');
	const token2 = named('button/primary/bg', '#00ff00');
	const a = run(token1, token2);
	const b = run(token2, token1);
	expect(b.colors).toEqual(a.colors);
	expect(b.conflicts).toEqual(['button/primary']);
});

test('a name that prefixes several tokens stays flat once', () => {
	const {colors, conflicts} = run(
		named('a', '#111111'),
		named('a/b', '#222222'),
		named('a/c/d', '#333333')
	);
	expect(colors).toEqual({
		a: {b: token('#222222'), c: {d: token('#333333')}},
		'a (2)': token('#111111')
	});
	expect(conflicts).toEqual(['a']);
});

test('tokens keep both colors when two share a name', () => {
	const {colors, conflicts} = run(
		named('brand', '#ff0000'),
		named('brand', '#00ff00')
	);
	expect(colors).toEqual({
		brand: token('#ff0000'),
		'brand (2)': token('#00ff00')
	});
	expect(conflicts).toEqual(['brand']);
	expect(colors).toMatchSnapshot();
});

test('triple duplicates get increasing suffixes on the last segment', () => {
	const {colors, conflicts} = run(
		named('a/brand', '#111111'),
		named('a.brand', '#222222'),
		named('a/brand', '#333333')
	);
	expect(colors).toEqual({
		a: {
			brand: token('#111111'),
			'brand (2)': token('#222222'),
			'brand (3)': token('#333333')
		}
	});
	expect(conflicts).toEqual(['a/brand', 'a.brand']);
});

test('a suffixed name never overwrites an existing one', () => {
	const {colors} = run(
		named('brand', '#111111'),
		named('brand (2)', '#222222'),
		named('brand', '#333333')
	);
	expect(Object.values(colors)).toHaveLength(3);
});

// A `$` in a token stands for the parent's name, so only a root
// node can hold one as is.
const runRoots = (...nodes: NodeData[]) => {
	const {json, conflicts} = exportTokens(
		nodes.flatMap((node) => evaluate(node)),
		'https://schemist.test'
	);
	const {Colors} = JSON.parse(json);
	delete Colors.$description;
	return {colors: Colors, conflicts};
};

test('names with $ segments stay flat without the $', () => {
	const {colors, conflicts} = runRoots(
		named('$description/x', '#111111'),
		named('a/$value', '#222222'),
		named('$x', '#333333')
	);
	expect(colors).toEqual({
		'description/x': token('#111111'),
		'a/value': token('#222222'),
		x: token('#333333')
	});
	expect(conflicts).toEqual([
		'$description/x',
		'a/$value',
		'$x'
	]);
});

test('a $ name does not turn its parent into a group', () => {
	expect(
		runRoots(
			named('a', '#111111'),
			named('a/$value', '#222222')
		).colors
	).toEqual({a: token('#111111'), 'a/value': token('#222222')});
});

const colors = evaluate(
	rootTree('#ffffff', [
		named('Text', '#000000'),
		named('Pale', '#eeeeee')
	])
);
const [bg, text, pale] = colors;
const requirements = {
	pairs: [
		{fg: text.id, bg: bg.id, wcag2: 4.5, apca: 75},
		{fg: pale.id, bg: bg.id, wcag2: 4.5, apca: 75},
		{fg: pale.id, bg: text.id, difference: 10}
	],
	roles: [{name: 'Surfaces', colors: [bg.id]}]
};
const link = 'https://schemist.test';

test('tokens list roles and pairs under a reverse domain key', () => {
	const {Colors} = JSON.parse(
		exportTokens(colors, link, requirements).json
	);

	expect(Colors[bg.name].$extensions).toEqual({
		'fr.fglt.schemist': {
			roles: ['Surfaces'],
			pairs: [
				{
					color: '{Colors.Text}',
					side: 'bg',
					use: 'body text',
					targets: {wcag2: 4.5, apca: 75}
				},
				{
					color: '{Colors.Pale}',
					side: 'bg',
					use: 'body text',
					targets: {wcag2: 4.5, apca: 75}
				}
			]
		}
	});
	expect(
		Colors.Text.$extensions['fr.fglt.schemist'].roles
	).toBe(undefined);
});

test('tokens point at the token a pair names, not its name', () => {
	const same = evaluate(
		rootTree('#ffffff', [
			named('Brand', '#000000'),
			named('Brand', '#222222'),
			named('bg/page', '#eeeeee')
		])
	);
	const [, first, second, page] = same;
	const {Colors} = JSON.parse(
		exportTokens(same, link, {
			pairs: [
				{fg: second.id, bg: page.id, wcag2: 3},
				{fg: first.id, bg: page.id, wcag2: 3}
			],
			roles: []
		}).json
	);

	expect(
		Colors.bg.page.$extensions['fr.fglt.schemist'].pairs.map(
			({color}: {color: string}) => color
		)
	).toEqual(['{Colors.Brand (2)}', '{Colors.Brand}']);
	expect(
		Colors['Brand (2)'].$extensions['fr.fglt.schemist']
			.pairs[0].color
	).toBe('{Colors.bg.page}');
});

test('tokens are unchanged without requirements', () => {
	expect(exportTokens(colors, link).json).not.toContain(
		'$extensions'
	);
});

const entries = toExportEntries(colors, 'hex', 3);
const options = {
	format: 'css' as const,
	casing: 'dash' as const,
	prefix: ''
};

test('CSS gets a comment per variable naming its pairs', () => {
	expect(exportVariables(entries, options, link, requirements))
		.toBe(`/* @see https://schemist.test */
/*
 * --text as body text (wcag2 4.5, apca 75)
 * --pale as body text (wcag2 4.5, apca 75)
 */
--white: #ffffff;
/*
 * body text on --white (wcag2 4.5, apca 75)
 * categories with --pale (difference 10)
 */
--text: #000000;
/*
 * body text on --white (wcag2 4.5, apca 75)
 * categories with --text (difference 10)
 */
--pale: #eeeeee;`);
});

test('Sass names its pairs with its own variables', () => {
	const sass = exportVariables(
		entries,
		{format: 'sass', casing: 'camel', prefix: 'c'},
		link,
		requirements
	);

	expect(sass).toContain(
		' * body text on $cWhite (wcag2 4.5, apca 75)\n'
	);
	expect(sass).toContain('$cText: #000000;');
});

test('variables are unchanged without requirements', () => {
	const plain = exportVariables(entries, options, link);

	expect(plain).not.toContain('body text');
	expect(plain).toBe(
		exportVariables(entries, options, link, {
			pairs: [],
			roles: []
		})
	);
});

test('the table lists each pair with its status', () => {
	expect(requirementRows(colors, requirements)).toMatchObject([
		{fg: 'Text', use: 'body text', pass: true},
		{fg: 'Pale', use: 'body text', pass: false},
		{fg: 'Pale', targets: 'difference 10'}
	]);
});

test('css has a block per variant, sass only the one it is given', () => {
	const entries = (hex: string) =>
		toExportEntries(evaluate(rootTree(hex, [])), 'hex', 3);
	const options = {
		format: 'css' as const,
		casing: 'dash' as const,
		prefix: ''
	};
	const others = [
		{name: 'Dark Mode', entries: entries('#000000')}
	];
	const css = exportVariables(
		entries('#ffffff'),
		options,
		'link',
		undefined,
		others
	);

	expect(css).toMatch(
		/^\/\* @see link \*\/\n:root \{\n {2}--[a-z-]+: #ffffff;\n\}\n\n\[data-theme="dark-mode"\] \{\n {2}--[a-z-]+: #000000;\n\}$/
	);
	expect(
		exportVariables(
			entries('#ffffff'),
			{...options, format: 'sass'},
			'link',
			undefined,
			others
		)
	).not.toContain('data-theme');
});
