<script lang="ts">
	import {formatSchemist} from '#lib/color/formatting.js';
	import Modal from '#lib/components/Modal.svelte';
	import ChildPicker from '#lib/components/palette/ChildPicker.svelte';
	import NodeActions from '#lib/components/palette/NodeActions.svelte';
	import NodeOptions from '#lib/components/palette/NodeOptions.svelte';
	import {parseTree, ungroup} from '#lib/presets.js';
	import {features} from '#lib/stores/features.svelte.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';
	import {
		createNode,
		isGroupDef
	} from '#lib/stores/nodes.svelte.js';
	import {overlayColor} from '#lib/style.js';
	import {discreteGradient} from '#lib/utils/css.js';
	import type {EventHandler} from 'svelte/elements';
	import Node_1 from './Node.svelte';
	import NodeInfo from './NodeInfo.svelte';

	interface Props {
		node: Node;
	}

	let {node}: Props = $props();

	const {id, def, parent} = $derived(node);
	const infoId = $derived(`${id}-info`);
	const optionsId = $derived(`${id}-options`);
	const hasParent = $derived(!!parent);
	const hasOptions = $derived(!!def.params.length);
	const isGroup = $derived(isGroupDef(def));
	// A group shows its colors, top to bottom.
	const outputStyle = $derived(
		isGroup
			? `--outputs: ${discreteGradient(
					Object.values(node.generated).map(
						([color]) => color
					),
					180
				)};`
			: `--output: ${formatSchemist(node.output[0])};`
	);

	let isEditingToken = $state(false);
	let isPickingChild = $state(false);
	let isPickingType = $state(false);

	let hasHint = $derived(
		!hasParent && !isGroup && !node.children.length
	);

	const handleTokenFocus: EventHandler<
		FocusEvent,
		HTMLDivElement
	> = ({currentTarget}) => {
		currentTarget.innerText = node.token;
		isEditingToken = true;
	};

	const handleTokenBlur: EventHandler<
		Event,
		HTMLDivElement
	> = ({currentTarget}) => {
		node.token = currentTarget.innerText;
		currentTarget.innerText = node.output[1];
		isEditingToken = false;
	};

	const handleTokenKey: EventHandler<
		KeyboardEvent,
		HTMLDivElement
	> = (event) => {
		if (event.code === 'Enter') {
			event.preventDefault();
			// Saving happens on blur, so it runs once.
			event.currentTarget.blur();
		}
	};
</script>

<article class:isHidden={node.isHidden}>
	<div class="output" class:isGroup style={outputStyle}></div>

	<div class="self">
		<header>
			<div class="title">
				<h3 class="name">
					<div
						role="textbox"
						tabindex="-1"
						contenteditable="true"
						spellcheck="false"
						aria-label="Design token"
						aria-describedby="{id}-token-hint"
						onfocus={handleTokenFocus}
						onblur={handleTokenBlur}
						onkeydown={handleTokenKey}
					>
						{node.output[1]}
					</div>
				</h3>

				{#if isEditingToken}
					<p class="hint" id="{id}-token-hint">
						{#if hasParent}
							Insert parent color name with $.
							<br />
						{/if}
						{#if isGroup}
							Leave empty to use the parent's name.
						{:else}
							Leave empty to guess a name.
						{/if}
					</p>
				{/if}

				<p class="label">
					{def.label}
					{#if def?.argsLabel}
						<span class="args">
							{def.argsLabel(node.args)}
						</span>
					{/if}
				</p>
			</div>

			<NodeActions
				{infoId}
				{optionsId}
				isHiddenId="{id}-check"
				isRemovable={hasParent}
				isSwappable={hasParent}
				{isGroup}
				bind:isHidden={node.isHidden}
				{hasOptions}
				{hasHint}
				onPick={() => {
					isPickingChild = true;
				}}
				onSwap={() => {
					isPickingType = true;
				}}
				onUngroup={() => ungroup(node)}
				onRemove={() => node.destroy()}
			/>
		</header>

		<NodeInfo id={infoId} {node} />

		{#if hasOptions}
			<NodeOptions id={optionsId} {node} />
		{/if}
	</div>

	{#if node.children.length}
		<div class="children">
			{#each node.children as child (child.id)}
				<Node_1 node={child} />
			{/each}
		</div>
	{/if}
</article>

{#if isPickingChild}
	<Modal
		label="Select matching color"
		overlayColor={overlayColor(
			node.output[0],
			features.isDarkScheme
		)}
		onClose={() => {
			isPickingChild = false;
		}}
	>
		<ChildPicker
			color={node.output[0]}
			onAddNode={(type) => {
				node.addChild(createNode(type));
				isPickingChild = false;
			}}
			onAddPreset={(preset) => {
				preset.nodes.forEach((tree) => {
					node.addChild(parseTree(tree));
				});

				isPickingChild = false;
			}}
		/>
	</Modal>
{/if}

{#if isPickingType}
	<!-- Samples show what the node would become, from its input. -->
	<Modal
		label="Change color type"
		overlayColor={overlayColor(
			node.input[0],
			features.isDarkScheme
		)}
		onClose={() => {
			isPickingType = false;
		}}
	>
		<ChildPicker
			color={node.input[0]}
			selectedType={def.type}
			onAddNode={(type) => {
				node.setType(type);
				isPickingType = false;
			}}
		/>
	</Modal>
{/if}

<style>
	article {
		display: grid;
		grid-template-columns: min-content auto;
		grid-template-rows: auto auto;
		grid-template-areas:
			'output self'
			'output children';
		column-gap: 0.75rem;
		animation: slide-up 250ms ease-out;
		contain: style;
	}

	.self {
		grid-area: self;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		border-radius: var(--radius);
		gap: 3ch;
	}

	.title {
		flex-grow: 1;
	}

	.isHidden > .self .title {
		opacity: 0.5;
	}

	.name {
		font-size: 1em;
		font-weight: bold;
	}

	.label {
		text-transform: lowercase;
		line-height: 1rem;
		font-variant: small-caps;
		font-size: 0.9rem;
		font-weight: normal;
		letter-spacing: 0.04ch;
	}

	@media screen and (min-width: 30rem) {
		.title {
			display: flex;
			flex-direction: column;
		}
	}

	.args {
		font-size: 0.74em;
	}

	.output {
		grid-area: output;
		place-self: stretch;
		box-sizing: border-box;
		border-radius: var(--radius);
		width: 0.75rem;
		min-height: 1.5rem;
		background: var(--output);
	}

	.isHidden > .output {
		background: repeating-linear-gradient(
			120deg,
			transparent 0 0.5ch,
			var(--output) 0.5ch calc(0.5ch + 1px)
		);
	}

	.output.isGroup {
		background: var(--outputs);
	}

	/* Stripes can't be drawn in several colors. */
	.isHidden > .output.isGroup {
		opacity: 0.25;
	}

	.children {
		grid-area: children;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
