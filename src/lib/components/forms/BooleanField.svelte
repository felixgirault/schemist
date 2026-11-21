<script lang="ts">
	import type {Param} from '#lib/core/nodes.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';

	interface Props {
		id: Node['id'];
		param: Param;
		value: boolean;
	}

	let {id, param, value = $bindable()}: Props = $props();

	const inputId = $derived(`${id}-${param.name}`);
</script>

<label for={inputId}>
	{param.label}
</label>

<input id={inputId} type="checkbox" bind:checked={value} />
