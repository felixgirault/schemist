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
                           export.ts (export formatters and defaults, §11.8)
    definitions/           `defs`: every node type, presets included
      nodes/               Node types (§6)
      presets/             Presets (§7)
    stores/                Reactive state, `.svelte.ts` modules (§8)
    packing/               Permalink encoding (§10)
    components/            UI (§11)
    utils/                 Generic helpers (arrays, css, math, strings, …)
    tree.ts                parseTree / serializeTree (tree ⇄ NodeData)
    palette.ts             getRootNode (initial tree from URL or random)
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

`NodeData = {type, token?, args?, children?, isHidden?}`
(`#lib/core/nodes.ts`) is the plain form of a tree, used by
presets, permalinks and the CLI, with `type` a `NodeType` (§6).
`parseTree(NodeData) → Node` merges given `args` over the type
defaults; `serializeTree(Node) → NodeData` omits empty tokens,
args and children.

`validateTree(data, path)` (`#lib/core/tree.ts`) checks data from
outside and returns a `NodeData`: unknown keys, node types and
params, and invalid values are rejected naming their path. Color
args are CSS strings, converted to colors. The CLI (§14)
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

| Member           | Description                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `root`           | Root `Node` (`undefined` until the palette component mounts)                                        |
| `outputs`        | `collectOutputs(root)`, updated synchronously                                                       |
| `settledOutputs` | Copy of `outputs`, updated after `10 + clamp(400 − ms since last update, 0–400) / 2` ms (10–210 ms) |
| `permalink`      | `permalink(serializeTree(root), window.location.origin)` (§10.1)                                    |
| `colors`         | `PaletteColor`s `{id, name, color, rgbColor}` from `settledOutputs`, in tree order                  |
| `rootColor`      | Root's color in `settledOutputs`, else the first output, else `#feffff`                             |

The debounce keeps single edits snappy while throttling the
expensive combination computations during slider drags.

### 8.2 `combinations`

| Member                        | Description                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `colorFilters`                | Node ids to restrict backgrounds to (empty = all)                                      |
| `contrastType`                | `'wcag2'` (default) or `'wcag3'` (APCA); changing it converts `minLevel` (§9.3)        |
| `minLevel`                    | Minimum contrast to list, default 0                                                    |
| `blindnessTypes`              | Simulations to compute: `protanomaly`, `deuteranomaly`, `tritanomaly`                  |
| `isLuminosityAnalysisEnabled` | Renders the whole app in grayscale                                                     |
| `previewedUid`                | Combination applied to the app theme, or `null`                                        |
| `sortedColors`                | Entries sorted by `round(h) × 10 + (10 − round(l) / 10)`, rotated to start at the root |
| `all`                         | `combine(...)` of the filtered colors (§9.1)                                           |
| `filtered`                    | `all` with `minLevel ≥` the selected minimum                                           |
| `previewed`                   | The combination matching `previewedUid`                                                |

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

None of this state is persisted except the dark scheme.

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

## 10. Permalinks

### 10.1 Flow

- `permalink(tree, origin)`, with `tree` a `NodeData`
  (`serializeTree(root)` for a store node), =
  `<origin>?preset=<encodeURI(pack(tree))>`, with `&`, `#` and
  `+` also percent-encoded so they survive the query string.
  `palette.permalink` is the store's shortcut, using
  `window.location.origin`.
- **Share** navigates to that URL (the address bar then holds the
  link; nothing is copied to the clipboard).
- On load, `getRootNode()` unpacks `?preset=`, which validates
  the tree with `validateTree` (§5.3). If it is missing or
  invalid (the error is logged), the tree is a single Custom
  color node with a random usable color.
- Exports embed the permalink (CSS/Sass comment, design tokens
  description).

### 10.2 Format (`#lib/packing/`)

```
<version>@<payload>
```

Only version `1` exists. Its payload:

```
<root>@<nodes>@<dictionary>
```

