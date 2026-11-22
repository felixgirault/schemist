# Schemist specification

Reference description of Schemist as implemented on `main`. Paths
are relative to the repository root. `#lib/…` is the import alias
for `src/lib/…`.

## 1. Overview

Schemist is a client-side web app to build color schemes. A
palette is a **tree of colors**: each node derives its color from
its parent through an operation (rotate hue, set lightness, …),
so changing the root color regenerates the whole palette.

Alongside the tree, the app lists the **contrast of every color
combination** (WCAG 2 or APCA), optionally under simulated color
vision deficiencies, and **exports** the palette as a table,
design tokens, CSS or Sass variables. A palette is shared through
a **permalink** that encodes the whole tree in the URL.

There is no backend: the site is prerendered and fully static.
Production URL: <https://schemist.fglt.fr>.

## 2. Tech stack

| Concern     | Choice                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------- |
| Framework   | SvelteKit 3, Svelte 5 (runes everywhere, no `svelte/store`)                                  |
| Build       | Vite 8, `@sveltejs/adapter-static`, every route prerendered                                  |
| Language    | TypeScript 6                                                                                 |
| Color math  | `culori` (tree-shaken `culori/fn` build)                                                     |
| Contrast    | `culori` `wcagContrast` (WCAG 2), `apca-w3` (APCA)                                           |
| Color names | `color-name-list` (`bestof` list) + `nearest-color`                                          |
| Dialogs     | `svelte-accessible-dialog`                                                                   |
| Tests       | Vitest 5 (`src/**/*.{test,spec}.{js,ts}`, `evals/**/*.test.ts`)                              |
| Formatting  | oxfmt (`.oxfmtrc.json`: tabs, width 3, 65 columns, single quotes, sorted imports)            |
| CI          | GitHub Actions, Node 24: `npm ci`, `npm test` then `npm run check`, on `main` pushes and PRs |

Scripts:

| Script               | Effect                                                                |
| -------------------- | --------------------------------------------------------------------- |
| `npm start`          | Dev server                                                            |
| `npm run build`      | Static build into `build/`                                            |
| `npm run check`      | `svelte-kit sync` + `svelte-check` (types)                            |
| `npm test`           | Unit tests                                                            |
| `npm run lint`       | `oxfmt --check`                                                       |
| `npm run format`     | `oxfmt` (writes)                                                      |
| `npm run cli:build`  | `svelte-kit sync` + builds the CLI into `build-cli/schemist.js` (§14) |
| `npm run cli`        | `node build-cli/schemist.js` (§14)                                    |
| `npm run eval`       | Runs the agent evals, then grades them, costs money (§15)             |
| `npm run eval:grade` | Grades a results directory again (§15)                                |

Kit configuration lives in `vite.config.js`
(`sveltekit({adapter: adapter()})`); there is no
`svelte.config.js`.

## 3. Repository layout

```
src/
  app.html                 HTML shell (title, fonts.css, favicon)
  global.css               Global styles, consume theme variables (§11.6)
  cli/                     Command-line interface (§14)
  routes/
    +layout.server.ts      prerender = true
    +layout.svelte         Wraps pages in Layout
    +page.svelte           The app
    screencast/+page.svelte  Same app, noindex, used to record demos
  lib/
    color/                 Color model, conversions, parsing, formatting,
                           manipulation, contrast, simulation, naming
    core/                  Svelte-free logic, shared with the CLI (no runes):
                           nodes.ts (NodeType, NodeDef, defineNode, Param,
                           Args, NodeOutput, NodeData, PresetDef,
                           definePreset, defaultArgs, applyDef),
                           tree.ts (validateTree, withIds, §5.3),
                           evaluate.ts (evaluate(NodeData) → colors),
                           contrast.ts (combine, §9.1),
                           difference.ts (difference, §9.6),
                           pairs.ts (resolvePairs, checkPair, §9.7),
                           export.ts (export formatters and defaults, §11.8)
    definitions/           `defs`: every node type, presets included
      nodes/               Node types (§6)
      presets/             Presets (§7)
    stores/                Reactive state, `.svelte.ts` modules (§8)
    packing/               Permalink encoding (§10)
    components/            UI (§11)
    utils/                 Generic helpers (arrays, css, math, strings, …)
    tree.ts                parseTree / serializeTree (tree ⇄ NodeData),
                           parsePairs / namePairs (pairs ⇄ names, §8.1)
    palette.ts             loadPalette (initial tree and pairs from URL, storage or random)
    routing.ts             permalink(tree, origin)
    samples.ts             Color previews for pickers and sliders
    style.ts               Theme CSS variables from a color
    features.ts            Dark scheme preference (localStorage)
    testing/               Fixtures shared by tests
static/                    Fonts, favicon, favicon template, demo GIF
evals/                     Agent evals (§15)
docs/adr/                  Architecture decision records
vite.cli.config.js         CLI build (§14)
```

## 4. Color model

### 4.1 `SchemistColor`

The internal color type, a hybrid of two perceptual spaces:

| Field | Range | Meaning                          |
| ----- | ----- | -------------------------------- |
| `h`   | 0–360 | Hue, taken from **OKLCH**        |
| `s`   | 0–100 | Saturation, taken from **OKHSL** |
| `l`   | 0–100 | Lightness, taken from **OKHSL**  |
| `a`   | 0–1   | Optional alpha                   |

- `rgbToSchemist`: hue from OKLCH, `s`/`l` from OKHSL (×100).
  Achromatic colors get `h = 0`.
- `schemistToRgb`: rebuilds an OKHSL color from `h`, `s`, `l` and
  converts it to sRGB.
- Conversions to and from `RgbColor` (0–255), `HslColor` and
  `LchColor` exist in `#lib/color/conversion.ts`. LCH chroma is
  normalized to 0–100 against culori's chroma range.

Other color types: `RgbColor {r, g, b: 0–255, a?}`,
`HslColor {h: 0–360, s, l: 0–100, a?}`,
`LchColor {l: 0–100, c: 0–100, h: 0–360, a?}`.

### 4.2 Parsing

`parseColor(text)` returns `[format, SchemistColor]` or `[]`:

| Input                               | Format |
| ----------------------------------- | ------ |
| `#rgb`, `#rrggbb` (and alpha forms) | `hex`  |
| `rgb(…)`, named colors (`red`)      | `rgb`  |
| `hsl(…)`                            | `hsl`  |
| `lch(…)`                            | `lch`  |

Parsing relies on culori modes registered in
`#lib/color/culori.ts` (`rgb`, `hsl`, `lch`, `lrgb`).

### 4.3 Formatting

`ColorFormat = 'hex' | 'rgb' | 'hsl' | 'lch'`.

| Format | Output                               |
| ------ | ------------------------------------ |
| hex    | `#rrggbb`                            |
| rgb    | `rgb(r, g, b)` or `rgba(r, g, b, a)` |
| hsl    | `hsl(h s% l%)`                       |
| lch    | `lch(l% c h)`                        |

Numbers are rounded to a `precision` (decimals, default 3).
`formatSchemist` gives hex, or `rgba()` when alpha is set.

### 4.4 Naming

`generateName(token, color, parentName)`:

1. Empty token: the nearest name in `color-name-list/bestof`,
   sentence-cased (e.g. `Purple illusion`).
2. Token with `$` and a parent: the **first** `$` is replaced by
   the parent's name (`On $` → `On Info`).
