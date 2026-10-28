/// <reference types="vitest/config" />
import adapter from '@sveltejs/adapter-static';
import {sveltekit} from '@sveltejs/kit/vite';

const svgSuffix = '.svg?component';

// Imports `*.svg?component` files as Svelte components.
// They resolve to a virtual `*.svg.svelte` module, so the
// Svelte plugin compiles them like any other component.
/** @returns {import('vite').Plugin} */
const svgComponents = () => ({
	name: 'svg-components',
	enforce: 'pre',
	async resolveId(source, importer, options) {
		if (!source.endsWith(svgSuffix)) {
			return null;
		}

		const resolved = await this.resolve(
			source.slice(0, -'?component'.length),
			importer,
			options
		);

		return resolved && `${resolved.id}.svelte`;
	},
	async load(id) {
		if (!id.endsWith('.svg.svelte')) {
			return null;
		}

		const file = id.slice(0, -'.svelte'.length);
		const svg = await this.fs.readFile(file, {
			encoding: 'utf8'
		});

		this.addWatchFile(file);
		return svg.replace(
			'<svg',
			'<svg class="icon" aria-hidden="true"'
		);
	},
	hotUpdate({file, modules}) {
		const component = file.endsWith('.svg')
			? this.environment.moduleGraph.getModuleById(
					`${file}.svelte`
				)
			: undefined;

		return component ? [...modules, component] : undefined;
	}
});

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		svgComponents(),
		sveltekit({
			adapter: adapter()
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
};

export default config;
