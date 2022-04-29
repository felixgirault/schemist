<script lang="ts">
	import {browser} from '$app/env';
	import Favicon from '$lib/components/meta/Favicon.svelte';
	import GlobalStyle from '$lib/components/meta/GlobalStyle.svelte';
	import OpenGraph from '$lib/components/meta/OpenGraph.svelte';
	import TwitterCards from '$lib/components/meta/TwitterCards.svelte';
	import NotificationArea from '$lib/components/notifications/NotificationArea.svelte';
	import {isLuminosityAnalysisEnabled} from '$lib/stores/combinations';
	import {isDarkScheme} from '$lib/stores/features';
	import {rootColor} from '$lib/stores/palette';
	import GitHubIcon from './icons/GitHubIcon.svelte';
	import ThemeIcon from './icons/ThemeIcon.svelte';
</script>

{#if browser && $rootColor}
	<Favicon color={$rootColor} />
{/if}

<OpenGraph />
<TwitterCards />
<GlobalStyle />

<div
	class="layout"
	class:grayscale={$isLuminosityAnalysisEnabled}
>
	<div class="header">
		<!-- svelte-ignore a11y-no-redundant-roles -->
		<header class="brand" role="banner">
			<h1>Schemist</h1>

			<p class="baseline">
				Build cohesive and accessible
				<span>color schemes</span>
			</p>
		</header>

		<!-- svelte-ignore a11y-no-redundant-roles -->
		<nav
			class="button-list wrap"
			role="navigation"
			aria-label="Main menu"
		>
			<button
				class="button"
				on:click={() => ($isDarkScheme = !$isDarkScheme)}
			>
				<ThemeIcon />
				{$isDarkScheme ? 'Light' : 'Dark'} theme
			</button>

			<a
				class="button"
				href="https://github.com/felixgirault/schemist"
				title="Source code on GitHub"
			>
				<GitHubIcon />
				Source
			</a>
		</nav>
	</div>

	<NotificationArea />

	<slot />
</div>

<style>
	.layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg);
		color: var(--fg);
	}

	.layout > :global(:last-child) {
		flex-grow: 1;
	}

	@media screen and (min-width: 60rem) {
		.layout {
			flex-direction: column-reverse;
		}
	}

	.grayscale {
		filter: grayscale(1);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: calc(var(--vgap) / 2) var(--hgap);
		background: var(--bg-soft);
	}

	@media screen and (min-width: 60rem) {
		.header {
			padding: calc(var(--vgap) / 4) var(--hgap);
		}
	}

	header :global(svg) {
		width: 2rem;
		height: 2rem;
		color: var(--fg);
	}

	@media screen and (min-width: 45rem) {
		.brand {
			display: flex;
			align-items: center;
		}
	}

	h1 {
		font-size: 2rem;
		font-weight: 900;
	}

	@media screen and (min-width: 30rem) {
		h1 {
			font-size: 3rem;
		}
	}

	.baseline {
		font-size: 0.8rem;
	}

	@media screen and (min-width: 45rem) {
		.baseline {
			margin-left: 2rem;
			border-left: 1px solid var(--bg-neutral);
			padding-left: 2rem;
			font-size: 1rem;
		}

		.baseline span {
			display: block;
		}
	}

	.button-list {
		justify-content: flex-end;
	}

	a:hover :global(svg),
	a:focus :global(svg),
	button:hover :global(svg),
	button:focus :global(svg) {
		color: var(--fg);
	}
</style>
