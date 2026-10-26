<script lang="ts">
	import type {Node, Param} from '#lib/stores/nodes.svelte.js';

	interface Props {
		id: Node['id'];
		param: Param;
		value: boolean;
	}

	let {id, param, value = $bindable()}: Props = $props();

	const inputId = $derived(`${id}-${param.name}`);
</script>

<input
	class="button-trigger hidden"
	id={inputId}
	type="checkbox"
	bind:checked={value}
/>

<!-- Spans the whole row of the grid. -->
<label
	class="button input-grid-firstCol input-grid-lastCol"
	class:button--active={value}
	for={inputId}
>
	{param.label}
</label>
