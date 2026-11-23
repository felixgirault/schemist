<script lang="ts">
	import type {
		ExportCasing,
		ExportEntry,
		ExportFormat,
		VariantEntries,
		Requirements
	} from '#lib/core/export.js';
	import {exportVariables} from '#lib/core/export.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: ExportEntry[];
		others: VariantEntries[];
		format: ExportFormat;
		casing: ExportCasing;
		prefix: string;
		requirements: Requirements;
	}

	let {
		entries,
		others,
		format,
		casing,
		prefix,
		requirements
	}: Props = $props();

	let code = $derived(
		exportVariables(
			entries,
			{format, casing, prefix},
			palette.permalink,
			requirements,
			others
		)
	);
</script>

<CodeArea {code} />
