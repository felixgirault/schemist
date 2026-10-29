<script lang="ts">
	interface Props {
		code: string;
	}

	let {code}: Props = $props();
</script>

<textarea rows="10" readonly>{code}</textarea>

<style>
	textarea {
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
