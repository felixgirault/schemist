<script lang="ts">
	import BlindnessFilter from '#lib/components/combinations/BlindnessFilter.svelte';
	import ContrastFilter from '#lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '#lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '#lib/components/combinations/LuminosityFilter.svelte';
	import ViewFilter from '#lib/components/combinations/ViewFilter.svelte';
	import GitHubIcon from '#lib/components/icons/github.svg?component';
	import ThemeIcon from '#lib/components/icons/theme.svg?component';
	import Toolbar from '#lib/components/Toolbar.svelte';
	import {features} from '#lib/stores/features.svelte.js';
</script>

<Toolbar>
	<ViewFilter />
	<ContrastTypeFilter />
	<ContrastFilter />
	<BlindnessFilter />
	<LuminosityFilter />

	<div class="spacer"></div>

	<div class="button-list">
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
	</div>
</Toolbar>

<style>
	.spacer {
		margin-inline-end: auto;
	}
</style>
