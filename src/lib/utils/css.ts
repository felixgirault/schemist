import type {SchemistColor} from '$lib/color/spaces';
import {cssColor} from '$lib/color/spaces';

export const continuousGradient = (colors: SchemistColor[]) => {
	const l = 100 / colors.length;
	const stops = colors
		.map((color, i) => `${cssColor(color)} ${i * l}%`)
		.join(', ');

	return `linear-gradient(90deg, ${stops})`;
};

export const discreteGradient = (colors: SchemistColor[]) => {
	const l = 100 / colors.length;
	const stops = colors
		.map(
			(color, i) =>
				`${cssColor(color)} ${i * l}% ${(i + 1) * l}%`
		)
		.join(', ');

	return `linear-gradient(90deg, ${stops})`;
};

export const joinProperties = (props: Record<string, string>) =>
	Object.entries(props)
		.map(([name, value]) => `${name}: ${value}`)
		.join('; ');

export const cssRule = (name, value) => `--${name}: ${value};`;
export const sassRule = (name, value) => `$${name}: ${value};`;

export const styleTag = (tagName: string, rules: string) =>
	`<style>${tagName} {${rules}}</style>`;
