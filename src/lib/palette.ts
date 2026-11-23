import {randomUsableColor} from '#lib/color/manipulation.js';
import type {NodeData} from '#lib/core/nodes.js';
import {defaultRequirements} from '#lib/core/pairs.js';
import {unpack} from '#lib/packing/index.js';
import {
	parsePairs,
	parseRoles,
	parseRules,
	parseTree,
	parseVariants,
	withVariantIds
} from '#lib/tree.js';

const StorageKey = 'palette';

// Storage can be unavailable (private mode, disabled cookies…).
const storedPalette = () => {
	try {
		return localStorage.getItem(StorageKey);
	} catch {
		return null;
	}
};

export const storePalette = (packed: string) => {
	try {
		localStorage.setItem(StorageKey, packed);
	} catch {}
};

// A palette that declares no pairs, roles nor rules gets the
// default requirements (ADR 21).
const parsePalette = (data: NodeData) => {
	const declared =
		data.pairs?.length ||
		data.roles?.length ||
		data.rules?.length;
	const {roles: namedRoles, rules: namedRules} = declared
		? data
		: defaultRequirements;
	const variants = parseVariants(data);
	const root = parseTree(withVariantIds(data, variants));
	const roles = parseRoles({...data, roles: namedRoles}, root);

	return {
		root,
		pairs: parsePairs(data, root),
		roles,
		rules: parseRules({...data, rules: namedRules}, roles),
		variants
	};
};

// Restores the palette from the URL, else from the last session,
// with its declared pairs, roles and rules. The pairs and role
// members that don't resolve are dropped.
export const loadPalette = () => {
	const query = new URLSearchParams(location.search);
	const presets = [query.get('preset'), storedPalette()];

	for (const preset of presets) {
		if (preset) {
			try {
				return parsePalette(unpack(preset));
			} catch (e) {
				console.error(
					`Error parsing preset \`${preset}\`: ${e}`
				);
			}
		}
	}

	return parsePalette({
		type: 'clr',
		args: {
			color: randomUsableColor()
		}
	});
};
