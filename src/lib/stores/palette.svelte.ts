import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {
	AppRole,
	AppRule,
	PairTargets
} from '#lib/core/nodes.js';
import type {ExpandedPair} from '#lib/core/pairs.js';
import {expandRules} from '#lib/core/pairs.js';
import {permalink} from '#lib/routing.js';
import type {
	Node,
	NodeOutputRecord,
	ColorPair
} from '#lib/stores/nodes.svelte.js';
import {
	collectColors,
	collectOutputs
} from '#lib/stores/nodes.svelte.js';
import {namePairs, nameRoles, serializeTree} from '#lib/tree.js';
import {
	debounce,
	withElapsedTime
} from '#lib/utils/functions.js';
import {uid} from '#lib/utils/generators.js';
import {clamp} from '#lib/utils/math.js';

class Palette {
	root = $state<Node>();
	// Declared pairs, as they were set: some may be of colors since
	// removed, see `pairs`.
	storedPairs = $state.raw<ColorPair[]>([]);
	// Every color of the tree, hidden ones included.
	allColors = $derived(
		this.root ? collectColors(this.root) : []
	);
	// The stored pairs whose two colors are still in the tree, so
	// that no removal has to remember the pairs.
	pairs = $derived.by(() => {
		const ids = new Set(this.allColors.map(({id}) => id));

		return this.storedPairs.filter(
			({fg, bg}) => ids.has(fg) && ids.has(bg)
		);
	});
	// Roles and rules as set (ADR 16), linked by ids: roles hold color
	// ids, rules hold role ids. Names are only in the saved format.
	storedRoles = $state.raw<AppRole[]>([]);
	rules = $state.raw<AppRule[]>([]);
	// The roles without the colors since removed.
	roles = $derived.by(() => {
		const ids = new Set(this.allColors.map(({id}) => id));

		return this.storedRoles.map((role) => ({
			...role,
			colors: role.colors.filter((id) => ids.has(id))
		}));
	});
	// What is checked: the declared pairs and the ones rules give,
	// their sources holding rule ids. The core looks roles up by
	// `name` and numbers rules, so it gets the role ids as names and
	// the numbers are mapped back to ids here.
	expandedPairs = $derived.by(
		(): ExpandedPair<string, string>[] => {
			const roles = this.roles.map(({id, colors}) => ({
				name: id,
				colors
			}));
			const ids = (indexes: number[]) =>
				indexes.map((i) => this.rules[i].id);

			return expandRules(
				roles,
				this.rules,
				this.pairs
			).pairs.map(({sources, ...pair}) => ({
				...pair,
				sources: {
					...sources,
					rules: ids(sources.rules),
					overrides: ids(sources.overrides)
				}
			}));
		}
	);
	// The pairs a permalink cannot hold until a color is renamed
	unsavedPairs = $derived(
		this.root ? namePairs(this.root, this.pairs).unsaved : []
	);
	// The names of role members a permalink cannot hold either
	unsavedMembers = $derived(
		this.root ? nameRoles(this.root, this.roles).unsaved : []
	);
	outputs = $derived(
		this.root ? collectOutputs(this.root) : {}
	);

	// Debounces outputs so an update is almost instantaneous by
	// default, but gets postponed longer as the previous call
	// gets closer.
	// This allows for a snappy feel on single updates while
	// keeping reasonable performance on fast recurring ones
	// (i.e. when the user drags a range input).
	settledOutputs: NodeOutputRecord = $state.raw({});

	// Colors of the settled outputs, as combinations and exports
	// need them.
	colors = $derived(
		Object.entries(this.settledOutputs).map(
			([id, {color, name}]): PaletteColor => ({
				id,
				color,
				rgbColor: schemistToRgb(color),
				name
			})
		)
	);

	rootColor = $derived(
		(this.root && this.settledOutputs[this.root.id]?.color) ??
			Object.values(this.settledOutputs).shift()?.color ??
			parseColor('#feffff')[1]! // not fully white so there is a hue to pick up
	);

	get permalink() {
		const {origin} = window.location;

		return this.root
			? permalink(
					serializeTree(
						this.root,
						this.pairs,
						this.roles,
						this.rules
					),
					origin
				)
			: origin;
	}

	// Declares the pair of two colors, or removes it with no target.
	setPair(
		fg: string,
		bg: string,
		{wcag2, apca, difference}: PairTargets
	) {
		const others = this.pairs.filter(
			(pair) => pair.fg !== fg || pair.bg !== bg
		);

		this.storedPairs =
			wcag2 === undefined &&
			apca === undefined &&
			difference === undefined
				? others
				: [...others, {fg, bg, wcag2, apca, difference}];
	}

	// Roles and rules are edited by ids; every change is recorded by
	// the history, as any other. A role name is never empty nor shared,
	// as names are what a permalink holds.
	#isFree(name: string, except?: string) {
		return (
			name !== '' &&
			!this.storedRoles.some(
				(role) => role.name === name && role.id !== except
			)
		);
	}

	// Returns the id of the new role, or nothing if its name is taken.
	addRole(name: string, colors: string[] = []) {
		name = name.trim();

		if (!this.#isFree(name)) return;

		const id = `r${uid()}`;

		this.storedRoles = [
			...this.storedRoles,
			{id, name, colors}
		];
		return id;
	}

	renameRole(id: string, name: string) {
		name = name.trim();

		if (!this.#isFree(name, id)) return false;

		this.storedRoles = this.storedRoles.map((role) =>
			role.id === id ? {...role, name} : role
		);
		return true;
	}

	// Also removes the rules of the role.
	deleteRole(id: string) {
		this.storedRoles = this.storedRoles.filter(
			(role) => role.id !== id
		);
		this.rules = this.rules.filter(
			({fg, bg}) => fg !== id && bg !== id
		);
	}

	addMember(roleId: string, colorId: string) {
		this.storedRoles = this.storedRoles.map((role) =>
			role.id === roleId && !role.colors.includes(colorId)
				? {...role, colors: [...role.colors, colorId]}
				: role
		);
	}

	removeMember(roleId: string, colorId: string) {
		this.storedRoles = this.storedRoles.map((role) =>
			role.id === roleId
				? {
						...role,
						colors: role.colors.filter(
							(id) => id !== colorId
						)
					}
				: role
		);
	}

	// Without `bg`, a role among itself. Returns the id of the rule.
	addRule(fg: string, bg: string | undefined, use: string) {
		const id = `u${uid()}`;

		this.rules = [
			...this.rules,
			{id, fg, bg: bg === fg ? undefined : bg, use}
		];
		return id;
	}

	removeRule(id: string) {
		this.rules = this.rules.filter((rule) => rule.id !== id);
	}

	constructor() {
		const update = debounce(
			(outputs: NodeOutputRecord) => {
				this.settledOutputs = outputs;
			},
			withElapsedTime(
				(time) => 10 + clamp(400 - time, 400) / 2
			)
		);

		$effect.root(() => {
			$effect(() => update(this.outputs));
		});
	}
}

export const palette = new Palette();
