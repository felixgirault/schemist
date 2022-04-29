<script lang="ts">
	import PreviewNotification from '$lib/components/notifications/PreviewNotification.svelte';
	import {
		previewedCombination,
		previewedCombinationUid
	} from '$lib/stores/combinations';
</script>

<div aria-live="polite">
	{#if $previewedCombination}
		<PreviewNotification
			combination={$previewedCombination}
			onClose={() => {
				$previewedCombinationUid = null;
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
