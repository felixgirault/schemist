<script lang="ts" module>
	import type {RgbColor} from '#lib/color/types.js';
	import type {BlindnessType} from '#lib/core/contrast.js';

	// A level with its grade, and whether it meets the goal (none
	// when there is no goal).
	export interface Row {
		name: string;
		level: number;
		met?: boolean;
	}

	export interface Simulation {
		type: BlindnessType;
		bg: RgbColor;
		fg: RgbColor;
		rows: Row[];
	}
</script>

<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import PreviewIcon from '#lib/components/icons/PreviewIcon.svelte';
	import {round} from '#lib/utils/math.js';
	import type {Snippet} from 'svelte';

	interface Props {
		uid: string;
		bgName: string;
		fgName: string;
		bg: RgbColor;
		fg: RgbColor;
		rows: Row[];
		simulations: Simulation[];
		onPreview: (uid: string) => void;
		// Two areas side by side, not text on a background: a
		// difference is between two colors, not one drawn on the other.
		isDifference?: boolean;
		// Actions and fields of the pair, under its levels
		children?: Snippet;
	}

	let {
		uid,
		bgName,
		fgName,
		bg,
		fg,
		rows,
		simulations,
		onPreview,
		isDifference = false,
		children
	}: Props = $props();

	const colorsOf = (bg: RgbColor, fg: RgbColor) =>
		isDifference
			? ''
			: `background: ${formatRgbToHex(bg)}; color: ${formatRgbToHex(fg)};`;
</script>

{#snippet levels(list: Row[])}
	{#each list as { name, level, met }}
		<span class="level">
			<span class="grade">{name}</span>
			({round(level, 1)}){#if met !== undefined}
				{' '}
				<span class="status">
					{met ? 'met' : 'not met'}
				</span>
			{/if}
		</span>
		{' '}
	{/each}
{/snippet}

{#snippet swatches(fg: RgbColor, bg: RgbColor)}
	<span class="swatches" aria-hidden="true">
		<span style="background: {formatRgbToHex(fg)};"></span>
		<span style="background: {formatRgbToHex(bg)};"></span>
	</span>
{/snippet}

<div
	class="combination elevated"
	class:combination--difference={isDifference}
	style={colorsOf(bg, fg)}
>
	<div class="inner">
		<p class="colors">
			{fgName}
			<br />
			& {bgName}
		</p>

		{#if isDifference}
			{@render swatches(fg, bg)}
		{/if}

		<p class="level level--withPreview">
			<span class="levels">
				{@render levels(rows)}
			</span>

			<button
				class="button button--icon preview-button"
				title="Preview color combination"
				onclick={() => onPreview(uid)}
			>
				<PreviewIcon />
			</button>
		</p>

		{@render children?.()}
	</div>

	{#if simulations.length}
		<ul>
			{#each simulations as { type, bg, fg, rows }}
				<li
					class="simulation simulation--{type}"
					style={colorsOf(bg, fg)}
				>
					<strong class="simulation-type">
						{type}
					</strong>
					{' '}
					<span class="levels">
						{@render levels(rows)}
					</span>
					{#if isDifference}
						{@render swatches(fg, bg)}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.combination {
		overflow: hidden;
		border-radius: var(--radius);
		contain: style paint;
	}

	.combination--difference {
		border: 1px solid currentColor;
	}

	.swatches {
		display: flex;
		height: 2.5rem;
		margin-bottom: 0.5rem;
		overflow: hidden;
		border-radius: var(--radius);
	}

	.swatches span {
		flex: 1;
	}

	.simulation .swatches {
		width: 3rem;
		height: 1rem;
		margin: 0;
	}

	.combination--difference .simulation {
		border-top: 1px solid currentColor;
	}

	.inner {
		position: relative;
		padding: 1rem;
	}

	.colors {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		font-style: italic;
	}

	@media not all and (hover: none) {
		.preview-button {
			opacity: 0.1;
			transition: opacity ease-in 100ms;
		}
	}

	.combination:hover .preview-button,
	.combination:focus-within .preview-button {
		opacity: 1;
	}

	.level--withPreview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1ch;
	}

	.levels {
		display: grid;
	}

	.grade {
		font-size: 1.5rem;
		font-weight: 900;
	}

	.status {
		font-size: 0.9rem;
	}

	.simulation {
		display: flex;
		flex-direction: row-reverse;
		justify-content: space-between;
		gap: 1ch;
		padding: 0.5rem 1rem;
	}

	.simulation-type {
		text-transform: lowercase;
		line-height: 1rem;
		font-variant: small-caps;
		font-size: 0.9rem;
		font-weight: normal;
		letter-spacing: 0.04ch;
	}

	.simulation .level {
		line-height: 1rem;
		font-size: 0.9rem;
	}

	.simulation .grade {
		font-size: 1rem;
		font-weight: bold;
	}
</style>
