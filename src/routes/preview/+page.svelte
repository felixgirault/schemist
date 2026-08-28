<svelte:head>
	<title>Preview</title>
</svelte:head>

<script lang="ts">
	import {sortedColors} from '$lib/stores/combinations';
	import type {Entry} from '$lib/stores/combinations';
	import {formatRgbToHex} from '$lib/color/formatting';

	const fallback: Entry = { id: '', name: 'No color', color: {h:0,s:0,l:100,a:1}, rgbColor: {r:255,g:255,b:255,a:1} };
	let backgroundId: string | undefined;
	let textId: string | undefined;
	let linkId: string | undefined;

	const getColor = (id?: string) => $sortedColors.find((c) => c.id === id) ?? $sortedColors[0] ?? fallback;

	$: if ($sortedColors.length) {
		if (!backgroundId || !$sortedColors.some((c) => c.id === backgroundId)) backgroundId = $sortedColors[0].id;
		if (!textId || !$sortedColors.some((c) => c.id === textId)) textId = $sortedColors[1]?.id ?? $sortedColors[0].id;
		if (!linkId || !$sortedColors.some((c) => c.id === linkId)) linkId = $sortedColors[2]?.id ?? $sortedColors[0].id;
	}

	$: background = getColor(backgroundId);
	$: text = getColor(textId);
	$: link = getColor(linkId);

	$: style = `--background: ${formatRgbToHex(background.rgbColor)}; --text: ${formatRgbToHex(text.rgbColor)}; --link: ${formatRgbToHex(link.rgbColor)};`;
</script>

<div class="preview-page">
	<aside class="controls">
		<h2>Preview hooks</h2>

		<label>
			Background
			<select bind:value={backgroundId}>
				{#each $sortedColors as { id, name, rgbColor } (id)}
					<option value={id}>{name} — {formatRgbToHex(rgbColor)}</option>
				{/each}
			</select>
		</label>

		<label>
			Text
			<select bind:value={textId}>
				{#each $sortedColors as { id, name, rgbColor } (id)}
					<option value={id}>{name} — {formatRgbToHex(rgbColor)}</option>
				{/each}
			</select>
		</label>

		<label>
			Link
			<select bind:value={linkId}>
				{#each $sortedColors as { id, name, rgbColor } (id)}
					<option value={id}>{name} — {formatRgbToHex(rgbColor)}</option>
				{/each}
			</select>
		</label>
	</aside>

	<main class="preview" style={style}>
		<header>
			<h3>Stub page</h3>
			<nav>
				<a href="#">Home</a>
				<a href="#">About</a>
			</nav>
		</header>

		<h3>Realistic content</h3>
		<p>Body text uses the text hook.</p>
		<p>Links use the link hook, like <a href="#">this link</a>.</p>

		<figure>
			<div role="img" aria-label="Placeholder media">Media</div>
			<figcaption>Placeholder media caption</figcaption>
		</figure>

		<form on:submit|preventDefault={() => {}}>
			<label>Name <input type="text" /></label>
			<label>Email <input type="email" /></label>
			<button type="submit">Submit</button>
		</form>

		<p role="alert">Alert component.</p>

		<table>
			<tr><th>Hook</th><th>Color</th></tr>
			<tr><td>Background</td><td>{background.name}</td></tr>
			<tr><td>Text</td><td>{text.name}</td></tr>
			<tr><td>Link</td><td>{link.name}</td></tr>
		</table>
	</main>
</div>

<style>
	.preview-page { display: grid; gap: var(--vgap) var(--hgap); padding: var(--vgap) var(--hgap); background: var(--bg); color: var(--fg); }
	@media screen and (min-width: 60rem) { .preview-page { grid-template-columns: 30ch 1fr; } }
	.controls { align-self: start; position: sticky; top: var(--vgap); display: grid; gap: 0.75rem; }
	.controls label { display: grid; gap: 0.25rem; font-weight: 600; }
	.controls select { border: 0; border-radius: calc(var(--radius) / 4); box-shadow: inset 0 0 0 1px var(--fg); padding: 0.5rem; background: var(--bg-hard); color: var(--fg); font: inherit; }
	.preview { border-radius: var(--radius); padding: 1.5rem; background: var(--background); color: var(--text); }
	.preview header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid currentColor; }
	.preview a { color: var(--link); }
	.preview figure { margin: 1rem 0; }
	.preview figure div { display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; padding: 2.5rem; border-radius: var(--radius); border: 1px dashed currentColor; font-weight: 900; }
	.preview form { display: grid; gap: 0.5rem; max-width: 40ch; margin: 1rem 0; }
	.preview form label { display: grid; gap: 0.25rem; font-weight: 600; }
	.preview form input { border: 1px solid currentColor; border-radius: calc(var(--radius) / 4); padding: 0.5rem; background: transparent; color: var(--text); font: inherit; }
	.preview button { border: 1px solid currentColor; border-radius: var(--radius); padding: 0.5rem 1rem; background: transparent; color: var(--text); font: inherit; font-weight: 600; cursor: pointer; }
	.preview [role='alert'] { margin: 1rem 0; padding: 0.75rem 1rem; border: 1px solid currentColor; border-radius: var(--radius); }
	.preview table { width: 100%; max-width: 50ch; border-collapse: collapse; }
	.preview table th, .preview table td { padding: 0.5rem 0; border-bottom: 1px solid currentColor; }
</style>
