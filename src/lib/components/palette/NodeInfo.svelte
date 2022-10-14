<script lang="ts">
	import {
		cssColor,
		hexColor,
		hslColor,
		lchColor,
		rgbColor,
		toRgb255
	} from '$lib/color/spaces';
	import type {Node} from '$lib/stores/nodes';

	export let id: string;
	export let node: Node;

	const {output} = node;

	$: hex = hexColor($output[0]);
	$: rgb = rgbColor($output[0]);
	$: rgb255 = toRgb255(rgb);
	$: hsl = hslColor($output[0]);
	$: lch = lchColor($output[0]);
</script>

<section {id} class="form">
	<table class="table--small">
		<thead>
			<tr>
				<th>Fmt.</th>
				<th>Values</th>
				<th>CSS Value</th>
			</tr>
		</thead>

		<tbody>
			<tr>
				<td>Hex</td>
				<td>{hex.slice(1)}</td>
				<td>{hex}</td>
			</tr>
			<tr>
				<td>RGB</td>
				<td>
					{Math.round(rgb255.r)}, {Math.round(rgb255.g)}, {Math.round(
						rgb255.b
					)}
				</td>
				<td>
					{cssColor(rgb, 0)}
				</td>
			</tr>
			<tr>
				<td>HSL</td>
				<td>
					{Math.round(hsl.h)}, {Math.round(hsl.s)}, {Math.round(
						hsl.l
					)}
				</td>
				<td>
					{cssColor(hsl, 0)}
				</td>
			</tr>
			<tr>
				<td>LCH</td>
				<td>
					{Math.round(lch.l)}, {Math.round(lch.c)}, {Math.round(
						lch.h
					)}
				</td>
				<td>
					{cssColor(lch, 0)}
				</td>
			</tr>
		</tbody>
	</table>
</section>

<style>
	section {
		margin-top: 0.5rem;
	}

	table {
		margin-bottom: 0;
	}
</style>
