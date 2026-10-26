import type {NodeData} from '#lib/model/tree.js';
import type {ColorCodec} from './v1';
import {pack as packV1, unpack as unpackV1} from './v1';

// Same as v1, but colors are stored at full precision instead
// of being rounded to hex, so permalinks are lossless.
const preciseCodec: ColorCodec = {
	encode: ({h, s, l}) => [h, s, l].join('_'),
	decode: (data) => {
		const parts = data.split('_');

		if (
			parts.length !== 3 ||
			!parts.every((part) => part.trim() && isFinite(+part))
		) {
			throw new Error(`Invalid color \`${data}\`.`);
		}

		const [h, s, l] = parts.map(Number);
		return {h, s, l};
	}
};

export const pack = (node: NodeData) =>
	packV1(node, preciseCodec);

export const unpack = (data: string) =>
	unpackV1(data, preciseCodec);
