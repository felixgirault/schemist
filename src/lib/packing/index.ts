import type {PresetNode} from '$lib/presets';
import {pack as packV1, unpack as unpackV1} from './v1';

export const pack = (node: PresetNode): string =>
	`1@${packV1(node)}`;

export const unpack = (data: string) => {
	const matches = data.match('^([0-9])@(.*)$');

	if (!matches) {
		throw new Error('Unrecognized packing format.');
	}

	const [_, version, versionedData] = matches;

	switch (version) {
		case '1':
			return unpackV1(versionedData);

		default:
			throw new Error('Unrecognized packing version.');
	}
};
