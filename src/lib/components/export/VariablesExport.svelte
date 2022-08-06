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

	export let entries: ExportEntry[];
	export let format: ExportFormat;
	export let casing: ExportCasing;

	$: formatRule = format === 'css' ? cssRule : sassRule;
	$: formatCase = casing === 'dash' ? dashCase : camelCase;
	$: variables = entries
		.map(({name, cssColor}) =>
			formatRule(formatCase(name), cssColor)
		)
		.join('\n');
</script>

<pre class="elevated">/* @see {permalink($rootNode)} */
{variables}
</pre>
