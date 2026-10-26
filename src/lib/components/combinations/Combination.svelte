<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import PreviewIcon from '#lib/components/icons/PreviewIcon.svelte';
	import type {
		CombinationContrast,
		SimulatedContrast
	} from '#lib/stores/combinations.svelte.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {round} from '#lib/utils/math.js';

	interface Props {
		uid: string;
		bgName: string;
		fgName: string;
		contrast: CombinationContrast;
		simulatedContrasts: SimulatedContrast[];
		onPreview: (uid: string) => void;
	}

	let {
		uid,
		bgName,
		fgName,
		contrast,
		simulatedContrasts,
		onPreview
	}: Props = $props();

	let hexFg = $derived(formatRgbToHex(contrast.fg));
</script>

<div
	class="combination elevated"
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
					{#if combinations.contrastType === 'wcag3'}
						APCA
					{/if}
					{contrast.grade}
				</span>
				({round(contrast.level, 1)})
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
					style="background: {formatRgbToHex(
						bg
					)}; color: {formatRgbToHex(fg)};"
				>
					<strong class="simulation-type">
						{type}
					</strong>
					{' '}
					<span class="level">
						<span class="grade">
							{#if combinations.contrastType === 'wcag3'}
								APCA
							{/if}
							{grade}
						</span>
						({round(level, 1)})
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
	}

	.simulation {
		display: flex;
		flex-direction: row-reverse;
		justify-content: space-between;
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

	.simulation .level span {
		font-size: 1rem;
		font-weight: bold;
	}
</style>
