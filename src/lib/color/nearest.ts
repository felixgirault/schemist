import colors from 'color-name-list/dist/colornames.bestof.esm';
import nearestColor from 'nearest-color';

const find = nearestColor.from(
	Object.fromEntries(colors.map(({name, hex}) => [name, hex]))
);

export default (hex) => {
	try {
		return find(hex).name;
	} catch (e) {
		return hex;
	}
};
