import {randomUsableColor} from '#lib/color/manipulation.js';
import {unpack} from '#lib/packing/index.js';
import {parseTree} from '#lib/stores/nodes.svelte.js';

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

// Restores the palette from the URL, else from the last session.
export const getRootNode = () => {
	const query = new URLSearchParams(location.search);
	const presets = [query.get('preset'), storedPalette()];

	for (const preset of presets) {
		if (preset) {
			try {
				return parseTree(unpack(preset));
			} catch (e) {
				console.error(
					`Error parsing preset \`${preset}\`: ${e}`
				);
			}
		}
	}

	return parseTree({
		type: 'clr',
		args: {
			color: randomUsableColor()
		}
	});
};
