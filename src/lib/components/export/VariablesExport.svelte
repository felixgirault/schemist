<script lang="ts">
	import type {
		ExportCasing,
		ExportEntry,
		ExportFormat
	} from '#lib/core/export.js';
	import {exportVariables} from '#lib/core/export.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: ExportEntry[];
		format: ExportFormat;
		casing: ExportCasing;
		prefix: string;
	}

	let {entries, format, casing, prefix}: Props = $props();

	let code = $derived(
		exportVariables(
			entries,
			{format, casing, prefix},
			palette.permalink
		)
	);
</script>

<CodeArea {code} />
