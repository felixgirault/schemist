<script lang="ts">
	export let code: string;
</script>

<textarea class="elevated" rows="10" readonly>{code}</textarea>

<style>
	textarea {
		align-self: stretch;
		border: 0;
		border-radius: var(--radius);
		padding: 1rem;
		background: var(--bg-hard);
		font: inherit;
		font-family: var(--font-mono);
		resize: none;
		white-space: pre;
	}
</style>
