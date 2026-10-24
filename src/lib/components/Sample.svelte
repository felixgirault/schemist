<script lang="ts">
	interface Props {
		color: string;
		title?: string;
	}

	let {color, title = ''}: Props = $props();
</script>

<span class="sample" style="background: {color};" {title}></span>

<style>
	span {
		display: block;
		box-shadow:
			inset 0 -2px 0 0 var(--shadow),
			inset 0 -2px 0 0 var(--shadow);
		border-radius: var(--radius);
	}
</style>
