<script lang="ts">
	import type {EventHandler} from 'svelte/elements';
	import {formatSchemist} from '$lib/color/formatting';
	import Modal from '$lib/components/Modal.svelte';
	import ChildPicker from '$lib/components/palette/ChildPicker.svelte';
	import NodeActions from '$lib/components/palette/NodeActions.svelte';
	import NodeOptions from '$lib/components/palette/NodeOptions.svelte';
	import {parseTree} from '$lib/presets';
	import {isDarkScheme} from '$lib/stores/features';
	import type {Node} from '$lib/stores/nodes';
	import {createNode} from '$lib/stores/nodes';
	import {overlayColor} from '$lib/style';
	import NodeInfo from './NodeInfo.svelte';

	export let node: Node;

	const {
		id,
		def,
		token,
		args,
		children,
		isHidden,
		output,
		parent
	} = node;
	const infoId = `${id}-info`;
	const optionsId = `${id}-options`;
	const hasParent = !!parent;
	const hasOptions = !!def.params.length;

	let isInfoOpen = false;
	let areOptionsOpen = !hasParent;
	let isEditingToken = false;
	let isPickingChild = false;

	$: hasHint = !hasParent && !$children.length;

	const handleTokenFocus: EventHandler<
		FocusEvent,
		HTMLDivElement
	> = ({currentTarget}) => {
		currentTarget.innerText = $token;
		isEditingToken = true;
	};

	const handleTokenBlur: EventHandler<
		Event,
		HTMLDivElement
	> = ({currentTarget}) => {
		$token = currentTarget.innerText;
		currentTarget.innerText = $output[1];
		isEditingToken = false;
	};

	const handleTokenKey: EventHandler<
		KeyboardEvent,
		HTMLDivElement
	> = (event) => {
		if (event.code === 'Enter') {
			event.preventDefault();
			handleTokenBlur(event);
		}
	};
</script>

<article class:isHidden={$isHidden}>
	<div
		class="output"
		style="--output: {formatSchemist($output[0])};"
	/>

	<div class="self" class:open={areOptionsOpen}>
		<header>
			<div class="title">
				<h3 class="name">
					<div
						role="textbox"
						contenteditable="true"
						spellcheck="false"
						aria-label="Design token"
						aria-describedby="{id}-token-hint"
						on:focus={handleTokenFocus}
						on:blur={handleTokenBlur}
						on:keydown={handleTokenKey}
					>
						{$output[1]}
					</div>
				</h3>

				{#if isEditingToken}
					<p class="hint" id="{id}-token-hint">
						{#if hasParent}
							Insert parent color name with $.
							<br />
						{/if}
						Leave empty to guess a name.
					</p>
				{/if}

				<p class="label">
					{def.label}
					{#if def?.argsLabel}
						<span class="args">
							{def.argsLabel($args)}
						</span>
					{/if}
				</p>
			</div>

			<NodeActions
				{infoId}
				{optionsId}
				isHiddenId="{id}-check"
				isRemovable={hasParent}
				bind:isHidden={$isHidden}
				bind:isInfoOpen
				bind:areOptionsOpen
				{hasOptions}
				{hasHint}
				onPick={() => {
					isPickingChild = true;
				}}
				onRemove={() => {
					node.destroy();
				}}
			/>
		</header>

		{#if isInfoOpen}
			<NodeInfo id={infoId} {node} />
		{/if}

		{#if hasOptions && areOptionsOpen}
			<NodeOptions id={optionsId} {node} />
		{/if}
	</div>

	{#if $children.length}
		<div class="children">
			{#each $children as child (child.id)}
				<svelte:self node={child} />
			{/each}
		</div>
	{/if}
</article>

{#if isPickingChild}
	<Modal
		label="Select matching color"
		overlayColor={overlayColor($output[0], $isDarkScheme)}
		onClose={() => {
			isPickingChild = false;
		}}
	>
		<ChildPicker
			{node}
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

	.children {
		grid-area: children;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
