<script lang="ts">
	import Favicon from '#lib/components/meta/Favicon.svelte';
	import GlobalStyle from '#lib/components/meta/GlobalStyle.svelte';
	import OpenGraph from '#lib/components/meta/OpenGraph.svelte';
	import TwitterCards from '#lib/components/meta/TwitterCards.svelte';
	import NotificationArea from '#lib/components/notifications/NotificationArea.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {browser} from '$app/env';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let {children}: Props = $props();
</script>

{#if browser && palette.rootColor}
	<Favicon color={palette.rootColor} />
{/if}

<OpenGraph />
<TwitterCards />
<GlobalStyle />

<div
	class="layout"
	class:grayscale={combinations.isLuminosityAnalysisEnabled}
>
	<NotificationArea />

	{@render children?.()}
</div>

<style>
	.layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg);
		color: var(--fg);
	}

	/* The palette and combinations scroll on their own */
	@media screen and (min-width: 55rem) {
		.layout {
			height: 100dvh;
			overflow: hidden;
		}
	}

	.grayscale {
		filter: grayscale(1);
	}
</style>
