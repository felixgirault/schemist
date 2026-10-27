<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import PreviewIcon from '#lib/components/icons/PreviewIcon.svelte';
	import type {
		CombinationContrast,
		SimulatedContrast
	} from '#lib/stores/combinations.svelte.js';
	import {round} from '#lib/utils/math.js';

	interface Props {
		uid: string;
		bgName: string;
		fgName: string;
		contrast: CombinationContrast;
		simulatedContrasts: SimulatedContrast[];
		isCompact?: boolean;
		onPreview: (uid: string) => void;
	}

	let {
		uid,
		bgName,
		fgName,
		contrast,
		simulatedContrasts,
		onPreview,
		isCompact = false
	}: Props = $props();

	let hexFg = $derived(formatRgbToHex(contrast.fg));
</script>

<div
	class="combination outlined elevated"
	class:combination--compact={isCompact}
	style="background: {formatRgbToHex(
		contrast.bg
	)}; color: {hexFg};"
>
	<div class="inner">
		<p class="colors">
			{fgName}
			<br />
			& {bgName}
		</p>

		<p class="level level--withPreview">
			<span>
				<span class="grade">
					{contrast.grade}
				</span>
				<span class="value">
					({round(contrast.level, 1)})
				</span>
			</span>

			<button
				class="button button--icon preview-button"
				title="Preview color combination"
				onclick={() => onPreview(uid)}
			>
				<PreviewIcon />
			</button>
		</p>
	</div>

	{#if simulatedContrasts.length}
		<ul>
			{#each simulatedContrasts as { type, bg, fg, level, grade }}
				<li
					class="simulation simulation--{type}"
					title={type}
					style="background: {formatRgbToHex(
						bg
					)}; color: {formatRgbToHex(fg)};"
				>
					<strong class="simulation-type">
						{#if type === 'protanomaly'}
							<abbr title="Protanomaly">Prot.</abbr>
						{:else if type === 'deuteranomaly'}
							<abbr title="Deuteranomaly">Deut.</abbr>
						{:else if type === 'tritanomaly'}
							<abbr title="Tritanomaly">Trit.</abbr>
						{/if}
					</strong>
					{' '}
					<span class="level">
						<span class="grade">
							{grade}
						</span>
						<span class="value">({round(level, 1)})</span>
					</span>
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

	.combination--compact .colors,
	.combination--compact .value {
		display: none;
	}

	.combination--compact {
		border-radius: var(--radius--small);
	}

	.combination--compact .inner {
		padding: 0.5rem;
	}

	.combination--compact .grade {
		font-size: 1rem;
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

	.grade {
		font-size: 1.5rem;
		font-weight: 900;
		white-space: nowrap;
	}

	.simulation {
		display: flex;
		flex-direction: row-reverse;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0 1ch;
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

	.combination--compact ul {
		display: flex;
	}

	.combination--compact .simulation {
		flex: 1;
		flex-direction: row;
		padding: 0.25rem 0.5rem;
	}

	.combination--compact .simulation .level {
		line-height: 1;
		font-size: 0.5rem;
	}

	.combination--compact .simulation .level .grade {
		font-size: 0.5rem;
	}

	.combination--compact .simulation-type {
		line-height: 1;
		font-size: 0.5rem;
		font-weight: normal;
	}

	.simulation .level .grade {
		font-size: 1rem;
		font-weight: bold;
	}
</style>
