<script lang="ts">
	import {formatHex} from 'culori/fn';
	import {permalink} from '$lib/routing';
	import type {Entry} from '$lib/stores/combinations';
	import {rootNode} from '$lib/stores/palette';

	export let entries: Entry[];

	$: tokens = Object.fromEntries(
		entries.map(({name, rgbColor}) => [
			name,
			{
				'$type': 'color',
				'$value': formatHex(rgbColor)
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
</script>

<pre class="elevated">{JSON.stringify(json, null, 2)}</pre>
