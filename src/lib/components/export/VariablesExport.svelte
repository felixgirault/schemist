<script lang="ts">
	import {permalink} from '#lib/routing.js';
	import type {
		ExportCasing,
		ExportEntry,
		ExportFormat
	} from '#lib/stores/export.js';
	import {rootNode} from '#lib/stores/palette.js';
	import {cssRule, sassRule} from '#lib/utils/css.js';
	import {camelCase, dashCase} from '#lib/utils/strings.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: ExportEntry[];
		format: ExportFormat;
		casing: ExportCasing;
		prefix: string;
	}

	let {entries, format, casing, prefix}: Props = $props();

	let formatRule = $derived(
		format === 'css' ? cssRule : sassRule
	);
	let formatCase = $derived(
		casing === 'dash' ? dashCase : camelCase
	);
	let variables = $derived(
		entries
			.map(({name, cssColor}) =>
				formatRule(
					formatCase(prefix ? `${prefix} ${name}` : name),
					cssColor
				)
			)
			.join('\n')
	);

	let code = $derived(
		`/* @see ${permalink($rootNode)} */\n${variables}`
	);
</script>

<CodeArea {code} />
