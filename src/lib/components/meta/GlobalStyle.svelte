<script lang="ts">
	import {rgbToSchemist} from '$lib/color/conversion';
	import {previewedCombination} from '$lib/stores/combinations';
	import {isDarkScheme} from '$lib/stores/features';
	import {rootColor} from '$lib/stores/palette';
	import {
		defaultThemeColor,
		duoThemeStyle,
		themeStyle
	} from '$lib/style';
	import {styleTag} from '$lib/utils/css';
	import '../../../global.css';

	let style = styleTag(
		':root',
		themeStyle(defaultThemeColor, $isDarkScheme)
	);

	$: {
		if ($previewedCombination) {
			style = styleTag(
				':root',
				duoThemeStyle(
					rgbToSchemist($previewedCombination.contrast.bg),
					rgbToSchemist($previewedCombination.contrast.fg)
				)
			);
		} else if ($rootColor) {
			style = styleTag(
				':root',
				themeStyle($rootColor, $isDarkScheme)
			);
		}
	}
</script>

<!-- @see https://github.com/sveltejs/svelte/issues/3105#issuecomment-1040580565 -->
<svelte:head>
	{@html style}
</svelte:head>
