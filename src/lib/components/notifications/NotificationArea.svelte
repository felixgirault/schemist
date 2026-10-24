<script lang="ts">
	import PreviewNotification from '#lib/components/notifications/PreviewNotification.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<div aria-live="polite">
	{#if combinations.previewed}
		<PreviewNotification
			combination={combinations.previewed}
			onClose={() => {
				combinations.previewedUid = null;
			}}
		/>
	{/if}
</div>

<style>
	div {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		max-width: 40ch;
		z-index: 1000;
	}
</style>
