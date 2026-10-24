import type {ColorFormat} from '#lib/color/formatting.js';
import {
	isDarkSchemeEnabled,
	toggleDarkScheme
} from '#lib/features.js';

class Features {
	#isDarkScheme = $state(!!isDarkSchemeEnabled());
	colorInputFormat = $state<ColorFormat>('hex');

	constructor() {
		toggleDarkScheme(this.#isDarkScheme);
	}

	get isDarkScheme() {
		return this.#isDarkScheme;
	}

	set isDarkScheme(enabled: boolean) {
		this.#isDarkScheme = enabled;
		toggleDarkScheme(enabled);
	}
}

export const features = new Features();
