<script lang="ts">
	import {rgbToSchemist} from '#lib/color/conversion.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {
		defaultThemeColor,
		duoThemeStyle,
		themeStyle
	} from '#lib/style.js';
	import {styleTag} from '#lib/utils/css.js';
	import '../../../global.css';

	const themeColor = $derived(
		palette.rootColor ?? defaultThemeColor
	);

	// Both themes are rendered so the prerendered page can
	// switch to the dark one before hydration (see app.html).
	const style = $derived(
		combinations.previewed
			? styleTag(
					':root',
					duoThemeStyle(
						rgbToSchemist(
							combinations.previewed.contrast.bg
						),
						rgbToSchemist(
							combinations.previewed.contrast.fg
						)
					)
				)
			: styleTag(':root', themeStyle(themeColor, false)) +
					styleTag(
						":root[data-theme='dark']",
						themeStyle(themeColor, true)
					)
	);
</script>

<!-- @see https://github.com/sveltejs/svelte/issues/3105#issuecomment-1040580565 -->
<svelte:head>
	{@html style}
</svelte:head>
