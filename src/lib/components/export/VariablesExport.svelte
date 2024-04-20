<script lang="ts">
	import {permalink} from '$lib/routing';
	import type {
		ExportCasing,
		ExportEntry,
		ExportFormat
	} from '$lib/stores/export';
	import {rootNode} from '$lib/stores/palette';
	import {cssRule, sassRule} from '$lib/utils/css';
	import {camelCase, dashCase} from '$lib/utils/strings';
	import CodeArea from './CodeArea.svelte';

	export let entries: ExportEntry[];
	export let format: ExportFormat;
	export let casing: ExportCasing;
	export let prefix: string;

	$: formatRule = format === 'css' ? cssRule : sassRule;
	$: formatCase = casing === 'dash' ? dashCase : camelCase;
	$: variables = entries
		.map(({name, cssColor}) =>
			formatRule(
				formatCase(prefix ? `${prefix} ${name}` : name),
				cssColor
			)
		)
		.join('\n');

	$: code = `/* @see ${permalink($rootNode)} */\n${variables}`;
</script>

<CodeArea {code} />
