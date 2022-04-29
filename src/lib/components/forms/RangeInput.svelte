<script lang="ts">
	export let id: string;
	export let min: number;
	export let max: number;
	export let value: number;
	export let gradient: string;
	export let onInput: (value: number) => void = null;

	const handleInput = onInput
		? (event) => onInput(parseInt(event.target.value))
		: null;
</script>

<input
	{id}
	type="range"
	style="--gradient: {gradient};"
	{min}
	{max}
	bind:value
	on:input={handleInput}
/>

<style>
	input {
		-webkit-appearance: none;
		width: 100%;
		height: 1rem;
		background: transparent;
	}

	input::-ms-track {
		width: 100%;
		cursor: pointer;
		background: transparent;
		border-color: transparent;
		color: transparent;
	}

	input::-webkit-slider-runnable-track {
		width: 100%;
		height: 1rem;
		cursor: pointer;
		box-shadow: inset 0 0 0 1px var(--fg-light);
		background: var(--gradient);
		border-radius: var(--radius);
		border: none;
	}

	input:focus::-webkit-slider-runnable-track {
		background: var(--gradient);
	}

	input::-moz-range-track {
		width: 100%;
		height: 1rem;
		cursor: pointer;
		box-shadow: inset 0 0 0 1px var(--fg-light);
		background: var(--gradient);
		border-radius: var(--radius);
		border: none;
	}

	input::-ms-track {
		width: 100%;
		height: 1rem;
		cursor: pointer;
		background: transparent;
		border-color: transparent;
		border-width: 16px 0;
		color: transparent;
	}

	input::-ms-fill-lower {
		background: var(--gradient);
		border: none;
		border-radius: var(--radius);
		box-shadow: inset 0 0 0 1px var(--fg-light);
	}

	input:focus::-ms-fill-lower {
		background: var(--gradient);
	}

	input::-ms-fill-upper {
		background: var(--gradient);
		border: none;
		border-radius: var(--radius);
		box-shadow: inset 0 0 0 1px var(--fg-light);
	}

	input::-webkit-slider-thumb {
		-webkit-appearance: none;
		box-shadow: 0 0 0 1px var(--fg-light);
		border-radius: var(--radius);
		height: 1rem;
		width: 0.75rem;
		background: var(--bg);
		cursor: pointer;
	}

	input::-moz-range-thumb {
		box-shadow: 0 0 0 1px var(--fg-light);
		border-radius: var(--radius);
		height: 1rem;
		width: 0.75rem;
		background: var(--bg);
		cursor: pointer;
	}

	input::-ms-thumb {
		box-shadow: 0 0 0 1px var(--fg-light);
		border-radius: var(--radius);
		height: 1rem;
		width: 0.75rem;
		background: var(--bg);
		cursor: pointer;
	}
</style>
