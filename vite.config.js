/// <reference types="vitest/config" />
import adapter from '@sveltejs/adapter-static';
import {sveltekit} from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
};

export default config;
