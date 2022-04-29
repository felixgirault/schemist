import {
	cssColor,
	rgbColor,
	schemistColor
} from '$lib/color/spaces';
import type {SchemistColor} from '$lib/color/spaces';
import {joinProperties} from '$lib/utils/css';

export const defaultThemeColor = schemistColor('#ffc208');

export const overlayColor = (
	color: SchemistColor,
	isDark: boolean
) =>
	cssColor({
		...rgbColor({
			...color,
			s: isDark ? 8 : 25,
			l: isDark ? 35 : 10
		}),
		alpha: 0.7
	});

export const duoThemeStyle = (
	background: SchemistColor,
	foreground: SchemistColor
) => {
	const isDark = background.l < foreground.l;

	return joinProperties({
		'--bg': cssColor(background),
		'--bg-soft': cssColor({...foreground, alpha: 0.05}),
		'--bg-hard': cssColor({
			...background,
			l: isDark ? background.l - 2 : background.l + 2
		}),
		'--bg-neutral': cssColor({
			...background,
			s: 0.8 * background.s,
			l: isDark
				? 100 - 0.85 * (100 - background.l)
				: 0.85 * background.l
		}),
		'--bg-overlay': overlayColor(background, isDark),
		'--fg': cssColor(foreground),
		'--fg-light': cssColor({...foreground, alpha: 0.75})
	});
};

export const themeStyle = (
	{h, ...color}: SchemistColor,
	isDark = false
) => {
	const background = {
		...color,
		h: h ?? 0,
		s: h === undefined ? 0 : isDark ? 3 : 8,
		l: isDark ? 12 : 98
	};

	const foreground = {
		...color,
		h: h ?? 0,
		s: h === undefined ? 0 : isDark ? 20 : 20,
		l: isDark ? 95 : 15
	};

	return duoThemeStyle(background, foreground);
};
