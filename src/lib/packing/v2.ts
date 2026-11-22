import type {NodeData, PresetPair} from '#lib/core/nodes.js';
import {targetNames} from '#lib/core/pairs.js';
import type {ColorCodec} from './v1';
import {
	decodeNumbers,
	encodeNumbers,
	pack as packV1,
	unpack as unpackV1
} from './v1';

// Version 1 with colors at full precision instead of hex, so
// permalinks are lossless, and a section of pairs: the dictionary
// indexes of the two names, then (target name, value) indexes,
// values being dictionary strings since they are free numbers.
// Names are only mapped to colors by `resolvePairs`, when the tree
// is loaded.
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
	packV1(node, preciseCodec, (indice) =>
		(node.pairs ?? [])
			.map((pair) =>
				encodeNumbers([
					indice(pair.fg),
					indice(pair.bg),
					...targetNames.flatMap((target) =>
						pair[target] === undefined
							? []
							: [
									indice(target),
									indice(String(pair[target]))
								]
					)
				])
			)
			.join(',')
	);

export const unpack = (data: string) =>
	unpackV1(data, preciseCodec, (section, index) =>
		section
			? section.split(',').map((record): PresetPair => {
					const [fg, bg, ...targets] =
						decodeNumbers(record);
					const pair: PresetPair = {
						fg: index[fg],
						bg: index[bg]
					};

					for (let i = 0; i < targets.length; i += 2) {
						const target = index[
							targets[i]
						] as (typeof targetNames)[number];
						const value = Number(index[targets[i + 1]]);

						if (
							targetNames.includes(target) &&
							Number.isFinite(value)
						) {
							pair[target] = value;
						}
					}

					return pair;
				})
			: []
	);
