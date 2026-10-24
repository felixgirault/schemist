import {randomUsableColor} from '#lib/color/manipulation.js';
import {unpack} from '#lib/packing/index.js';
import {parseTree} from '#lib/presets.js';

export const getRootNode = () => {
	const query = new URLSearchParams(location.search);
	const preset = query.get('preset');

	if (preset) {
		try {
			return parseTree(unpack(preset));
		} catch (e) {
			console.error(
				`Error parsing preset \`${preset}\`: ${e}`
			);
		}
	}

	return parseTree({
		type: 'clr',
		args: {
			color: randomUsableColor()
		}
	});
};
