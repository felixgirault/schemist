import {randomUsableColor} from '$lib/color/manipulation';
import {unpack} from '$lib/packing';
import {parseTree} from '$lib/presets';

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
