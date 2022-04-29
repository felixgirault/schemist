<script lang="ts">
	import {rgbColor, toRgb255} from '$lib/color/spaces';
	import type {SchemistColor} from '$lib/color/spaces';
	import lightness from '$lib/definitions/nodes/lightness';
	import {presetSamples} from '$lib/samples';
	import {debounce} from '$lib/utils/functions';

	export let color: SchemistColor;
	let dataUrl;

	const size = 16;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext('2d');
	const img = document.createElement('img');
	img.src = '/img/favicon-template.png';

	const preset = [
		{type: lightness.type, args: {amount: 20}},
		{type: lightness.type, args: {amount: 70}},
		{type: lightness.type, args: {amount: 85}}
	];

	const update = (base: SchemistColor) => {
		if (!img.complete) {
			return;
		}

		const [c1, c2, c3] = presetSamples(preset, base).map((c) =>
			toRgb255(rgbColor(c))
		);

		context.drawImage(img, 0, 0, size, size);

		const imageData = context.getImageData(0, 0, size, size);
		const {data} = imageData;

		for (var i = 0; i < data.length; i += 4) {
			switch (data[i]) {
				case 0:
					data[i] = c1.r;
					data[i + 1] = c1.g;
					data[i + 2] = c1.b;
					break;

				case 128:
					data[i] = c2.r;
					data[i + 1] = c2.g;
					data[i + 2] = c2.b;
					break;

				case 255:
					data[i] = c3.r;
					data[i + 1] = c3.g;
					data[i + 2] = c3.b;
					break;
			}
		}

		context.putImageData(imageData, 0, 0);
		dataUrl = canvas.toDataURL('image/png');
	};

	const debouncedUpdate = debounce(update, 500);

	$: color && debouncedUpdate(color);
</script>

<svelte:head>
	{#if dataUrl}
		<link rel="icon" href={dataUrl} />
	{/if}
</svelte:head>
