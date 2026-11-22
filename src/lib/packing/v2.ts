import type {
	NodeData,
	PairTargets,
	PresetPair,
	Role,
	Rule
} from '#lib/core/nodes.js';
import {targetNames} from '#lib/core/pairs.js';
import type {ColorCodec} from './v1';
import {
	decodeNumbers,
	encodeNumbers,
	pack as packV1,
	unpack as unpackV1
} from './v1';

// Version 1 with colors at full precision instead of hex, so
// permalinks are lossless, and three sections, each a list of
// records. Pairs: the dictionary indexes of the two names, then
// (target name, value) indexes, values being dictionary strings
// since they are free numbers. Roles: the indexes of its name, then
// of its color names. Rules: the indexes of the fg role, the bg role
// and the use (the empty string for none), then targets as in
// pairs. Names are only mapped to colors by `resolvePairs` and
// `resolveRoles`, when the tree is loaded.
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

type Indice = (key: string) => number;

const packTargets = (targets: PairTargets, indice: Indice) =>
	targetNames.flatMap((target) =>
		targets[target] === undefined
			? []
			: [indice(target), indice(String(targets[target]))]
	);

// Reads (target name, value) indexes, ignoring unknown targets and
// malformed values.
const unpackTargets = (numbers: number[], index: string[]) => {
	const targets: PairTargets = {};

	for (let i = 0; i < numbers.length; i += 2) {
		const target = index[
			numbers[i]
		] as (typeof targetNames)[number];
		const value = Number(index[numbers[i + 1]]);

		if (
			targetNames.includes(target) &&
			Number.isFinite(value)
		) {
			targets[target] = value;
		}
	}

	return targets;
};

const records = (section: string | undefined) =>
	section ? section.split(',').map(decodeNumbers) : [];

export const pack = (node: NodeData) =>
	packV1(node, preciseCodec, (indice) => [
		(node.pairs ?? [])
			.map((pair) =>
				encodeNumbers([
					indice(pair.fg),
					indice(pair.bg),
					...packTargets(pair, indice)
				])
			)
			.join(','),
		(node.roles ?? [])
			.map(({name, colors}) =>
				encodeNumbers([indice(name), ...colors.map(indice)])
			)
			.join(','),
		(node.rules ?? [])
			.map((rule) =>
				encodeNumbers([
					indice(rule.fg),
					indice(rule.bg ?? ''),
					indice(rule.use ?? ''),
					...packTargets(rule, indice)
				])
			)
			.join(',')
	]);

export const unpack = (data: string) =>
	unpackV1(
		data,
		preciseCodec,
		([pairs, roles, rules], index) => {
			const extra: Partial<NodeData> = {};
			const pairList = records(pairs).map(
				([fg, bg, ...targets]): PresetPair => ({
					fg: index[fg],
					bg: index[bg],
					...unpackTargets(targets, index)
				})
			);
			const roleList = records(roles).map(
				([name, ...colors]): Role => ({
					name: index[name],
					colors: colors.map((color) => index[color])
				})
			);
			const ruleList = records(rules).map(
				([fg, bg, use, ...targets]): Rule => ({
					fg: index[fg],
					...(index[bg] && {bg: index[bg]}),
					...(index[use] && {use: index[use]}),
					...unpackTargets(targets, index)
				})
			);

			if (pairList.length) extra.pairs = pairList;
			if (roleList.length) extra.roles = roleList;
			if (ruleList.length) extra.rules = ruleList;

			return extra;
		}
	);
