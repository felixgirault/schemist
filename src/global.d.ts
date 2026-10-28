/// <reference types="@sveltejs/kit" />

declare module '*.svg?component' {
	import type {Component} from 'svelte';

	const component: Component;
	export default component;
}
