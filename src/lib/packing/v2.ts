import type {PresetNode} from '#lib/presets.js';
import type {ColorCodec} from './v1';
import {pack as packV1, unpack as unpackV1} from './v1';

// Same as v1, but colors are stored at full precision instead
// of being rounded to hex, so permalinks are lossless.
const preciseCodec: ColorCodec = {
	encode: ({h, s, l}) => [h, s, l].join('_'),
	decode: (data) => {
		const [h, s, l] = data.split('_').map(Number);

		if ([h, s, l].some(Number.isNaN)) {
			throw new Error(`Invalid color \`${data}\`.`);
		}

		return {h, s, l};
	}
};

export const pack = (node: PresetNode) =>
	packV1(node, preciseCodec);

export const unpack = (data: string) =>
	unpackV1(data, preciseCodec);
