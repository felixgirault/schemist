<script lang="ts">
	import type {Node, Param} from '$lib/stores/nodes';

	export let id: Node['id'];
	export let param: Param;
	export let value: boolean;

	const inputId = `${id}-${param.name}`;
</script>

<label for={inputId}>
	{param.label}
</label>

<input id={inputId} type="checkbox" bind:checked={value} />
