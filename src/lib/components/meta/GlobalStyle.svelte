<script lang="ts">
	import {rgbToSchemist} from '#lib/color/conversion.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {features} from '#lib/stores/features.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {
		defaultThemeColor,
		duoThemeStyle,
		themeStyle
	} from '#lib/style.js';
	import {styleTag} from '#lib/utils/css.js';
	import '../../../global.css';

	const style = $derived(
		styleTag(
			':root',
			combinations.previewed
				? duoThemeStyle(
						rgbToSchemist(
							combinations.previewed.contrast.bg
						),
						rgbToSchemist(
							combinations.previewed.contrast.fg
						)
					)
				: themeStyle(
						palette.rootColor ?? defaultThemeColor,
						features.isDarkScheme
					)
		)
	);
</script>

<!-- @see https://github.com/sveltejs/svelte/issues/3105#issuecomment-1040580565 -->
<svelte:head>
	{@html style}
</svelte:head>
