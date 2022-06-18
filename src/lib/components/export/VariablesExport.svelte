<script lang="ts">
	import type {
		Casing,
		ExportEntry,
		Format
	} from '$lib/components/export/Export.svelte';
	import {permalink} from '$lib/routing';
	import {rootNode} from '$lib/stores/palette';
	import {cssRule, sassRule} from '$lib/utils/css';
	import {camelCase, dashCase} from '$lib/utils/strings';

	export let entries: ExportEntry[];
	export let format: Format;
	export let casing: Casing;

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
