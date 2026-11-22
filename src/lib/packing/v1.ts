import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import type {Args, Param, NodeData} from '#lib/core/nodes.js';
import {validateTree} from '#lib/core/tree.js';
import defs, {isNodeType} from '#lib/definitions/index.js';

// Escapes the separators so tokens can contain them.
const escapeEntry = (entry: string) =>
	entry.replace(/[%,@]/g, encodeURIComponent);

const unescapeEntry = (entry: string) =>
	entry.replace(/%(25|2C|40)/gi, decodeURIComponent);

export const pack = (node: NodeData): string => {
	const packed: string[] = [];
	// A Map keeps insertion order, unlike an object which lists
	// integer-like keys first (see #8).
	const index = new Map<string, number>();

	const indice = (key: string) => {
		if (!index.has(key)) {
			index.set(key, index.size);
		}

		return index.get(key)!;
	};

	const packValue = (
		type: Param['type'],
		value: boolean | number | SchemistColor
	) => {
		switch (type) {
			case 'boolean':
				return value ? 1 : 0;
			case 'range':
				return value;
			case 'color':
				return indice(
					formatSchemistToHex(
						value as SchemistColor
					).substring(1)
				);
		}
	};

	const packArgs = (params: readonly Param[], args: Args) =>
		params.flatMap(({type, name}) => [
			indice(name),
			packValue(type, args[name])
		]);

	const packNode = (node: NodeData): number => {
		const typeIndex = indice(node.type as string);
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
		[...index.keys()].map(escapeEntry).join(',')
	].join('@');
};

// What comes out of a permalink is validated like any outside data.
export const unpack = (data: string) => {
	const [rootIndex, inlinePacked, inlineIndex] =
		data.split('@');

	const packed = inlinePacked.split(',');
	const index = inlineIndex.split(',').map(unescapeEntry);

	const unpackValue = (type: Param['type'], value: number) => {
		switch (type) {
			case 'boolean':
				return !!value;
			case 'range':
				return value;
			case 'color':
				return `#${index[value]}`;
		}
	};

	const unpackArgs = (
		params: readonly Param[],
		args: [number, number][]
	) => {
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

		const data = matches!
			.map((v) =>
				v.startsWith('x') || v.startsWith('y')
					? v.substring(1)
					: v
			)
			.map((v) => parseInt(v, 16));

		const type = index[data.shift() as number];
		const token = index[data.shift() as number];
		const argCount = data.shift() as number;
		const argEntries: [number, number][] = [];

		for (let i = 0; i < argCount; i += 2) {
			argEntries.push([
				data.shift() as number,
				data.shift() as number
			]);
		}

		return {
			type,
			token,
			isHidden: packedData.startsWith('!'),
			args: unpackArgs(
				isNodeType(type) ? defs[type].params : [],
				argEntries
			),
			children: data
		};
	};

	const nodes = packed.map(unpackData);

	const inflateNode = ({
		children,
		...node
	}: (typeof nodes)[number]): unknown => ({
		...node,
		children: children.map((index) =>
			inflateNode(nodes[index])
		)
	});

	return validateTree(
		inflateNode(nodes[parseInt(rootIndex, 16)]),
		'permalink'
	);
};
