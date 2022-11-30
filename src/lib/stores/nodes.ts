import type {
	Readable,
	Unsubscriber,
	Writable
} from 'svelte/store';
import {derived, get, writable} from 'svelte/store';
import nearestColor from '$lib/color/nearest';
import {hexColor, schemistColor} from '$lib/color/spaces';
import type {SchemistColor} from '$lib/color/spaces';
import defs from '$lib/definitions/nodes';
import {withoutIndex} from '$lib/utils/arrays';
import {uid} from '$lib/utils/generators';
import {omit} from '$lib/utils/objects';
import {sentenceCase} from '$lib/utils/strings';

export type SampleType = 'single' | 'discrete' | 'continuous';

export type Param = {
	type: 'boolean' | 'range' | 'color';
	name: string;
	label: string;
	unit?: string;
	min?: number;
	max?: number;
	default: any;
};

export type Args = {
	[name: string]: any;
};

export type NodeDef = {
	type: string;
	label: string;
	argsLabel?: (args: Args) => string;
	description?: string;
	params: Param[];
	samples: SampleType;
	apply: (color: SchemistColor, args?: Args) => SchemistColor;
};

export type NodeOutput = [color: SchemistColor, name: string];
export type NodeOutputRecord = Record<Node['id'], NodeOutput>;

export type Node = {
	id: string;
	def: NodeDef;
	token: Writable<string>;
	isHidden: Writable<boolean>;
	input: Writable<NodeOutput>;
	args: Writable<Args>;
	output: Readable<NodeOutput>;
	children: Readable<Node[]>;
	parent?: Node;
	disconnectFromParent?: Unsubscriber;
	addChild: (node: Node) => void;
	removeChild: (node: Node) => void;
	connect: (outputs: Writable<NodeOutputRecord>) => void;
	destroy: () => void;
};

export const defaultArgs = (def) =>
	Object.fromEntries(
		def.params.map(({name, default: d}) => [name, d])
	);

export const generateName = (
	token: string,
	color: SchemistColor,
	parentColorName?: string
) =>
	token
		? token.replace('$', parentColorName)
		: sentenceCase(nearestColor(hexColor(color)));

// This whole thing is quite convoluted (shall I say shitty?)
// but at least it makes the tree logic self contained.
export const createNode = (
	type: keyof typeof defs,
	isHidden = false,
	token = ''
): Node => {
	let self: Node;
	let connectedOutputs: Writable<NodeOutputRecord>;
	let disconnect: () => void;

	const id = `n${uid()}`;
	const def = defs[type];
	const isHiddenStore = writable(isHidden);
	const tokenStore = writable(token);
	const input: Writable<NodeOutput> = writable([
		schemistColor('#fff'),
		''
	]);

	const args = writable(
		Object.fromEntries(
			def.params.map((input) => [input.name, input.default])
		)
	);

	const output = derived(
		[tokenStore, input, args],
		([$token, $input, $args]) => {
			const color = def.apply($input[0], $args);
			const name = generateName($token, color, $input[1]);
			return [color, name] as NodeOutput;
		}
	);

	const children = writable([]);

	const removeChild = (child: Node) => {
		children.update((children) => {
			const i = children.findIndex((c) => c === child);

			if (i < 0) {
				return children;
			}

			child?.disconnectFromParent();
			child.parent = null;
			return withoutIndex(children, i);
		});
	};

	const removeFromParent = (node) => {
		node.parent?.removeChild(node);
	};

	const addChild = (child: Node) => {
		children.update(($children) => {
			removeFromParent(child);

			child.parent = self;
			child.disconnectFromParent = output.subscribe(
				child.input.set
			);

			return $children.concat(child);
		});

		if (connectedOutputs) {
			child.connect(connectedOutputs);
		}
	};

	const destroy = () => {
		get(children).forEach((node) => node.destroy());
		removeFromParent(self);
		disconnect?.();
	};

	const connect = (outputs: Writable<NodeOutputRecord>) => {
		get(children).forEach((node) => node.connect(outputs));

		const disconnectOutput = output.subscribe((out) => {
			if (get(isHiddenStore)) {
				return;
			}

			outputs.update(($outputs) => ({
				...$outputs,
				[id]: out
			}));
		});

		const disconnectIsHidden = isHiddenStore.subscribe(
			(is) => {
				outputs.update(($outputs) =>
					is
						? omit($outputs, id)
						: {...$outputs, [id]: get(output)}
				);
			}
		);

		disconnect = () => {
			outputs.update(($outputs) => omit($outputs, id));
			disconnectOutput();
			disconnectIsHidden();
			disconnect = null;
		};

		connectedOutputs = outputs;
	};

	const {set, update, ...readOnlyChildren} = children;

	self = {
		id,
		def,
		isHidden: isHiddenStore,
		token: tokenStore,
		input,
		args,
		output,
		children: readOnlyChildren,
		addChild,
		removeChild,
		connect,
		destroy
	};

	return self;
};
