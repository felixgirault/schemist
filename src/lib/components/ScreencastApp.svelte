<script lang="ts">
	// This page is only intended to be used to make screencasts
	// of the app. The demo is done within a 800x600 screen,
	// starting with #dbdb00, adding a contrasting color,
	// a complementary color, then changing HSL hue of the
	// root color to ~180, and finally to ~360.
	import App from '$lib/components/App.svelte';
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<App />

<style>
	:global(.header),
	:global(section footer),
	:global(.combinations .data-options),
	:global(.list > p),
	:global(.hint),
	:global(.preview-button) {
		display: none !important;
	}

	:global(main) {
		display: grid;
		grid-template-columns: 40ch 1fr;
	}

	:global(section) {
		padding-block: calc(var(--vgap) * 0.5) !important;
	}

	:global(.combinations .data-layout) {
		display: block;
	}
</style>
