import {hexColor, schemistColor} from '$lib/color/spaces';
import defs from '$lib/definitions/nodes';
import type {PresetNode} from '$lib/presets';
import type {Args, Param} from '$lib/stores/nodes';

export const pack = (node: PresetNode): string => {
	const packed = [];
	const index = {};
	let i = 0;

	const indice = (key) => {
		if (!(key in index)) {
			index[key] = i++;
		}

		return index[key];
	};

	const packValue = (type: Param['type'], value: any) => {
		switch (type) {
			case 'boolean':
				return value ? 1 : 0;
			case 'range':
				return value;
			case 'color':
				return indice(hexColor(value).substring(1));
		}
	};

	const packArgs = (params: Param[], args: Args) =>
		params.flatMap(({type, name}) => [
			indice(name),
			packValue(type, args[name])
		]);

	const packNode = (node: PresetNode): number => {
		const typeIndex = indice(node.type);
		const tokenIndex = indice(node.token ?? '');
		const hiddenFlag = node.isHidden ? '!' : '';
		const args = node.args
			? packArgs(defs[node.type].params, node.args)
			: [];
		const children = node.children
			? node.children.map(packNode)
			: [];
		const i = packed.length;
		const data = [
			typeIndex,
			tokenIndex,
			args.length,
			...args,
			...children
		];

		const packedData = data
			.map((v) => v.toString(16))
			.map((v) =>
				v.length === 3
					? `y${v}`
					: v.length === 2
					? `x${v}`
					: v
			)
			.join('');

		packed.push(`${hiddenFlag}${packedData}`);
		return i;
	};

	const rootIndex = packNode(node).toString(16);

	return [
		rootIndex,
		packed.join(','),
		Object.keys(index).join(',')
	].join('@');
};

export const unpack = (data: string) => {
	const [rootIndex, inlinePacked, inlineIndex] =
		data.split('@');

	const packed = inlinePacked.split(',');
	const index = inlineIndex.split(',');

	const unpackValue = (type: Param['type'], value: number) => {
		switch (type) {
			case 'boolean':
				return !!value;
			case 'range':
				return value;
			case 'color':
				return schemistColor(`#${index[value]}`);
		}
	};

	const unpackArgs = (
		params: Param[],
		args: [number, number][]
	): Args => {
		const paramTypes = Object.fromEntries(
			params.map(({type, name}) => [name, type])
		);

		return Object.fromEntries(
			args.map(([k, v]) => {
				const name = index[k];
				return [name, unpackValue(paramTypes[name], v)];
			})
		);
	};

	const unpackData = (packedData: string) => {
		const matches = packedData.match(
			/y[0-9a-f]{3}|x[0-9a-f]{2}|[0-9a-f]/gi
		);

		const data = matches
			.map((v) =>
				v.startsWith('x') || v.startsWith('y')
					? v.substring(1)
					: v
			)
			.map((v) => parseInt(v, 16));

		const type = index[data.shift()];
		const token = index[data.shift()];
		const argCount = data.shift();
		const argEntries = [];

		for (let i = 0; i < argCount; i += 2) {
			argEntries.push([data.shift(), data.shift()]);
		}

		return {
			type,
			token,
			isHidden: packedData.startsWith('!'),
			args: unpackArgs(defs[type].params, argEntries),
			children: data
		};
	};

	const nodes = packed.map(unpackData);

	const inflateNode = ({
		type,
		token,
		isHidden,
		args,
		children
	}): PresetNode => ({
		type,
		token,
		isHidden,
		args,
		children: children.map((index) =>
			inflateNode(nodes[index])
		)
	});

	return inflateNode(nodes[parseInt(rootIndex, 16)]);
};
