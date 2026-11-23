<script lang="ts">
	import {formatSchemist} from '#lib/color/formatting.js';
	import Modal from '#lib/components/Modal.svelte';
	import ChildPicker from '#lib/components/palette/ChildPicker.svelte';
	import ColorRoles from '#lib/components/palette/ColorRoles.svelte';
	import NodeActions from '#lib/components/palette/NodeActions.svelte';
	import NodeOptions from '#lib/components/palette/NodeOptions.svelte';
	import {isPresetDef} from '#lib/core/nodes.js';
	import {features} from '#lib/stores/features.svelte.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';
	import {createNode} from '#lib/stores/nodes.svelte.js';
	import {overlayColor} from '#lib/style.js';
	import {expandPreset} from '#lib/tree.js';
	import {discreteGradient} from '#lib/utils/css.js';
	import type {EventHandler} from 'svelte/elements';
	import Node_1 from './Node.svelte';
	import NodeInfo from './NodeInfo.svelte';
	import Swatch from './Swatch.svelte';
	import './tree.css';

	interface Props {
		node: Node;
	}

	let {node}: Props = $props();

	const {id, def, parent} = $derived(node);
	const infoId = $derived(`${id}-info`);
	const optionsId = $derived(`${id}-options`);
	const hasParent = $derived(!!parent);
	const hasOptions = $derived(!!def.params.length);
	const isPreset = $derived(isPresetDef(def));
	// A preset shows its colors, top to bottom.
	const outputStyle = $derived(
		isPreset
			? `--outputs: ${discreteGradient(
					Object.values(node.generated).map(
						({color}) => color
					),
					180
				)};`
			: `--output: ${formatSchemist(node.output.color)};`
	);

	let isEditingToken = $state(false);
	let isPickingChild = $state(false);
	let isPickingType = $state(false);

	let hasHint = $derived(
		!hasParent && !isPreset && !node.children.length
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
		currentTarget.innerText = node.output.name;
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

<article class="tree-node" class:isHidden={node.isHidden}>
	<div class="output" class:isPreset style={outputStyle}></div>

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
						{node.output.name}
					</div>
				</h3>

				{#if isEditingToken}
					<p class="hint" id="{id}-token-hint">
						{#if hasParent}
							Insert parent color name with $.
							<br />
						{/if}
						{#if isPreset}
							Leave empty to use the parent's name.
						{:else}
							Leave empty to guess a name.
						{/if}
					</p>
				{/if}

				<div class="line">
					<p class="label">
						{#if node.isOverridden()}
							<span
								class="mark"
								role="img"
								aria-label="Overridden in this variant"
								title="Overridden in this variant"
							>
								●
							</span>
						{/if}
						{def.label}
						{#if def?.argsLabel}
							<span class="args">
								{def.argsLabel(node.activeArgs)}
							</span>
						{/if}
					</p>
					{#if !isPreset}
						<ColorRoles {id} name={node.output.name} />
					{/if}
				</div>
			</div>

			<NodeActions
				{infoId}
				{optionsId}
				isHiddenId="{id}-check"
				isRemovable={hasParent}
				isSwappable={hasParent}
				{isPreset}
				bind:isHidden={node.isHidden}
				{hasOptions}
				{hasHint}
				onPick={() => {
					isPickingChild = true;
				}}
				onSwap={() => {
					isPickingType = true;
				}}
				onExpand={() => expandPreset(node)}
				onRemove={() => {
					node.destroy();
				}}
			/>
		</header>

		<NodeInfo id={infoId} {node} />

		{#if hasOptions}
			<NodeOptions id={optionsId} {node} />
		{/if}

		{#if isPreset}
			{@const colors = Object.entries(node.generated)}
			<details class="colors" open>
				<summary>{colors.length} colors</summary>
				<ul>
					{#each colors as [colorId, { color, name }] (colorId)}
						<li>
							<Swatch id={colorId} {color} />
							{name}
							<ColorRoles id={colorId} {name} />
						</li>
					{/each}
				</ul>
			</details>
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
			node.output.color,
			features.isDarkScheme
		)}
		onClose={() => {
			isPickingChild = false;
		}}
	>
		<ChildPicker
			color={node.output.color}
			hasPresets
			onAddNode={(type) => {
				node.addChild(createNode(type));
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
			node.input.color,
			features.isDarkScheme
		)}
		onClose={() => {
			isPickingType = false;
		}}
	>
		<ChildPicker
			color={node.input.color}
			selectedType={def.type}
			onAddNode={(type) => {
				node.setType(type);
				isPickingType = false;
			}}
		/>
	</Modal>
{/if}

<style>
	.isHidden > .self .title {
		opacity: 0.5;
	}

	.isHidden > .self .colors {
		opacity: 0.5;
	}

	.colors summary {
		cursor: pointer;
		font-size: 0.9rem;
	}

	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 0.5ch;
	}

	.colors li {
		display: flex;
		align-items: center;
		gap: 0.5ch;
	}

	.colors ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.mark {
		font-size: 0.74em;
	}

	.args {
		font-size: 0.74em;
	}

	.isHidden > .output {
		background: repeating-linear-gradient(
			120deg,
			transparent 0 0.5ch,
			var(--output) 0.5ch calc(0.5ch + 1px)
		);
	}

	/* Stripes can't be drawn in several colors. */
	.isHidden > .output.isPreset {
		background: var(--outputs);
		opacity: 0.25;
	}
</style>
