<script lang="ts">
	interface Props {
		code: string;
		describedby?: string;
	}

	let {code, describedby}: Props = $props();
</script>

<textarea
	class="elevated"
	rows="10"
	aria-describedby={describedby}
	readonly>{code}</textarea>

<style>
	textarea {
		flex: 1;
		align-self: stretch;
		border: 0;
		border-radius: var(--radius);
		padding: 1rem;
		background: var(--bg-hard);
		color: var(--fg);
		font: inherit;
		font-family: var(--font-mono);
		resize: none;
		white-space: pre;
	}
</style>
