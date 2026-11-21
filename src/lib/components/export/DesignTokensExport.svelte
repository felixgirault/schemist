<script lang="ts">
	import {formatSchemistToHex} from '#lib/color/formatting.js';
	import type {Entry} from '#lib/core/evaluate.js';
	import {serializeTree} from '#lib/presets.js';
	import {permalink} from '#lib/routing.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: Entry[];
	}

	let {entries}: Props = $props();

	let tokens = $derived(
		Object.fromEntries(
			entries.map(({name, color}) => [
				name,
				{
					'$type': 'color',
					'$value': formatSchemistToHex(color)
				}
			])
		)
	);

	let json = $derived({
		'Colors': {
			'$description': `Build with Schemist (${permalink(
				serializeTree(palette.root),
				window.location.origin
			)})`,
			...tokens
		}
	});

	let code = $derived(JSON.stringify(json, null, 2));
</script>

<CodeArea {code} />
