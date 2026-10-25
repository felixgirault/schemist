<script lang="ts">
	import {
		schemistToHsl,
		schemistToLch,
		schemistToRgb
	} from '#lib/color/conversion.js';
	import {
		formatHsl,
		formatLch,
		formatRgb,
		formatSchemistToHex
	} from '#lib/color/formatting.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';
	import {isGroupDef} from '#lib/stores/nodes.svelte.js';

	interface Props {
		id: string;
		node: Node;
	}

	let {id, node}: Props = $props();

	let isGroup = $derived(isGroupDef(node.def));
	let hex = $derived(formatSchemistToHex(node.output[0]));
	let rgb = $derived(schemistToRgb(node.output[0]));
	let hsl = $derived(schemistToHsl(node.output[0]));
	let lch = $derived(schemistToLch(node.output[0]));
</script>

<section {id} popover class="form">
	{#if isGroup}
		<table class="table--small">
			<thead>
				<tr>
					<th>Color</th>
					<th>Hex</th>
				</tr>
			</thead>

			<tbody>
				{#each Object.entries(node.generated) as [colorId, [color, name]] (colorId)}
					<tr>
						<td>{name}</td>
						<td>{formatSchemistToHex(color)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
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
					<td>{hex?.slice(1)}</td>
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
	{/if}
</section>

<style>
	table {
		margin-bottom: 0;
	}
</style>
