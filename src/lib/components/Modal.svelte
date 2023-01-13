<script lang="ts">
	import {
		DialogContent,
		DialogOverlay
	} from 'svelte-accessible-dialog';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';

	export let label: string;
	export let overlayColor: string = '';
	export let onClose: () => void;
</script>

<DialogOverlay
	isOpen={true}
	onDismiss={onClose}
	style={overlayColor ? `--bg-overlay: ${overlayColor}` : null}
>
	<DialogContent aria-label={label}>
		<div class="modal">
			<div class="modal-actions">
				<button
					class="button button--close"
					on:click={onClose}
				>
					<CloseIcon />
				</button>
			</div>

			<slot />
		</div>
	</DialogContent>
</DialogOverlay>

<style>
	:global(div[data-svelte-dialog-overlay]) {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		background: var(--bg-overlay) !important;
		backdrop-filter: blur(0.25rem);
		padding: 5vh 5vw;
		z-index: 10;
	}

	:global(div[data-svelte-dialog-content]) {
		position: relative;
		box-sizing: border-box;
		margin: 0 !important;
		border-radius: var(--radius);
		padding: var(--vgap) var(--hgap) !important;
		width: 100% !important;
		max-width: 150ch;
		background: var(--bg) !important;
		color: var(--fg);
		box-shadow: 0 0.1rem 0.5rem 0 var(--shadow),
			0 0.5rem 2rem 0 var(--shadow);
	}

	.modal-actions {
		position: absolute;
		top: 0;
		right: 0;
		margin: var(--vgap) var(--hgap);
		z-index: 50;
	}

	.button--close > :global(svg) {
		width: 1rem;
		height: 1rem;
	}
</style>
