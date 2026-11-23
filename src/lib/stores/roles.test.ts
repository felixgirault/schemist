import {parseColor} from '#lib/color/parsing.js';
import {pack, unpack} from '#lib/packing/index.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {
	parsePairs,
	parseRoles,
	parseRules,
	parseTree,
	serializeTree
} from '#lib/tree.js';
import {beforeEach, expect, test, vi} from 'vitest';
import {history, read} from './history.svelte';

vi.mock('$app/navigation', () => ({goto: vi.fn()}));
vi.mock('#lib/palette.js', () => ({storePalette: vi.fn()}));

vi.stubGlobal('location', {pathname: '/', search: ''});

const node = (token: string) =>
	collectNodes(palette.root!).find((n) => n.token === token)!;

const snapshot = () =>
	read(
		palette.root!,
		palette.pairs,
		palette.roles,
		palette.rules
	);

// What the effect of `startHistory` does after a change.
const step = (change: () => void) => {
	change();
	history.record(snapshot());
};

// The palette as saved and loaded again, its roles, rules and
// expansion by names.
const reload = () => {
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
	const root = parseTree(data);
	const roles = parseRoles(data, root);

	return {data, root, roles, rules: parseRules(data, roles)};
};

const clr = (token: string, hex: string) => ({
	type: 'clr' as const,
	token,
	args: {color: parseColor(hex)[1]!}
});

beforeEach(() => {
	palette.root = parseTree({
		...clr('Bg', '#ffffff'),
		children: [
			clr('Text', '#000000'),
			clr('Muted', '#777777'),
			clr('Accent', '#ff0000')
		]
	});
	palette.storedPairs = [];
	palette.storedRoles = [];
	palette.rules = [];
	history.reset(snapshot());
});

const surfaces = () => {
	const id = palette.addRole('Surfaces', [node('Bg').id])!;

	palette.addRole('Text', [node('Text').id, node('Muted').id]);
	return id;
};

test('renaming a role or removing a rule rewrites nothing else', () => {
	const surfacesId = surfaces();
	const textId = palette.roles[1].id;
	const body = palette.addRule(textId, surfacesId, 'body');
	const large = palette.addRule(textId, surfacesId, 'large');
	const names = () =>
		palette.expandedPairs.map(({fg, sources}) => [
			fg,
			sources.rules
		]);

	expect(names()).toEqual([
		[node('Text').id, [body, large]],
		[node('Muted').id, [body, large]]
	]);

	const rulesBefore = palette.rules;

	expect(palette.renameRole(textId, 'Content')).toBe(true);
	expect(palette.rules).toBe(rulesBefore);
	expect(names()).toHaveLength(2);

	palette.removeRule(body);
	expect(palette.expandedPairs[0]).toMatchObject({
		wcag2: 3,
		sources: {rules: [large]}
	});

	const back = reload();

	expect(back.data.roles?.map(({name}) => name)).toEqual([
		'Surfaces',
		'Content'
	]);
	expect(back.data.rules).toEqual([
		{fg: 'Content', bg: 'Surfaces', use: 'large'}
	]);
	expect(back.rules).toMatchObject([
		{fg: back.roles[1].id, bg: back.roles[0].id, use: 'large'}
	]);
});

test('role names are never empty nor shared', () => {
	const id = surfaces();

	expect(palette.addRole('Surfaces')).toBeUndefined();
	expect(palette.addRole('  ')).toBeUndefined();
	expect(palette.renameRole(id, 'Text')).toBe(false);
	expect(palette.renameRole(id, 'Surfaces')).toBe(true);
	expect(palette.roles.map(({name}) => name)).toEqual([
		'Surfaces',
		'Text'
	]);
});

test('role members and rules are added, removed and undone', () => {
	const id = surfaces();
	const textId = palette.roles[1].id;

	step(() => palette.addMember(id, node('Accent').id));
	step(() => palette.addMember(id, node('Accent').id));
	expect(palette.roles[0].colors).toHaveLength(2);

	step(() => palette.addRule(textId, id, 'body'));
	step(() => palette.removeMember(textId, node('Muted').id));
	expect(palette.expandedPairs).toHaveLength(2);

	history.undo();
	expect(palette.expandedPairs).toHaveLength(4);
	history.undo();
	expect(palette.rules).toEqual([]);
	history.redo();
	expect(palette.rules).toHaveLength(1);
});

test('a couple is set in one change, in place, and undone', () => {
	const id = surfaces();
	const textId = palette.roles[1].id;
	const other = palette.addRule(
		textId,
		undefined,
		'categories'
	);

	palette.addRule(textId, id, 'body');
	palette.addRule(textId, id, 'large');
	palette.addRule(id, textId, 'large');
	const after = palette.addRule(id, undefined, 'categories');

	history.reset(snapshot());

	step(() => palette.setRule(textId, id, 'large'));
	expect(palette.rules).toMatchObject([
		{id: other},
		{fg: textId, bg: id, use: 'large'},
		{fg: id, bg: textId},
		{id: after}
	]);
	expect(palette.rules).toHaveLength(4);

	history.undo();
	expect(palette.rules).toHaveLength(5);

	step(() => palette.setRule(textId, id));
	expect(palette.rules).toHaveLength(3);
	expect(reload().rules).toHaveLength(3);

	step(() => palette.setRule(id, id, 'body'));
	expect(palette.rules.at(-1)).toMatchObject({
		fg: id,
		bg: undefined,
		use: 'body'
	});
	expect(
		palette.rules.filter((r) => r.fg === id && !r.bg)
	).toHaveLength(1);
});

test('deleting a role deletes its rules', () => {
	const id = surfaces();
	const textId = palette.roles[1].id;

	palette.addRule(textId, id, 'body');
	palette.addRule(textId, undefined, 'categories');
	palette.deleteRole(id);

	expect(palette.roles).toHaveLength(1);
	expect(palette.rules).toMatchObject([{bg: undefined}]);
	expect(reload().data.rules).toHaveLength(1);
});

test('a one-off pair names the rules it overrides', () => {
	const id = surfaces();
	const textId = palette.roles[1].id;
	const rule = palette.addRule(textId, id, 'body');

	palette.setPair(node('Text').id, node('Bg').id, {wcag2: 3});

	expect(palette.expandedPairs[0].sources).toEqual({
		rules: [],
		overrides: [rule],
		oneOff: true
	});
	expect(parsePairs(reload().data, reload().root)).toHaveLength(
		1
	);
});

test('members whose name is shared are listed as unsaved', () => {
	palette.root = parseTree({
		...clr('Bg', '#ffffff'),
		children: [clr('Twin', '#000000'), clr('Twin', '#111111')]
	});
	const [a] = palette.allColors.filter(
		({name}) => name === 'Twin'
	);

	palette.addRole('Text', [a.id, palette.allColors[0].id]);

	expect(palette.unsavedMembers).toEqual(['Twin']);
	expect(reload().data.roles).toEqual([
		{name: 'Text', colors: ['Bg']}
	]);
});
