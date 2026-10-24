<script lang="ts">
	import {formatSchemistToHex} from '#lib/color/formatting.js';
	import {permalink} from '#lib/routing.js';
	import type {Entry} from '#lib/stores/combinations.js';
	import {rootNode} from '#lib/stores/palette.js';
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
