<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let {children}: Props = $props();
</script>

<div class="toolbar">
	{@render children?.()}
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 1rem calc(var(--hgap) / 2);
		border-bottom: 1px solid var(--bg-neutral);
		padding: 1rem var(--hgap);
		background: var(--bg-soft);
		font-size: 0.9rem;
	}

	.toolbar:first-child {
		border-right: 1px solid var(--bg-neutral);
	}

	.toolbar :global(:is(.button, .select)) {
		display: inline-flex;
		align-items: center;
		gap: 0.5ch;
		box-sizing: border-box;
		padding: 0 0.5rem;
		height: 2rem;
		white-space: nowrap;
	}

	.toolbar :global(.button--icon) {
		padding: 0;
		width: 2rem;
		height: 2rem;
	}

	.toolbar :global(fieldset) {
		margin: 0;
	}

	.toolbar :global(.fieldset-fields) {
		padding: 0;
	}
</style>
