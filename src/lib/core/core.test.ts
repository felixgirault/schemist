import {expect, test} from 'vitest';

// Sources of every TypeScript file in lib, keyed by `src/lib` path
// (no node types are installed, so no fs access).
const sources = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>('/src/lib/**/*.ts', {
			query: '?raw',
			import: 'default',
			eager: true
		})
	).map(([path, source]) => [
		path.slice('/src/lib/'.length),
		source
	])
);

// `import type` is skipped: it is erased at build time.
const specifier =
	/(?:^|\n)\s*(?:import|export)\s(?!type\s)[^'"]*?from\s+'([^']+)'/g;

const resolve = (from: string, spec: string) => {
	const parts = spec.startsWith('#lib/')
		? []
		: from.split('/').slice(0, -1);

	for (const part of spec.replace(/^#lib\//, '').split('/')) {
		if (part === '..') parts.pop();
		else if (part !== '.') parts.push(part);
	}

	const base = parts.join('/');
	return [
		base,
		base.replace(/\.js$/, '.ts'),
		`${base}.ts`
	].find((path) => path in sources);
};

// Returns every Svelte file or package reached from a file.
const violations = (
	file: string,
	seen = new Set<string>()
): string[] => {
	if (seen.has(file)) return [];
	seen.add(file);

	return [...sources[file].matchAll(specifier)].flatMap(
		([, spec]) => {
			if (spec === 'svelte' || spec.startsWith('svelte/'))
				return [`${file} imports ${spec}`];
			if (!spec.startsWith('#lib/') && !spec.startsWith('.'))
				return [];
			const target = resolve(file, spec);
			if (!target)
				return [`${file} imports unresolved ${spec}`];
			return target.endsWith('.svelte.ts')
				? [`${file} imports ${spec}`]
				: violations(target, seen);
		}
	);
};

test('core does not reach Svelte code', () => {
	const files = Object.keys(sources).filter(
		(path) =>
			path.startsWith('core/') && !path.includes('.test.')
	);

	expect(files.length).toBeGreaterThan(0);
	expect(files.flatMap((file) => violations(file))).toEqual([]);
});
