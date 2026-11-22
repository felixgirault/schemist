import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {SchemistColor} from '#lib/color/types.js';
import type {Args, NodeData, Param} from '#lib/core/nodes.js';
import {validateTree} from '#lib/core/tree.js';
import defs, {isNodeType} from '#lib/definitions/index.js';

// How a color is written in the dictionary. `decode` gives what
// `validateTree` checks: a CSS color string or a color.
export type ColorCodec = {
	encode: (color: SchemistColor) => string;
	decode: (data: string) => string | SchemistColor;
};

const hexCodec: ColorCodec = {
	encode: (color) => formatSchemistToHex(color).substring(1),
	decode: (data) => `#${data}`
};

// Numbers in hexadecimal: 1 digit as is, 2 prefixed with `x`, 3
// with `y`.
export const encodeNumbers = (
	numbers: {toString: (radix: number) => string}[]
) =>
	numbers
		.map((v) => v.toString(16))
		.map((v) =>
			v.length === 3 ? `y${v}` : v.length === 2 ? `x${v}` : v
		)
		.join('');

export const decodeNumbers = (packed: string) =>
	packed
		.match(/y[0-9a-f]{3}|x[0-9a-f]{2}|[0-9a-f]/gi)!
		.map((v) =>
			parseInt(
				v.startsWith('x') || v.startsWith('y')
					? v.substring(1)
					: v,
				16
			)
		);

// Escapes the separators so tokens can contain them.
const escapeEntry = (entry: string) =>
	entry.replace(/[%,@]/g, encodeURIComponent);

const unescapeEntry = (entry: string) =>
	entry.replace(/%(25|2C|40)/gi, decodeURIComponent);

// `packExtra` adds sections between the nodes and the dictionary,
// which version 2 uses for the pairs, roles and rules.
export const pack = (
	node: NodeData,
	colorCodec = hexCodec,
	packExtra?: (indice: (key: string) => number) => string[]
): string => {
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
					colorCodec.encode(value as SchemistColor)
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

		const packedData = encodeNumbers(data);

		packed.push(`${hiddenFlag}${packedData}`);
		return i;
	};

	const rootIndex = packNode(node).toString(16);

	return [
		rootIndex,
		packed.join(','),
		...(packExtra?.(indice) ?? []),
		[...index.keys()].map(escapeEntry).join(',')
	].join('@');
};

// What comes out of a permalink is validated like any outside data.
// With `unpackExtra`, reads the sections `pack` got `packExtra` for,
// as the root's keys they give.
export const unpack = (
	data: string,
	colorCodec = hexCodec,
	unpackExtra?: (
		sections: string[],
		index: string[]
	) => Partial<NodeData>
) => {
	const [rootIndex, inlinePacked, ...rest] = data.split('@');
	const inlineIndex = rest.pop()!;

	const packed = inlinePacked.split(',');
	const index = inlineIndex.split(',').map(unescapeEntry);

	const unpackValue = (type: Param['type'], value: number) => {
		switch (type) {
			case 'boolean':
				return !!value;
			case 'range':
				return value;
			case 'color':
				return colorCodec.decode(index[value]);
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
		const data = decodeNumbers(packedData);

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

	const tree = inflateNode(
		nodes[parseInt(rootIndex, 16)]
	) as object;

	return validateTree(
		{...tree, ...unpackExtra?.(rest, index)},
		'permalink',
		true
	);
};