| Part         | Content                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionary` | Comma-separated strings, in order of first use: type codes, tokens, param names, colors. `%`, `,` and `@` are escaped as `%25`, `%2C` and `%40` |
| `nodes`      | Comma-separated node records, children before their parent (post-order)                                                                         |
| `root`       | Index of the root record in `nodes`, in hexadecimal                                                                                             |

A node record is an optional `!` (hidden) followed by numbers,
each written in hexadecimal: 1 digit as is, 2 digits prefixed
with `x`, 3 digits prefixed with `y`. The numbers are, in order:

1. dictionary index of the type code,
2. dictionary index of the token (`''` when empty),
3. count `N` of argument numbers (twice the number of params),
4. `N / 2` pairs of (dictionary index of the param name, value),
5. record indices of the children.

Values: booleans `0`/`1`, ranges as is, colors as the dictionary
index of their 6-digit hex code (without `#`).

Example, a Custom color `#ffc208` alone:
`1@0@01223@clr,,color,ffc208`.

## 11. User interface

### 11.1 Layout

- Header: app name and baseline, **Dark/Light theme** toggle,
  link to the GitHub repository.
- Notification area: shows the previewed combination (§11.5).
- Two sections: **Palette** (tree, Export and Share buttons) and
  **Combinations (filtered / total)**.

### 11.2 Palette tree

Each node shows its color (a preset shows a bar of its generated
colors, top to bottom) and name, then actions:

| Action     | Tooltip                                      | Effect                                                                                     |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Remove     | Remove this color and all of its derivatives | Not available on the root                                                                  |
| Visibility | Don't compare this color                     | Toggles `isHidden`                                                                         |
| Info       | Show color info                              | Hex, RGB, HSL and LCH values; name and hex of each generated color for presets             |
| Options    | Tune this color                              | Parameter fields; open by default on the root only                                         |
| Expand     | Turn into separate colors                    | Presets only, replaces them with plain nodes (§7)                                          |
| Swap       | Change this color's type                     | Opens the child picker to replace the type; not on the root, replaced by Expand on presets |
| Add        | Add matching colors                          | Opens the child picker; disabled on presets                                                |

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

- Filters, shown with at least two colors: **Colors** (background
  restriction, with Reset), **Contrast type**, **Minimum contrast
  level**, **Color blindness simulation**, **Luminosity
  analysis**.
- Each combination card is drawn in its own colors, with names,
  grade and level (rounded to 1 decimal, prefixed by `APCA` in
  APCA mode), and one row per simulation.
- The **preview** button themes the whole app with the pair; the
  notification names it and has a stop button.

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
every node type and preset, and round trips) and permalinks
(tokens with special characters). Characterization snapshots
cover the outputs (hex values and names) of every preset under a
few root colors, `combinations.all` (WCAG 2 and APCA, with and
without simulations) and the CSS, Sass and design tokens exports.
Unit tests of `exportTokens` cover nesting, empty parts, `$`
parts, conflicts and duplicates (with no color dropped, whatever
the tree order); `names.test.ts` renders the tokens export and
its conflict notice. Export components are rendered server-side;
there are no browser or end-to-end tests. A core test asserts
that `evaluate` matches `collectOutputs` for every preset, and
store tests cover preset outputs, children and expanding. CLI
tests cover tree validation and argument handling, and build the
CLI to run it under plain Node (it crashes on runes if a store
leaks into `core/`), comparing `eval` with the core and checking
that an invalid tree, or conflicting token names, fails with its
message. The eval harness (§15) is tested on small recorded
transcripts and trees under `evals/fixtures/`, with the core
standing in for the CLI: no model is called. CI runs the unit
tests and `check` (not `lint` or `build`).

## 13. Known issues and limits

- **Lossy permalinks**: colors are packed as hex, so derived
  colors of a reopened palette can differ by one unit on some
  channels. A lossless `v2` format exists on the
  `adr-url-compression` branch (see its ADR on permalink
  compression, issue #53).
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
rejected naming it). Levels (`level`, simulated `level`,
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
