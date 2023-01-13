import colors from 'color-name-list/dist/colornames.bestof.json';
import nearestColor from 'nearest-color';

const find = nearestColor.from(
	Object.fromEntries(colors.map(({name, hex}) => [name, hex]))
);

export default (hex: string) => {
	try {
		return find(hex).name;
	} catch (e) {
		return hex;
	}
};
