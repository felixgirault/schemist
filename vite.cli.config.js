import {defineConfig} from 'vite';

// No SvelteKit plugin: the CLI must run on the Svelte-free core.
// `#lib/*` resolves through the `imports` field of package.json.
export default defineConfig({
	build: {
		ssr: 'src/cli/index.ts',
		outDir: 'build-cli',
		emptyOutDir: true,
		rollupOptions: {output: {entryFileNames: 'schemist.js'}}
	},
	ssr: {noExternal: true}
});
