<script lang="ts">
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';

	interface Props {
		label: string;
		description?: string;
		isSelected?: boolean;
		onClick: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		label,
		description = '',
		isSelected = false,
		onClick,
		children
	}: Props = $props();
</script>

<button onclick={onClick} aria-current={isSelected || undefined}>
	<span class="label h3">
		{label}

		{#if isSelected}
			<CheckIcon />
		{/if}
	</span>

	{#if description}
		<span class="description hint">{description}</span>
	{/if}

	{@render children?.()}
</button>

<style>
	button {
		border: 0;
		padding: 0;
		background: transparent;
		color: var(--fg);
		text-align: left;
		font: inherit;
		cursor: pointer;
	}

	button :global(.sample) {
		height: 2rem;
		transition: transform 50ms ease-in;
	}

	button:hover :global(.sample),
	button:focus :global(.sample) {
		transform: scale(105%, 100%);
	}

	.label {
		display: block;
		margin-bottom: 0.25rem;
		font-weight: 600;
	}

	.label :global(svg) {
		width: 1em;
		height: 1em;
		vertical-align: middle;
	}

	.description {
		display: block;
		margin-bottom: 0.25rem;
	}
</style>