3. Otherwise the token itself.

### 4.5 Manipulations (`#lib/color/manipulation.ts`)

| Function                                    | Effect                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `rotateHue(c, deg)`                         | `h + deg`, wrapped to 0–360                                                                |
| `setLightness(c, l)` / `setSaturation`      | Sets `l` / `s`                                                                             |
| `scaleLightness(c, amount, targetH, shift)` | `l + amount` (clamped 0–100); hue moves toward `targetH` by `                              | amount | /100 × shift/100` of the shortest arc |
| `highlightColor(c, amount, shift, K)`       | `scaleLightness(+amount)` toward the hue of a `K` kelvin light                             |
| `shadowColor(c, amount, shift, K)`          | `scaleLightness(−amount)` toward the opposite of that hue                                  |
| `contrastingColor(c, amount)`               | If `l > 50`: `l − l × amount%`, else `l + (100 − l) × amount%`                             |
| `blueish/greenish/orangeish/reddishColor`   | Snaps hue to the angle closest to 244 / 144 / 57 / 25, on a 15° grid around the target     |
| `temperatureToHue(K)`                       | Hue of a black body at `K` kelvins, `K` clamped to 1000–40000 (Tanner Helland's algorithm) |
| `randomUsableColor()`                       | `h` integer 0–360, `s` 50–100, `l` 30–90                                                   |

## 5. Node tree

### 5.1 `Node` (`#lib/stores/nodes.svelte.ts`)

A class with reactive fields:

| Field       | Kind     | Description                                                                           |
| ----------- | -------- | ------------------------------------------------------------------------------------- |
| `id`        | readonly | `n<uid>`, unique per session                                                          |
| `def`       | raw      | Node type definition (§6), replaced by `setType`                                      |
| `token`     | state    | Name template (§4.4), `''` for an automatic name                                      |
| `isHidden`  | state    | Excluded from combinations and exports, still drawn in the tree                       |
| `args`      | state    | Parameter values, initialized from the type's defaults                                |
| `children`  | getter   | Child nodes, ordered (private state, read-only)                                       |
| `parent`    | getter   | Parent node, `undefined` for the root (private state)                                 |
| `input`     | derived  | `parent.output`, or `{color: white, name: ''}` for the root                           |
| `generated` | derived  | Colors of a preset, `{[id]: {color, name}}`, `{}` for other types (§7)                |
| `output`    | derived  | `{color: def.apply(input.color, args), name: generateName(token, color, input.name)}` |

Both ends of the parent-children link are private and only change
through the operations: `addChild(child)` (detaches it from its
previous parent first), `removeChild(child)`, `destroy()`
(removes the node and its subtree from its parent),
`setType(type)` (changes the definition, keeping the id, token,
visibility and children; it throws if it would make a preset of a
node with children), `replaceWith(nodes)` (puts nodes in its
place among its siblings). `addChild` throws on presets (§7). The
`id` can be given to the constructor, `n<uid>` otherwise.

`generateName` and the `NodeDef`, `Param`, `Args` and
`NodeOutput` (`{color, name}`) types live in
`#lib/core/nodes.ts`.

`setType` remaps args with `remapArgs` (`#lib/core/nodes.ts`): an
arg is kept when the new type has a param with the same name,
kind and range, and reset to the new type's default otherwise
(ADR 8). Highlight ↔ Shadow and Lightness ↔ Saturation keep all
their args.

### 5.2 Outputs

`collectOutputs(root)` walks the tree depth-first, parent before
children, and returns `{[id]: {color, name}}` for every
**visible** node, presets replaced by their generated colors
(§7). Children of a hidden node are still collected.

`evaluate(NodeData)` (`#lib/core/evaluate.ts`) computes the same
visible outputs without the store, as `PaletteColor`s
(`{id, name, color, rgbColor}`). Ids are depth-first indexes
(`'0'`, `'1'`, …).

### 5.3 Tree data (`#lib/tree.ts`, `#lib/core/tree.ts`)

`NodeData = {id?, type, token?, args?, children?, isHidden?, pairs?, roles?, rules?}`
(`#lib/core/nodes.ts`) is the plain form of a tree, used by
presets, permalinks, history snapshots and the CLI, with `type` a
`NodeType` (§6). `parseTree(NodeData) → Node` merges given `args`
over the type defaults and reuses `id` when set;
`serializeTree(Node, pairs?) → IdentifiedNodeData` (a tree whose
ids are all set) includes ids, omits empty tokens, args and
children, and writes the root's pairs (§8.1). Permalinks don't
store ids. `changedArg` and `withIds` live in
`#lib/core/tree.ts`.

`validateTree(data, path, isRoot?)` (`#lib/core/tree.ts`, which
also accepts the root's `pairs`, `roles` and `rules`) checks data
from outside and returns a `NodeData`: unknown keys, node types
and params, and invalid values are rejected naming their path.
Color args are CSS strings, converted to colors. The CLI (§14)
validates its input with it, and `unpack` (§10) validates what a
permalink holds before building the tree.

## 6. Node types

Defined in `src/lib/definitions/nodes/` with `defineNode`, which
infers the type of `apply`'s and `argsLabel`'s arguments from
`params`, and registered in `index.ts` (`colorDefs` by type,
typed against the `ColorType` union of the codes below so that
none is missing or misspelled; `defList` for display order). The
presets (§7) join them in `definitions/index.ts`, which exports
`defs` typed against `NodeType`, the union of both. A definition
has a short `type` code (used in permalinks), a `label`, an
optional `description` and `argsLabel`, `params`, a `samples`
style for previews (`single`, `discrete`, `continuous`) and
`apply(color, args)` (the `NodeDef` type, in
`#lib/core/nodes.ts`).

| Type  | Label                     | Params (min–max, default)                                  | Result                                 |
| ----- | ------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `anl` | Analogous                 | steps 1–11 (1)                                             | Hue + steps × 30°                      |
| `cmp` | Complementary             | —                                                          | Hue + 180°                             |
| `scl` | Left split complementary  | —                                                          | Hue − 150°                             |
| `scr` | Right split complementary | —                                                          | Hue + 150°                             |
| `ttl` | Left tetrad               | —                                                          | Hue − 90°                              |
| `ttr` | Right tetrad              | —                                                          | Hue + 90°                              |
| `trl` | Left triad                | —                                                          | Hue − 120°                             |
| `trr` | Right triad               | —                                                          | Hue + 120°                             |
| `ctr` | Contrasting               | amount % 0–100 (80)                                        | `contrastingColor`                     |
| `inf` | Informative               | —                                                          | Blueish hue                            |
| `pos` | Positive                  | —                                                          | Greenish hue                           |
| `wrn` | Warning                   | —                                                          | Orangeish hue                          |
| `neg` | Negative                  | —                                                          | Reddish hue                            |
| `hlt` | Highlight                 | amount % 0–50 (10), shift % 0–100 (15), temp 550–750 (650) | `highlightColor(…, temp × 10 K)`       |
| `sdw` | Shadow                    | amount % 0–50 (10), shift % 0–100 (15), temp 550–750 (650) | `shadowColor(…, temp × 10 K)`          |
| `l`   | Lightness                 | amount % 0–100 (50)                                        | `l = amount`                           |
| `s`   | Saturation                | amount % 0–100 (50)                                        | `s = amount`                           |
| `h`   | Hue                       | degrees 0–360 (180)                                        | Hue + degrees                          |
| `clr` | Custom color              | color (`#ffc208`)                                          | The color argument, ignoring the input |

Param kinds: `range` (integer slider), `color` (color picker,
§11.3), `boolean` (toggle button, used by presets).

## 7. Presets

A preset is a node type whose params generate several colors (ADR
7). Each is defined in `src/lib/definitions/presets/` with
`definePreset`, which is a `NodeDef` plus
`build(args) → NodeData[]`: a template tree, evaluated on the
node's input with the existing node types, never stored. Its own
`apply` returns the input unchanged. Presets are registered in
`defs` (so packing, storage and the CLI handle them as any other
type) but not in `defList`; `presets/index.ts` lists them for the
child picker.

- A preset node has no children: `addChild` throws, `parseTree`
  and `unpack` drop children, and `validateTree` rejects them.
- Its colors are derived: `Node.generated` (and `evaluate` in the
  core) evaluates `build(args)`, honoring the `isHidden` and
  tokens of the template nodes. `$` in them refers to the
  preset's name: its token, or the parent's name when empty.
- Generated colors have ids `<preset id>.<index>`, the index
  being the depth-first position in the template (`n12.3`, and
  `n12.1.0` for a preset inside a preset). In `evaluate`, a
  preset at depth-first index `1` generates `1.0`, `1.1`, …
- `collectOutputs` emits the visible generated colors instead of
  the preset itself; hiding the preset hides all of them.
- **Expand** (`expandPreset`, `#lib/tree.ts`) replaces the preset
  with `parseTree` of its template, at its position among its
  siblings, in one change. The new nodes keep the generated ids,
  so combination filters carry over; they are hidden if the
  preset was, and `$` is replaced by the preset's token if it had
  one. Expanded nodes can't be turned back into a preset.

| Type  | Preset                 | Params (min–max, default)                             | Builds                                                                                                                                  |
| ----- | ---------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `stt` | States                 | amount % 0–50 (10)                                    | Highlight `$ light`, Shadow `$ dark`                                                                                                    |
| `spc` | Split complementary    | —                                                     | `scl`, `scr`                                                                                                                            |
| `trd` | Triad                  | —                                                     | `trl`, `trr`                                                                                                                            |
| `ttd` | Tetrad                 | —                                                     | `ttl`, `ttr`                                                                                                                            |
| `sem` | Semantic colors        | —                                                     | `inf` Info, `pos` Success, `wrn` Warning, `neg` Error                                                                                   |
| `smp` | Semantic color pairs   | —                                                     | Semantic colors, each with a Contrasting child `On $`                                                                                   |
| `lsc` | Scale                  | steps 1–10 (9)                                        | `steps` Lightness nodes of `round(100 × i / (steps + 1))`, `i` in `1…steps` (no black and white ends)                                   |
| `ntl` | Neutral                | saturation % 0–100 (5)                                | Hidden Saturation `Desaturated $` with Lightness 98, 85, 50, 15, 2 (`Neutral white` … `Neutral black`)                                  |
| `hrm` | Harmonies              | tetrad, triad, split (booleans, all `true`)           | The enabled harmonies: left ones, then right ones, from the farthest hue to the closest and back                                        |
| `rnb` | Rainbow                | colors 1–23 (11)                                      | `count` Hue nodes of `round(360 × i / (count + 1))`°                                                                                    |
| `mtl` | Material tones light   | —                                                     | Lightness 40 `$`, 100 `On $`, 90 `$ container`, 10 `On $ container`                                                                     |
| `mtd` | Material tones dark    | —                                                     | Lightness 80 `$`, 20 `On $`, 30 `$ container`, 90 `On $ container`                                                                      |
| `mnl` | Material neutral light | —                                                     | Hidden Saturation 10 with Lightness 99 Surface, 10 On surface, 90 Surface variant, 30 On surface variant, 50 Outline                    |
| `mnd` | Material neutral dark  | —                                                     | Same tokens with Lightness 10, 90, 30, 80, 60                                                                                           |
| `mal` | Material light         | —                                                     | Hidden Saturation 40 `Primary` with Material tones light, hidden Complementary and Error branches with them, and Material neutral light |
| `mad` | Material dark          | —                                                     | Same structure with dark tones and dark neutrals                                                                                        |
| `sch` | Schemist theme         | secondary, tertiary, semantics, neutrals (all `true`) | Triad left `Secondary` and right `Tertiary` (each with States), Semantic color pairs, Neutral, as enabled                               |

Presets reusing other presets (Material, Schemist theme) embed
them as preset nodes, which can be expanded in turn.

## 8. Application state

All state lives in `.svelte.ts` modules under `#lib/stores/`,
each exporting a single reactive object.

### 8.1 `palette`

| Member           | Description                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `root`           | Root `Node` (`undefined` until the palette component mounts)                                                        |
| `outputs`        | `collectOutputs(root)`, updated synchronously                                                                       |
| `settledOutputs` | Copy of `outputs`, updated after `10 + clamp(400 − ms since last update, 0–400) / 2` ms (10–210 ms)                 |
| `storedPairs`    | Declared pairs as set, `{fg: string, bg: string, wcag2?, apca?, difference?}` (`ColorPair`, color ids), set on load |
| `pairs`          | `storedPairs` whose two colors are still in the tree (hidden and generated ones included)                           |
| `unsavedPairs`   | `{pair, names}` for the pairs a permalink cannot hold (see below)                                                   |
| `permalink`      | `permalink(serializeTree(root, pairs), window.location.origin)` (§10.1)                                             |
| `colors`         | `PaletteColor`s `{id, name, color, rgbColor}` from `settledOutputs`, in tree order                                  |
| `rootColor`      | Root's color in `settledOutputs`, else the first output, else `#feffff`                                             |

`setPair(fg, bg, targets)` declares or replaces a pair, or
removes it when it has no target.

**Pairs hold color ids, never names.** `ColorPair` has no name
field, so a pair cannot go out of sync with its colors: a rename
(own or a parent's `On $`) changes nothing, a move keeps the same
ids, expanding a preset keeps the ids of its colors, and a
removed color takes its pairs out of `pairs`. A node's color has
the node's id, a color generated by a preset
`<preset id>.<index>` (`collectColors` lists all of them, hidden
included, with their names and visibility). Names appear only
when saving and loading, in `#lib/tree.ts`, always through
`resolvePairs` (§9.7): `serializeTree(root, pairs)` writes
`root.pairs` with `namePairs(root, pairs)`, and
`parsePairs(tree, root)` turns the saved names into ids. A hidden
color keeps its pairs (they are shown as hidden, not checked).
Saving needs unique names: a pair with a name shared by several
colors (hidden ones included) is in `unsavedPairs`, with the
names to rename, and left out of the permalink until then; no
other pair is dropped. On load, a pair that does not resolve is
dropped and logged (`console.error`), the rest of the palette
opens. A round-trip test (serialize, pack, unpack, parse) after
renames, parent renames, moves, removals and hides checks that
every saveable pair comes back on the same colors.

The debounce keeps single edits snappy while throttling the
expensive combination computations during slider drags.

### 8.2 `combinations`

| Member                        | Description                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colorFilters`                | Node ids to restrict backgrounds to (empty = all)                                                                                                                                                                                     |
| `contrastType`                | `'wcag2'` (default) or `'wcag3'` (APCA); changing it converts `minLevel` (§9.3)                                                                                                                                                       |
| `minLevel`                    | Minimum contrast to list, default 0                                                                                                                                                                                                   |
| `blindnessTypes`              | Simulations to compute: `protanomaly`, `deuteranomaly`, `tritanomaly`                                                                                                                                                                 |
| `isLuminosityAnalysisEnabled` | Renders the whole app in grayscale                                                                                                                                                                                                    |
| `previewedUid`                | Combination applied to the app theme, or `null`                                                                                                                                                                                       |
| `sortedColors`                | Entries sorted by `round(h) × 10 + (10 − round(l) / 10)`, rotated to start at the root                                                                                                                                                |
| `all`                         | `combine(...)` of the filtered colors (§9.1)                                                                                                                                                                                          |
| `filtered`                    | `all` with `minLevel ≥` the selected minimum                                                                                                                                                                                          |
| `comparedColors`              | `sortedColors` restricted to the Colors filter (all when empty)                                                                                                                                                                       |
| `previewed`                   | The combination matching `previewedUid`                                                                                                                                                                                               |
| `mode`                        | `'contrast'` (default), `'difference'` or `'pairs'` (§11.5); not persisted                                                                                                                                                            |
| `minDifference`               | Minimum difference to accept in difference mode, default 10                                                                                                                                                                           |
| `differences`                 | `difference(a, b, blindnessTypes)` (§9.6) once per unordered pair of the compared colors (the Colors filter, or all), in `sortedColors` order, with `id` `<idA>-<idB>` and the entries `a`, `b`                                       |
| `openDifferenceId`            | Id of the pair shown in the matrix details, or `null`                                                                                                                                                                                 |
| `pairChecks`                  | `{id, pair, fg, bg, checks, pass, for}` (`for` being `usesOf(pair)`, §9.7) for each declared pair (`palette.pairs`, §8.1) of two visible colors, `id` `<bgId>-<fgId>`, `checks` from `checkPair` (§9.7) with the selected simulations |
| `passingPairs`                | Count of `pairChecks` that pass                                                                                                                                                                                                       |
| `hiddenPairs`                 | Declared pairs with a hidden color, left out of `pairChecks`                                                                                                                                                                          |
| `use`                         | `'body'` (default), `'large'`, `'categories'` or `'custom'`: the use that dims the grid in pairs mode (§9.7 `uses`), and nothing else; `setUse(use)` sets it, Custom starting from the last use's targets                             |
| `custom`                      | `PairTargets` of the Custom use, a missing one not checked                                                                                                                                                                            |
| `useTargets`, `useName`       | The targets of the use (`custom` for Custom), and its name                                                                                                                                                                            |
| `checkUse(fg, bg)`            | `checkPair` of the use's targets on a pair, as is and per selected simulation                                                                                                                                                         |
| `toggleUse(fg, bg, use)`      | Sets every target of a built-in use (an entry of `uses`, not the filter's) on the pair, keeping its others, or removes them if it has them all at those values                                                                        |
| `cellCount`, `passingCells`   | Ordered pairs of compared colors, and those passing `passesUse` (every target of the use met in the worst case)                                                                                                                       |
| `requirements`                | The declared pairs of `pairChecks` by use: `{id, name, checks}` for each built-in use and Custom (last) with a pair, a pair under each use it holds (`for`)                                                                           |
| `openPairIds`                 | `{fg, bg}` ids of the cell shown in the pairs details, or `null`                                                                                                                                                                      |
| `openPair`                    | `{fg, bg, check?}` for `openPairIds`, `null` once a color is no longer compared                                                                                                                                                       |
| `openDifference`              | The difference matching `openDifferenceId`, `null` once the pair no longer exists                                                                                                                                                     |

### 8.3 `features`

`isDarkScheme` (initialized from localStorage, else
`prefers-color-scheme`; persisted on every change and at startup
under `darkSchemeFeature` = `'1'` / `'0'`) and `colorInputFormat`
(last format typed in a CSS color field, default `hex`).

### 8.4 `exportSettings`

`format` (`table` | `tokens` | `css` | `sass`, default `table`),
`colorFormat` (default `hex`), `casing` (`dash` | `camel`,
default `dash`), `precision` (default 3), `prefix` (default
`''`), from `defaultExportSettings` (`#lib/core/export.ts`).

`ExportSettings` and the `ExportFormat`, `ExportCasing` and
`ExportEntry` types live in `#lib/core/export.ts`.

### 8.5 `history`

Undo and redo of the palette tree, see ADR 9. A generic `History`
class (`#lib/utils/history.svelte.ts`) holds `past` and `future`
stacks of snapshots, capped at 100 entries. A snapshot is
`{tree, pairs}`: the `serializeTree` of the root (with ids) and
the declared pairs (§8.1) by color ids, frozen by
`$state.snapshot`. Undoing rebuilds the nodes with `parseTree`,
which keeps the ids, so the ids of the pairs still point to the
same colors, so each state gets back exactly its own pairs.
`setPair` is a change like any other. What goes to `localStorage`
and to the URL is the packed palette of the snapshot, pairs
included (by names, §10).

`startHistory(root)` (`#lib/stores/history.svelte.ts`, called
when the palette mounts, after `palette.storedPairs` is set)
resets the history to the palette, syncs the URL and starts an
effect that records every change of the tree or the pairs, and
returns a function that stops it. Changes made in the same tick
form one change. A change starts a new step, unless the pairs are
unchanged and it only touches one arg of one node (`changedArg`)
and the previous change touched the same arg less than 1 s ago,
so that a slider drag is one step. A step that ends where it
started is dropped, as are identical consecutive snapshots.

| Member   | Effect                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `past`   | Snapshots to undo to                                                                                                    |
| `future` | Snapshots to redo to, cleared by any new step                                                                           |
| `undo()` | Restores the last `past` snapshot (rebuilding the `Node` tree with the same ids) and pushes the current one to `future` |
| `redo()` | The opposite                                                                                                            |

Restoring keeps node ids, so components update in place (open
panels are kept), and a restored state never merges with the
changes that follow it.

Every new state replaces the URL query with its `?preset=`
(`goto` with `replaceState`, shallow, no browser history entry)
and is stored in `localStorage` under `palette` (packed, like a
permalink), 300 ms after the last change. Loading does not store
anything, so opening a link keeps the palette stored from a
previous session, but the URL is synced right away.

### 8.6 Persistence

The palette persists through the URL and `localStorage` (§8.5),
the dark scheme through `localStorage` (§8.3). The undo history,
combination filters and export settings are not persisted. Ids
are stable in memory only: permalinks and storage don't hold
them.

## 9. Contrast and accessibility

### 9.1 Combinations

Computed by `combine` (`#lib/core/contrast.ts`), which also holds
the `Combination`, `CombinationContrast`, `SimulatedContrast` (a
contrast with its simulated `type`) and `BlindnessType` (without
`none`) types.

For each color in the filtered set (as background) and every
other color (as foreground), one combination with
`uid = <bgId>-<fgId>`. Both orders of a pair are listed. `n`
visible colors without filters give `n × (n − 1)` combinations.

Each combination holds the base contrast, one contrast per
selected simulation, and `minLevel`/`minGrade`: the lowest of
them, used for filtering.

### 9.2 Metrics and grades

| Type   | Level                | Grades                                       |
| ------ | -------------------- | -------------------------------------------- |
| WCAG 2 | Contrast ratio, 1–21 | `AAA` ≥ 7, `AA` ≥ 4.5, `AA18` ≥ 3, else `KO` |
| APCA   | `                    | Lc                                           | ` (absolute APCA lightness contrast, text = foreground) | `5` ≥ 75, `4` ≥ 60, `3` ≥ 45, `2` ≥ 30, `1` ≥ 15, else `0` |

Filter labels: WCAG 2 `AAA`, `AA`, `AA18 (large text)`, `KO`;
APCA `All` (75), `Body text` (60), `Large text` (45), `Text`
(30), `Non text` (15), `KO` (0).

### 9.3 Level equivalences

When switching metric, the selected minimum is mapped:

| WCAG 2 | APCA |
| ------ | ---- |
| 7      | 75   |
| 4.5    | 60   |
| 3      | 45   |
| 0      | 0    |

APCA 30 maps to WCAG 2 3, APCA 15 maps to 0. Unmapped values are
kept as is.

### 9.4 Color vision deficiency simulation

The Machado et al. matrices at full severity, applied in linear
RGB to both colors of a pair. Results are clamped to the sRGB
gamut, since out-of-gamut values would make APCA return 0 (issue
#46).

### 9.5 Luminosity analysis

A CSS grayscale filter on the whole layout, to compare lightness
by eye.

### 9.6 Color difference

`difference(a, b, blindnessTypes)` (`#lib/core/difference.ts`)
returns the CIEDE2000 difference between two colors (`level`,
0–100), the same for each simulation applied to both colors
(`simulated`, in order), and `minLevel`, the lowest of them. It
is symmetric and not part of `combine`.

Reference values (rules of thumb, not built into the CLI): about
1 is the just-noticeable difference, varying with hue and
saturation
([Wikipedia](https://en.wikipedia.org/wiki/Color_difference)); at
least 10 between any two colors of a categorical palette (Lu et
al., "Palettailor", IEEE VIS 2020,
[arXiv:2009.02969](https://arxiv.org/abs/2009.02969)); smaller
marks need more, points more than bars or lines (Szafir,
"Modeling Color Difference for Visualization Design", IEEE TVCG
2018, doi:10.1109/TVCG.2017.2744359).

### 9.7 Declared pairs

The root of a tree (`NodeData.pairs`, `#lib/core/nodes.ts`) may
declare the pairs that must work together:
`{fg, bg, wcag2?, apca?, difference?}`, the names of two colors
and at least one target (free numbers, no defaults). Pairs are
ordered, `fg` on `bg` (APCA depends on it; a difference target
does not); a tree has at most one pair per ordered couple, and
`a/b` and `b/a` are two pairs. `pairs` is accepted on the root
only.

`resolvePairs(pairs, colors)` (`#lib/core/pairs.ts`) is the only
code that maps names to colors. `colors` is every color of the
tree, hidden ones included (`evaluate(tree, true)`); it returns
`{pairs, errors}`: the resolved `{fg, bg, ...targets}` and, for
each pair that does not resolve, `{index, field?, message}` for
an unknown name (`unknown color "x"`), a name shared by several
colors (`"x" names 2 colors, give them distinct tokens`), a color
paired with itself (`a color is never combined with itself`), no
target, or a pair declared twice. Callers decide what an error
means: the CLI fails (§14), the app drops the pair (§10.1).

`checkPair(targets, fg, bg, blindnessTypes)` measures each target
of a pair as is and under each simulation (`level`, `simulated`,
`minLevel`, the lowest) and tells whether `minLevel` reaches the
target (`pass`).

`uses` are the named sets of targets a pair can be checked for,
as data: **Body text** (`wcag2` 4.5, `apca` 75), **Large text and
UI** (`wcag2` 3), **Categories** (`difference` 10). The grid adds
a Custom one (§11.5).

A pair's uses are inferred, nothing is stored: `usesOf(pair)`
returns `{uses, custom}`, the built-in uses whose targets the
pair holds at those values (`holdsUse(pair, use)`), and whether
targets are left over, which are Custom.

#### Roles and rules (ADR 16)

The root also holds `roles`, `{name, colors}` with free,
non-empty names (a role stays until deleted, used or not; a color
can have several), and `rules`,
`{fg, bg?, use?, wcag2?, apca?, difference?}`: the colors of role
`fg` on those of role `bg`, or a role among itself without `bg`.
Rules name roles; roles name colors (color ids in the app and in
snapshots). A rule stores the **use id** (§9.7 `uses`) and, for
Custom or to adjust a use, explicit targets which override the
use's per target (`ruleTargets(rule)`); it needs at least one
target, which `validateTree` checks along with the structure and
the use id.

`resolveRoles(roles, colors)` maps member names to colors like
`resolvePairs` (same unknown or ambiguous messages, per role
`{index, message}`; a role named twice is left out).

`expandRules(roles, rules, oneOff)` is the only place where rules
become pairs. It takes resolved roles and the resolved one-off
pairs (`T` is the color, an id in the app) and returns
`{pairs, errors}`: each color of `fg` on each one of `bg`, never
on itself; a role among itself gives each couple once, in role
order (`bg` equal to `fg` means the same). Rules on a couple
combine with the highest goal of each target. A one-off pair on a
couple replaces what rules give it (for a role among itself, in
either order). Each pair has `sources: {rules, oneOff}`: the
**indexes** in `rules` of the rules it comes from (so a rule has
no id; editing rules keeps indexes in sync), or `oneOff: true`
with no rules when a declared pair replaced them. Order: rules'
couples by rule, one-off pairs replacing in place, others last.
`errors` are `{index, field?, message}` for unknown roles (`fg`
or `bg`), an unknown use, or no target; the rule is left out. An
unknown role is an error here, not in `validateTree`, so that the
app stays lenient like for pairs.

## 10. Permalinks

### 10.1 Flow

- `permalink(tree, origin)`, with `tree` a `NodeData`
  (`serializeTree(root)` for a store node), =
  `<origin>?preset=<encodeURI(pack(tree))>`, with `&`, `#` and
  `+` also percent-encoded so they survive the query string.
  `palette.permalink` is the store's shortcut, using
  `window.location.origin`.
- The address bar always holds the permalink of the palette, as
  it is updated on every change (§8.5).
- **Share** copies the permalink to the clipboard and shows "Link
  copied" (or a hint to copy it from the address bar if the
  clipboard is unavailable) for 2 seconds.
- On load, `loadPalette()` unpacks `?preset=`, which validates
  the tree with `validateTree` (§5.3), else the palette stored in
  `localStorage` (leniently: a pair that does not resolve is
  dropped and logged, the palette is kept, §8.1). If both are
  missing or invalid (errors are logged), the tree is a single
  Custom color node with a random usable color.
- Exports embed the permalink (CSS/Sass comment, design tokens
  description).

### 10.2 Format (`#lib/packing/`)

```
<version>@<payload>
```

Permalinks are generated with version `2`. Version `1` is still
read, so older links (including the ones embedded in exports)
keep working, with no pairs; a format change adds a version. The
payload of version `1`, which version `2` extends, is:

```
<root>@<nodes>@<dictionary>
```

Version `2` adds the pairs, roles and rules (§9.7) after the
nodes, and writes colors differently (see values):

```
<root>@<nodes>@<pairs>@<roles>@<rules>@<dictionary>
```

| Part         | Content                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionary` | Comma-separated strings, in order of first use: type codes, tokens, param names, colors (v2: also pair names, targets and values). `%`, `,` and `@` are escaped as `%25`, `%2C` and `%40` |
| `pairs`      | v2 only: comma-separated pair records, empty without pairs                                                                                                                                |
| `roles`      | v2 only: records of dictionary indexes, the role name then its color names                                                                                                                |
| `rules`      | v2 only: records of the indexes of `fg`, `bg` and `use` (the empty string for none), then (target name, value) indexes as in pairs                                                        |
| `nodes`      | Comma-separated node records, children before their parent (post-order)                                                                                                                   |
| `root`       | Index of the root record in `nodes`, in hexadecimal                                                                                                                                       |

A node record is an optional `!` (hidden) followed by numbers,
each written in hexadecimal: 1 digit as is, 2 digits prefixed
with `x`, 3 digits prefixed with `y`. The numbers are, in order:

1. dictionary index of the type code,
2. dictionary index of the token (`''` when empty),
3. count `N` of argument numbers (twice the number of params),
4. `N / 2` pairs of (dictionary index of the param name, value),
5. record indices of the children.

Values: booleans `0`/`1`, ranges as is, colors as a dictionary
index. The dictionary entry of a color is:

| Version | Color entry                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| `1`     | 6-digit hex code without `#`, which rounds the color (lossy)                    |
| `2`     | `h_s_l` of the `SchemistColor`, as full precision JavaScript numbers (lossless) |

Version `2` rejects color entries that are not exactly three
finite numbers. Whatever the version, `unpack` returns the tree
checked by `validateTree` (§5.3), which accepts colors given as
`{h, s, l}` objects for this purpose (the CLI only documents CSS
strings), within the ranges of §4.1 with a 0.001 tolerance for
conversion noise: an out-of-range color fails the link.

A pair record is written the same way: the dictionary indexes of
the `fg` and `bg` names, then for each target (`wcag2`, `apca`,
`difference`) the dictionary indexes of its name and of its value
as text (`4.5`). Names are the colors' names (mostly tokens,
already in the dictionary). Packing is structural: it does not
evaluate colors, and a target that is unknown or not a number is
ignored on unpacking; `resolvePairs` checks the names when the
palette loads (§10.1).

Examples, a Custom color alone: `1@0@01223@clr,,color,ffc208`,
`2@0@01223@@clr,,color,90_50_50`.

The rationale for keeping this custom format rather than
compressing links is recorded in
`docs/adr/0010-url-packing-compression.md`.

## 11. User interface

### 11.1 Layout

- Header: app name and baseline, **Dark/Light theme** toggle,
  link to the GitHub repository.
- Notification area: shows the previewed combination (§11.5).
- Two sections: **Palette** (tree, Export, Share, Undo and Redo
  buttons) and **Combinations (filtered / total)**; in difference
  mode the count is (pairs at or above the minimum difference /
  pairs compared).
- Shortcuts: `Ctrl`/`Cmd` + `Z` undoes, `Ctrl`/`Cmd` + `Shift` +
  `Z` redoes, except while editing text (text inputs, textareas,
  the editable node name), where native undo applies. Undo and
  Redo are disabled when their stack is empty.

### 11.2 Palette tree

Each node shows its color (a preset shows a bar of its generated
colors, top to bottom) and name, then actions:

| Action     | Tooltip                                      | Effect                                                                                          |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Remove     | Remove this color and all of its derivatives | Not available on the root                                                                       |
| Visibility | Don't compare this color                     | Toggles `isHidden`                                                                              |
| Info       | Show color info                              | Popover with the Hex, RGB, HSL and LCH values; name and hex of each generated color for presets |
| Options    | Tune this color                              | Popover with the parameter fields                                                               |
| Expand     | Turn into separate colors                    | Presets only, replaces them with plain nodes (§7)                                               |
| Swap       | Change this color's type                     | Opens the child picker to replace the type; not on the root, replaced by Expand on presets      |
| Add        | Add matching colors                          | Opens the child picker; disabled on presets                                                     |

- Info and Options open popovers (the native `popover` attribute,
  toggled by `popovertarget` buttons, which close on outside
  click or Escape), positioned below their button where CSS
  anchor positioning is supported. Neither is open by default.
- The name is editable in place (Enter or blur commits). The hint
  reads "Insert parent color name with $." on child nodes.
- A root without children shows a "Start by adding matching
  colors" call to action.
- Range fields show a gradient previewing the parameter's effect
  (none for presets). Boolean fields are toggle buttons.

### 11.3 Color field

Tabs **RGB**, **HSL**, **LCH** (sliders) and **CSS** (text
input), plus **Randomize** (`randomUsableColor`).

The CSS input applies valid colors as they are typed, without
rewriting the text. On commit (blur or Enter), invalid text shows
a validity message; valid text is rewritten in the format it was
typed in.

### 11.4 Child picker

A modal with two lists, each item previewed on the current color:
**Color palettes** (presets, §7, added as a single node) and
**Single colors** (node types, in `defList` order, §6).

When changing a color's type, the modal is titled "Change color
type" and only lists single colors, previewed on the parent's
color (the node's input). The current type is marked with a check
and `aria-current`. Picking a type calls `setType`, in one
change.

### 11.5 Combinations panel

- A **Contrast | Difference | Grid** switch (`mode`, value
  `'pairs'`). Difference and Pairs modes are described below the
  contrast one.
- Filters, shown with at least two colors: **Colors** (background
  restriction, with Reset), **Contrast type**, **Minimum contrast
  level**, **Color blindness simulation**, **Luminosity
  analysis**.
- Each combination card is drawn in its own colors, with names,
  grade and level (rounded to 1 decimal, prefixed by `APCA` in
  APCA mode), and one row per simulation.
- The **preview** button themes the whole app with the pair; the
  notification names it and has a stop button.
- Difference mode hides **Contrast type** and swaps **Minimum
  contrast level** for **Minimum difference** (number field). The
  cards give way to a lower-triangle matrix with a row and a
  column per compared color. Row and column headers show the
  swatch only, the name being a tooltip and the accessible name;
  row headers stay sticky on the left. Each cell is a fixed-width
  button with `minLevel` rounded to a whole number in the panel's
  text color (the label keeps 1 decimal); cells below the minimum
  get a dashed outline and a warning icon in place of the number.
  Activating a cell shows, in a card under the matrix, a row for
  normal vision and one per simulation (the two simulated colors
  and the level); the panel closes it when the pair no longer
  exists. The matrix scrolls horizontally when wider than the
  panel. With fewer than two compared colors the panel asks to
  select at least two.

**Grid mode** (`'pairs'`) shows the pairs declared in the palette
(§9.7), built on the difference matrix pieces (`matrix.css`,
shared with it; the panel is a single root element, as the global
`.data-layout` grid needs): a full grid, backgrounds as rows and
foregrounds as columns, of compact cells, with swatch-only
headers (name as tooltip and accessible name) and sticky row
headers. The grid takes at least the panel's width, its cells
stretching from 2rem, and scrolls when the colors do not fit.
Nothing is drawn on the diagonal. Every other cell is drawn as
its pair: "Aa" in the foreground on the background and, when
simulations are selected, under it one aria-hidden strip per
simulation, side by side, each the simulated background with a
bar in the simulated foreground (cells then are 2.75rem high).
The tooltip has the names and the WCAG 2 contrast, then each
target of the use per simulation and, for a declared pair, its
uses (`, for Body text`), which the accessible name repeats. A
declared cell gets a border in the panel's text color and a
corner badge in the panel's colors: a check, or a warning icon
with a dashed border when the pair misses one of its targets in
the worst case of the selected simulations. Marks are in the
panel's colors so they stay readable on any pair, and on the
border so that the outline stays the focus ring. Each button's
accessible name says whether the pair meets its targets, misses
them, or is not declared. The filters set what cells are checked
against, and only dim: **Check** picks a use (§9.7), or
**Custom**, which shows a minimum field per metric (WCAG 2, APCA,
difference; empty is not checked) and starts from the targets of
the use picked last. The **Contrast type**, **Minimum contrast
level** and **Minimum difference** filters are not shown in this
mode. A cell whose pair misses a target of the use, in the worst
case of the selected simulations, has its colors dimmed (not its
marks), and its accessible name says whether it reaches the
minimum. Activating a cell (a button, so keyboard accessible)
only opens its card, or closes it when it is open already. The
`elevated` card, a labelled region (`<section>`) docked in a
column beside the grid (the grid scrolling on its own, the column
sticky at the top), or under the grid when the panel is narrower
than 48rem (container query). With no pair open the column is the
requirements list (below); with one, the card. The card has: a
large sample with both names in the foreground on the background;
each target of the use (grade and level, or difference) for
normal vision and each simulation, each row in its simulated
colors with an icon and a text alternative for met or not met;
the uses the pair is for (`usesOf`) or "Not declared"; one button
per built-in use, **+ Body text** (accessible name "Require Body
text") or **Body text ✓** ("Remove Body text") when the pair
holds its targets, calling `toggleUse` (sets every target of the
use, replacing a target of another value); the filter plays no
part; one number field per target (a value is applied on change,
clearing every field removes the pair); for each declared target
the measured levels; **Remove pair**; a **Preview** button
toggling `previewedUid` to `<bgId>-<fgId>` (§11.5); and
**Close**. The panel closes the card when a color is no longer
compared. The requirements list is a labelled region titled
**Requirements**: the declared pairs by use (`requirements`,
Custom last, a pair under each use it holds), each a button with
both swatches and names (foreground on background) and an icon
with a text alternative for met or not met in the worst case of
the selected simulations; activating one sets `openPairIds`, and
**Close** comes back to the list. Pairs with a hidden color
follow as **Not checked, a color is hidden**. With no declared
pair, a hint says to open a cell and pick a use. Opening the card
leaves the focus on the cell, so that the next cell is one key
away; Esc (from anywhere), **Close** or the open cell close it. A
notice names the colors to rename when pairs cannot be saved
(§8.1). The heading counts cells meeting the use / cells
(`passingCells`, `cellCount`); the hint gives the declared count.
**Colors** restricts the grid's rows and columns, **Color
blindness simulation** and **Luminosity analysis** work as in the
other modes.

### 11.6 Theming

`GlobalStyle` injects `:root` CSS variables (`--bg`, `--bg-soft`,
`--bg-hard`, `--bg-neutral`, `--bg-overlay`, `--fg`,
`--fg-light`) derived from the previewed combination if any, else
from the root color (light: background `l` 98, text `l` 15; dark:
12 and 95).

### 11.7 Favicon

A 16 px canvas recolors `static/img/favicon-template.png` (pixels
with a red channel of 0, 128 and 255) with Lightness 20, 70 and
85 of the root color, debounced by 500 ms.

### 11.8 Export modal

| Option       | Shown for           | Values                          |
| ------------ | ------------------- | ------------------------------- |
| Format       | always              | Table, Design tokens, CSS, Sass |
| Color format | all but tokens      | Hex, RGB, HSL, LCH              |
| Casing       | CSS, Sass           | dash-case, camelCase            |
| Prefix       | CSS, Sass           | Free text, prepended to names   |
| Precision    | HSL/LCH, not tokens | Decimals                        |

Outputs (visible colors, tree order). The formatting lives in
`#lib/core/export.ts` (`toExportEntries`, `exportVariables`,
`exportTokens`); the components only wire it to the stores:

- **Table**: swatch, name, value.
- **Design tokens**: JSON
  `{"Colors": {"$description": "Build with Schemist (<permalink>)", "<name>": {"$type": "color", "$value": "#rrggbb"}}}`,
  always hex. Names are split on runs of `/` and `.` (empty parts
  dropped, spaces kept) and nested as groups along that path:
  `button/primary/bg` gives `Colors.button.primary.bg`; a name
  without separators stays a direct key of `Colors`. No color is
  dropped: a path used by several colors gets ` (2)`, ` (3)`...
  on its last part, in tree order; a token that is also a group
  (`button/primary` next to `button/primary/bg`) stays flat under
  `Colors` with its full name as key; a name with a part starting
  with `$` (which would read as a DTCG property) stays flat too,
  with the leading `$` of each part stripped. A flat key already
  taken gets ` (2)`... as well. `exportTokens` returns
  `{json, conflicts}`, `conflicts` being the names involved, in
  tree order. When there are some, the tokens export shows a
  one-line notice above the code (`.hint`, linked to the code by
  `aria-describedby`) listing them in quotes; no notice otherwise
  or for other formats.
- **CSS**: `/* @see <permalink> */` then `--<name>: <value>;`
  lines.
- **Sass**: same with `$<name>: <value>;`.

Variable names are split on runs of spaces, slashes and dots (so
`button/primary/bg` gives `button-primary-bg`), stripped of every
character but `a-z A-Z 0-9 _ -`, then joined in the chosen
casing.

## 12. Testing

Unit tests cover utils, color parsing, color deficiency
simulation, the highlight temperature, packing (snapshots of
every node type, round trips, lossless colors and backward
compatibility), permalinks (tokens with special characters), tree
serialization (ids), the undo history and the initial palette
source (link, storage, random). Characterization snapshots cover
the outputs (hex values and names) of every preset under a few
root colors, `combinations.all` (WCAG 2 and APCA, with and
without simulations) and the CSS, Sass and design tokens exports.
Declared pairs have unit tests of the resolver and of the checks
(`core/pairs.test.ts`), of the packing (`packing/v2.test.ts`), of
tree validation and `eval` (CLI tests), of the store round trip
(serialize, pack, unpack, parse after renames, moves, removals,
hides and duplicate names; `presets.test.ts`), of their undo and
redo and of swapping (`stores/history.test.ts`), and a
server-side render of the Pairs panel. Unit tests of
`exportTokens` cover nesting, empty parts, `$` parts, conflicts
and duplicates (with no color dropped, whatever the tree order);
`names.test.ts` renders the tokens export and its conflict
notice. Export components are rendered server-side; there are no
browser or end-to-end tests. A core test asserts that `evaluate`
matches `collectOutputs` for every preset, and store tests cover
preset outputs, children and expanding. CLI tests cover tree
validation and argument handling, and build the CLI to run it
under plain Node (it crashes on runes if a store leaks into
`core/`), comparing `eval` with the core and checking that an
invalid tree, or conflicting token names, fails with its message.
The eval harness (§15) is tested on small recorded transcripts
and trees under `evals/fixtures/`, with the core standing in for
the CLI: no model is called. CI runs the unit tests and `check`
(not `lint` or `build`).

## 13. Known issues and limits

- **Packed numbers above `0xfff`** (4096) cannot be encoded,
  which caps the dictionary size and the node count per tree.
- **`#lib` bare import** points to `src/lib/index.js`, which does
  not exist (only `#lib/*` is used).
- **Alpha** is dropped by permalinks and design tokens.

## 14. Command-line interface

`src/cli/`, repo-local (not published), built by
`vite.cli.config.js` (no SvelteKit plugin, `build.ssr`, all
dependencies bundled) into the git-ignored
`build-cli/schemist.js`. `npm run cli:build` builds it,
`npm run cli -- <command>` runs it under Node. It only uses
`#lib/core/` and the definitions, so it runs without Svelte.
Output is JSON on stdout (`export` prints the text as is); errors
go to stderr as `error: <message>` with exit code 1. Arguments
are parsed with `node:util` `parseArgs`.

| Command                            | Output                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `types`                            | Node types: `type`, `label`, `description`, `params` (`name`, `kind`, `min`, `max`, `unit`, `default`; color defaults as hex) |
| `presets`                          | Presets: `type`, `label`, `description`, `params`, `nodes` (what they generate with their default params, color args as hex)  |
| `eval <tree.json\|->`              | `{colors: [{name, hex}], combinations: [{bg, fg, level, grade, simulated: [{type, level, grade}]}], permalink}`               |
| `export <tree.json\|-> --format F` | CSS, Sass or design tokens text, as the app produces it                                                                       |

`eval` options: `--contrast wcag2|apca` (default `wcag2`; `apca`
is the internal `wcag3`), `--blindness` (comma list of
`protanomaly`, `deuteranomaly`, `tritanomaly`), `--min <level>`
(default 0, keeps combinations whose exact `minLevel` is at least
that), `--pair 'fg/bg'` (repeatable: keeps only those
combinations, in the order given, after `--min`; `\/` and `\\`
escape a `/` or `\` in a name; a value without exactly one
unescaped `/`, with a name not in the palette, with a name shared
by several colors, or with the same name on both sides is
rejected naming it, through the resolver, §9.7, which also knows
hidden colors: combinations are then computed over all colors,
hidden ones included). Levels (`level`, simulated `level`,
`minLevel`) are truncated to 2 decimals, never rounded up past a
threshold (4.496 stays 4.49, not the 4.5 AA). With `--blindness`,
each combination also has `minLevel` and `minGrade` (worst of
base and simulated); without it they are omitted. Combinations
are computed over all visible colors. `--difference` adds
`difference: {level, minLevel, simulated: [{type, level}]}` to
each combination (§9.6; `minLevel` only with `--blindness`,
levels truncated like the others; it never filters, `--min` still
applies to contrast). `export` options:
`--format css|sass|tokens` (required), `--color-format`,
`--casing`, `--prefix`, `--precision`, defaulting to
`defaultExportSettings` (`#lib/core/export.ts`). `--origin`
(default `https://schemist.fglt.fr`) sets the permalink origin.

Input is a `NodeData` JSON tree (file path, or `-` for stdin),
validated by `validateTree` (`src/lib/core/tree.ts`, which also
validates unpacked permalinks): unknown keys, node types and
params, non-integers or integers outside `min`–`max` for ranges,
and non-booleans are rejected; missing args take the type's
defaults; color params are CSS color strings converted with
`parseColor`, invalid ones rejected. Errors name the node path
and the param, e.g.
`root.children[2].args.amount: expected an integer between 0 and 100`.
Usage text is printed only for command line errors.

The root may have `pairs` (§9.7; an unknown key anywhere else):
objects with strings `fg` and `bg` and numbers `wcag2`, `apca`,
`difference`, checked by the same validation, then resolved with
every color of the tree, hidden ones included. A pair that does
not resolve fails the tree, with its path:
`root.pairs[2].fg: unknown color "text/bdy"`. Without `--pair`,
`eval` adds `pairs: [{fg, bg, targets, levels, pass}]` for the
declared pairs: `targets` as declared, `levels` the worst level
of each target (base and `--blindness` simulations, truncated
like the others) and `pass` whether every target is reached on
its exact level. Each target is measured on its own, whatever
`--contrast`. A pair with a hidden color is not checked, as in
the app (hidden colors are not exported): it comes as
`{fg, bg, targets, hidden: true}`. With `--pair`, the declared
pairs are replaced by the given ones for that run and `pairs` is
omitted; a repeated `--pair` counts once.

`export --format tokens` nests names split on `/` and `.`
(§11.8). When `exportTokens` reports conflicts, it fails like a
tree error (no usage text, exit code 1, nothing on stdout):
`tokens: conflicting names "button/primary", "brand": a name is both a token and a group, repeated, or has a part starting with $; rename them or give them distinct tokens`.

## 15. Agent evals

`evals/` checks that agents can generate and check color schemes
with the CLI (§14), by running headless `claude -p` on prompts
and grading what comes out. It is TypeScript run directly by Node
and covered by `npm run check`; ADR 4 has the reasoning, and
`evals/README.md` how to run it, what it costs and the latest
baseline.

```
evals/
  run.ts, grade.ts, eval.ts  Runner, grader, both in a row
  graders/                   One file per grader type
  cases/<name>/              prompt.md, expect.json, graders/*.md
  fixtures/                  Recorded runs for the tests
  results/                   Git-ignored: transcripts, out/, report.md
```

**A round.**
`npm run eval -- [--case] [--runs] [-j] [--ref] [--model] [--max-cost]`
resolves the ref to a commit and, for each run, extracts it
without `evals/` into a fresh one-commit repository, so the
graders are in neither its files nor its history. It runs
`claude -p` there with the prompt on stdin,
`--permission-mode auto`, and the user's login but none of their
configuration (`--setting-sources project`,
`--strict-mcp-config`, auto memory disabled), and saves
`transcript.jsonl`, `final.md`, `meta.json` (cost, turns,
duration, model, ref, status) and a copy of the agent's `out/`. A
run that fails or times out is recorded, not fatal. The grader
then builds the CLI once from the same commit in its own clone,
apart from the runs, so that a run cannot change its own grade,
and writes `report.md`.

**Graders** are Markdown files with front matter (`type`,
`weight` default 1, type settings, validated when the case is
loaded) and a description as body:

- `tool_used`: the agent called a tool (or one of several) a
  number of times, with an input matching a regular expression.
- `regex`: a pattern is found, or absent, in the transcript or in
  a file of the run.
- `file_exists`: at least `min` files match a glob.
- `check`: re-checks the trees of the case's `expect.json` with
  the built CLI: every tree valid, every pair at its WCAG 2 and
  APCA targets in the worst case of the three color blindness
  simulations, every expected hex in some tree.

A run scores the weighted fraction of its graders passed, a case
the mean of its runs. The report has a table of graders by run,
costs, turns, durations, models and the failed pairs.

**Cases.** `smoke` (a canary: build the CLI and write `types` to
a file), `website` (a light and dark scheme from one color) and
`dashboard` (a rebrand with brand colors, AAA text, states,
status colors and a color blind safe chart palette). Prompts end
with an output contract (file paths and token names) so that the
graders know where to look.

Evals call the model on the user's account: they are run by hand
after changing the CLI, its errors or its docs, and before
releases, never in `npm test` nor CI.
