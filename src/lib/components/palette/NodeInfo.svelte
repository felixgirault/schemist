<script lang="ts">
	import {
		schemistToHsl,
		schemistToLch,
		schemistToRgb
	} from '$lib/color/conversion';
	import {
		formatHsl,
		formatLch,
		formatRgb,
		formatSchemistToHex
	} from '$lib/color/formatting';
	import type {Node} from '$lib/stores/nodes';

	export let id: string;
	export let node: Node;

	const {output} = node;

	$: hex = formatSchemistToHex($output[0]);
	$: rgb = schemistToRgb($output[0]);
	$: hsl = schemistToHsl($output[0]);
	$: lch = schemistToLch($output[0]);
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
					{Math.round(rgb.r)}, {Math.round(rgb.g)}, {Math.round(
						rgb.b
					)}
				</td>
				<td>
					{formatRgb(rgb, 0)}
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
					{formatHsl(hsl, 0)}
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
					{formatLch(lch, 0)}
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
