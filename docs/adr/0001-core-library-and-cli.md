# 1. Core library and CLI

## Context

Agents should be able to generate color schemes with Schemist:
describe a palette, check its contrasts, adjust it, and hand back
a permalink or an export. Today the logic needed for that is
spread between pure modules and Svelte code:

- Pure already: `color/`, `utils/`, `packing/`, node and preset
  definitions. They only `import type` from `nodes.svelte.ts`.
- Mixed: `stores/nodes.svelte.ts` holds pure types and helpers
  (`NodeDef`, `Param`, `Args`, `defaultArgs`, `generateName`)
  next to the reactive `Node` class.
- Reactive only: the contrast loop of
  `stores/combinations.svelte.ts`, and export formatting inside
  `components/export/*.svelte`.
- `routing.ts` `permalink()` reads `window.location.origin` and
  takes a reactive `Node`.

## Goals

- One Svelte-free core, used by both the app and a CLI, so they
  cannot drift apart.
- A CLI an agent can drive: read the vocabulary, evaluate a tree,
  read contrasts, export.
- No change in app behavior.

## Decision

### Core

Pure modules under `src/lib/core/`, importable by plain Node once
built:

| Module        | Content                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes.ts`    | `NodeDef`, `Param`, `Args`, `NodeOutput`, `defaultArgs`, `generateName`, moved from `nodes.svelte.ts`                                                                 |
| `evaluate.ts` | `evaluate(tree: PresetNode)`: walks the tree with `def.apply` and `generateName`, returns `Entry`-like `{id, name, color, rgbColor}` for visible nodes, in tree order |
| `contrast.ts` | `combine(bgEntries, allEntries, contrastType, blindnessTypes)`: the pair and contrast loop of `combinations.svelte.ts`                                                |
| `export.ts`   | `exportVariables(entries, {format, casing, prefix}, link)` and `exportTokens(entries, link)`, from the export components                                              |

`PresetNode` and `Preset` types also move to the core;
`parseTree` / `serializeTree` stay in `presets.ts` since they
build reactive nodes. `routing.ts` becomes pure in place:
`permalink(tree: PresetNode, origin)`.

The app keeps its reactive layer and calls the core:

- `Node.output` uses `generateName` from the core (already the
  case, only the import moves).
- `combinations.all` calls `combine`; sorting, filters and
  preview stay in the store.
- Export components call the core formatters.
- The three `permalink` callers (`App.svelte`,
  `DesignTokensExport.svelte`, `VariablesExport.svelte`) read
  `palette.permalink`, which passes `serializeTree(root)` and
  `window.location.origin`.

The CLI build (step 5) proves the core runs under plain Node,
without the Svelte compiler. The existing packing snapshots guard
node types and presets.

### CLI

Repo-local, not published: `src/cli/index.ts`, built by its own
`vite.cli.config.js` (`build.ssr` with that entry, no SvelteKit
plugin) to `build-cli/schemist.js`, which is git-ignored.
`npm run cli:build` builds it once; `npm run cli -- <command>`
runs `node build-cli/schemist.js`, so an agent's repeated calls
don't pay for a build. No new dependency: argument parsing uses
`node:util` `parseArgs`.

All output is JSON on stdout, errors on stderr with a non-zero
exit code.

| Command                            | Output                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `types`                            | Node types: `type`, `label`, `description`, `params` (name, kind, min, max, default; color defaults as hex) |
| `presets`                          | Presets: `label`, `description`, `nodes`                                                                    |
| `eval <tree.json\|->`              | `{colors: [{name, hex}], combinations: [{bg, fg, level, grade, simulated}], permalink}`                     |
| `export <tree.json\|-> --format F` | The CSS, Sass or design tokens text, as the app produces it                                                 |

`eval` options: `--contrast wcag2|apca` (default `wcag2`),
`--blindness protanomaly,deuteranomaly,tritanomaly`,
`--min <level>` (default 0). `export` options:
`--format css|sass|tokens`, `--color-format hex|rgb|hsl|lch`,
`--casing dash|camel`, `--prefix`, `--precision`, with the app's
defaults.

The input is a `PresetNode` JSON tree; unknown types or params
are rejected with a message naming them. Color params are CSS
color strings (`"#3b82f6"`, `"hsl(…)"`), converted with
`parseColor` at the input, since `apply` expects color objects;
invalid colors are rejected with a message naming the node and
param. Permalinks use `https://schemist.fglt.fr`, overridable
with `--origin`.

## Alternatives rejected

- **`?tree=<json>` URL param in the app**: redundant, the CLI
  prints a regular `?preset=` permalink.
- **Separate npm package / workspace**: only useful to publish
  the core, which is not a goal yet. A folder keeps one build and
  one test setup.
- **Publishing the CLI on npm**: would move runtime libraries to
  `dependencies` and add a release process. Deferred.
- **MCP server**: more setup and a new dependency. Can wrap the
  core later if non-shell clients matter.
- **Reusing the reactive `Node` class in the CLI**: needs the
  Svelte compiler at runtime.

## Regression safety

Today's tests cover packing, parsing, simulation and utils, but
not naming, combinations or exports, and CI runs neither `check`
nor `build`. Characterization tests are written first, against
the current code, and must pass unchanged through every later
step:

- **Palette outputs**: every preset applied to a few fixed root
  colors, snapshotting hex values and names.
- **Combinations**: a fixed tree loaded in the store,
  snapshotting `combinations.all` for WCAG 2 and APCA, with and
  without simulations (fake timers for the debounce). Snapshots
  hold names, levels and grades, never `uid`s: node ids come from
  a global counter and shift whenever a test adds a node.
- **Exports**: export components rendered with `svelte/server`
  `render()`, snapshotting CSS, Sass and tokens output, with a
  stubbed `window.location.origin`.

Every step runs `npm test`, `npm run check` and `npm run build`.
CI also runs `npm run check`. Since the tree walk exists twice,
one test asserts, for every preset, that `evaluate(tree)` gives
the same colors and names as `collectOutputs(parseTree(tree))`.
The CLI build is run once in step 5 to confirm `color-name-list`
and `nearest-color` bundle for Node. UI wiring is checked by hand
at the end.

## Plan

0. Add the characterization tests above, and `npm run check` to
   CI.
1. Move pure node types and helpers to `core/nodes.ts`, update
   imports.
2. Add `core/evaluate.ts`, with the Svelte-free test and the
   `evaluate` / `parseTree` equivalence test; make `routing.ts`
   `permalink(tree, origin)` and update its three callers.
3. Extract `combine` to `core/contrast.ts`, used by the store.
4. Extract export formatters to `core/export.ts`, used by the
   components.
5. Add the CLI, `vite.cli.config.js`, `cli:build` and `cli`
   scripts, `/build-cli` in `.gitignore`, with tests on argument
   handling, color params and invalid trees. Replace
   `core/core.test.ts` (import-graph guard) with a test that runs
   the built CLI once under plain Node, which crashes on runes if
   a store leaks into core, then delete `core.test.ts`.
6. Update the spec (core layout, CLI section) and the README (CLI
   usage for agents).

## Consequences

- The `Node` class and `evaluate` both apply definitions; naming
  and application logic live once in the core, only the tree walk
  is duplicated.
- Existing limits carry over to the CLI: lossy permalinks, tokens
  with `,` or `@` breaking permalinks (SPEC §13).
