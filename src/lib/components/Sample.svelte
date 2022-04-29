<script lang="ts">
	export let color: string;
	export let title: string;
</script>

<span class="sample" style="background: {color};" {title} />

<style>
	span {
		display: block;
		box-shadow: inset 0 -2px 0 0 var(--shadow),
			inset 0 -2px 0 0 var(--shadow);
		border-radius: var(--radius);
	}
</style>
