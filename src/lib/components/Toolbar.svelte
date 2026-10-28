<script lang="ts">
	import Filters from '#lib/components/combinations/Filters.svelte';
	import GitHubIcon from '#lib/components/icons/github.svg?component';
	import ThemeIcon from '#lib/components/icons/theme.svg?component';
	import PaletteActions from '#lib/components/PaletteActions.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {features} from '#lib/stores/features.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
</script>

<div class="toolbar">
	<!-- svelte-ignore a11y_no_redundant_roles -->
	<header class="brand" role="banner">
		<h1>Schemist</h1>
		<p class="hidden">Cohesive and accessible color schemes</p>
	</header>

	<PaletteActions />

	{#if palette.colors.length > 1}
		<Filters />

		<p class="count" title="Combinations shown / total">
			{combinations.filtered.length} / {combinations.all
				.length}
		</p>
	{/if}

	<!-- svelte-ignore a11y_no_redundant_roles -->
	<nav
		class="button-list"
		role="navigation"
		aria-label="Main menu"
	>
		<button
			class="button button--icon"
			title="{features.isDarkScheme ? 'Light' : 'Dark'} theme"
			onclick={() =>
				(features.isDarkScheme = !features.isDarkScheme)}
		>
			<ThemeIcon />
		</button>

		<a
			class="button button--icon"
			href="https://github.com/felixgirault/schemist"
			title="Source code on GitHub"
		>
			<GitHubIcon />
		</a>
	</nav>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem var(--hgap);
		border-bottom: 1px solid var(--bg-neutral);
		padding: 1rem var(--hgap);
		background: var(--bg-soft);
		font-size: 0.9rem;
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

	h1 {
		font-size: 1.5rem;
		font-weight: 900;
		line-height: 1;
	}

	.count {
		font-family: var(--font-mono);
		white-space: nowrap;
	}

	nav {
		margin-inline-start: auto;
	}
</style>
