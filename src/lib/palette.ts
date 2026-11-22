import {randomUsableColor} from '#lib/color/manipulation.js';
import {unpack} from '#lib/packing/index.js';
import {parsePairs, parseTree} from '#lib/tree.js';

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
// with its declared pairs. The ones that don't resolve are dropped.
export const loadPalette = () => {
	const query = new URLSearchParams(location.search);
	const presets = [query.get('preset'), storedPalette()];

	for (const preset of presets) {
		if (preset) {
			try {
				const data = unpack(preset);
				const root = parseTree(data);

				return {root, pairs: parsePairs(data, root)};
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
		pairs: []
	};
};
