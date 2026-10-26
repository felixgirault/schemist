<script lang="ts">
	import {
		wcag2Contrast,
		wcag2Grade,
		wcag3Contrast,
		wcag3Grade
	} from '#lib/color/contrast.js';
	import Combination from '#lib/components/combinations/Combination.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	let isWcag2 = $derived(combinations.contrastType === 'wcag2');
	let levelFn = $derived(
		isWcag2 ? wcag2Contrast : wcag3Contrast
	);
	let gradeFn = $derived(isWcag2 ? wcag2Grade : wcag3Grade);
	let colors = $derived(combinations.sortedColors);

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};

	// bg id => fg id => level, or null when the pair isn't shown
	let levels = $derived(
		Object.fromEntries(
			colors.map((bg) => [
				bg.id,
				Object.fromEntries(
					colors.map((fg) => {
						const level =
							bg.id === fg.id
								? null
								: levelFn(bg.rgbColor, fg.rgbColor);

						return [
							fg.id,
							level !== null &&
							level >= combinations.minLevel
								? level
								: null
						];
					})
				)
			])
		)
	);

	let rows = $derived(
		colors.filter((bg) =>
			colors.some((fg) => levels[bg.id][fg.id] !== null)
		)
	);

	let columns = $derived(
		colors.filter((fg) =>
			colors.some((bg) => levels[bg.id][fg.id] !== null)
		)
	);
</script>

<div class="grid">
	<table>
		<thead>
			<tr>
				<td></td>
				{#each columns as { id, name } (id)}
					<th scope="col" title="Foreground: {name}">
						<span class="name">{name}</span>
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each rows as bg (bg.id)}
				<tr>
					<th scope="row" title="Background: {bg.name}">
						<span class="name">{bg.name}</span>
					</th>

					{#each columns as fg (fg.id)}
						{@const level = levels[bg.id][fg.id]}
						{#if level === null}
							<td></td>
						{:else}
							<td>
								<Combination
									uid="{bg.id}-{fg.id}"
									bgName={bg.name}
									fgName={fg.name}
									contrast={{
										type: 'none',
										bg: bg.rgbColor,
										fg: fg.rgbColor,
										level,
										grade: gradeFn(level)
									}}
									simulatedContrasts={[]}
									onPreview={handlePreview}
									isCompact
								/>
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.grid {
		overflow-x: auto;
	}

	table {
		margin-top: -5ch;
		margin-bottom: 0;
	}

	th {
		padding: 0.5rem;
		font-size: 0.8rem;
		font-weight: normal;
	}

	th[scope='col'] {
		max-height: 15ch;
		text-align: center;
	}

	th[scope='col'] .name {
		writing-mode: sideways-rl;
		vertical-align: bottom;
		transform: rotate(-60deg);
		transform-origin: bottom;
	}

	th[scope='row'] {
		max-width: 15ch;
		vertical-align: middle;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	td {
		padding: 2px 2px 1px 1px;
	}
</style>
