<script lang="ts">
	import {formatSchemistToHex} from '$lib/color/formatting';
	import {permalink} from '$lib/routing';
	import type {Entry} from '$lib/stores/combinations';
	import {rootNode} from '$lib/stores/palette';
	import CodeArea from './CodeArea.svelte';

	export let entries: Entry[];

	$: tokens = Object.fromEntries(
		entries.map(({name, color}) => [
			name,
			{
				'$type': 'color',
				'$value': formatSchemistToHex(color)
			}
		])
	);

	$: json = {
		'Colors': {
			'$description': `Build with Schemist (${permalink(
				$rootNode
			)})`,
			...tokens
		}
	};

	$: code = JSON.stringify(json, null, 2);
</script>

<CodeArea {code} />
