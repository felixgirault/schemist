import type {NodeData} from '#lib/tree.js';
import {unpack as unpackV1} from './v1';
import {pack as packV2, unpack as unpackV2} from './v2';

export const pack = (node: NodeData): string =>
	`2@${packV2(node)}`;

export const unpack = (data: string) => {
	const matches = data.match('^([0-9])@(.*)$');

	if (!matches) {
		throw new Error('Unrecognized packing format.');
	}

	const [_, version, versionedData] = matches;

	switch (version) {
		case '1':
			return unpackV1(versionedData);

		case '2':
			return unpackV2(versionedData);

		default:
			throw new Error('Unrecognized packing version.');
	}
};
