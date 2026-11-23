import {randomUsableColor} from '#lib/color/manipulation.js';
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

// Restores the palette from the URL, else from the last session,
// with its declared pairs, roles and rules. The pairs and role
// members that don't resolve are dropped.
export const loadPalette = () => {
	const query = new URLSearchParams(location.search);
	const presets = [query.get('preset'), storedPalette()];

	for (const preset of presets) {
		if (preset) {
			try {
				const data = unpack(preset);
				const variants = parseVariants(data);
				const root = parseTree(
					withVariantIds(data, variants)
				);
				const roles = parseRoles(data, root);

				return {
					root,
					pairs: parsePairs(data, root),
					roles,
					rules: parseRules(data, roles),
					variants
				};
			} catch (e) {
				console.error(
					`Error parsing preset \`${preset}\`: ${e}`
				);
			}
		}
	}

	return {
		root: parseTree({
			type: 'clr',
			args: {
				color: randomUsableColor()
			}
		}),
		pairs: [],
		roles: [],
		rules: [],
		variants: []
	};
};
