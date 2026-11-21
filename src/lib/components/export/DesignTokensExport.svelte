<script lang="ts">
	import type {Entry} from '#lib/core/evaluate.js';
	import {exportTokens} from '#lib/core/export.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: Entry[];
	}

	let {entries}: Props = $props();

	let code = $derived(
		exportTokens(entries, palette.permalink).json
	);
</script>

<CodeArea {code} />
