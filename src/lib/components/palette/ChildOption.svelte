<script lang="ts">
	export let label: string;
	export let description: string = undefined;
	export let onClick: () => void;
</script>

<button on:click={onClick}>
	<span class="label h3">
		{label}
	</span>

	{#if description}
		<span class="description hint">{description}</span>
	{/if}

	<slot />
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

	.description {
		display: block;
		margin-bottom: 0.25rem;
	}
</style>
