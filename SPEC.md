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

| Concern     | Choice                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| Framework   | SvelteKit 3, Svelte 5 (runes everywhere, no `svelte/store`)                       |
| Build       | Vite 8, `@sveltejs/adapter-static`, every route prerendered                       |
| Language    | TypeScript 6                                                                      |
| Color math  | `culori` (tree-shaken `culori/fn` build)                                          |
| Contrast    | `culori` `wcagContrast` (WCAG 2), `apca-w3` (APCA)                                |
| Color names | `color-name-list` (`bestof` list) + `nearest-color`                               |
| Dialogs     | `svelte-accessible-dialog`                                                        |
| Tests       | Vitest 5 (`src/**/*.{test,spec}.{js,ts}`)                                         |
| Formatting  | oxfmt (`.oxfmtrc.json`: tabs, width 3, 65 columns, single quotes, sorted imports) |
| CI          | GitHub Actions, Node 24: `npm ci` then `npm test`, on `main` pushes and PRs       |

Scripts:

| Script           | Effect                                     |
| ---------------- | ------------------------------------------ |
| `npm start`      | Dev server                                 |
| `npm run build`  | Static build into `build/`                 |
| `npm run check`  | `svelte-kit sync` + `svelte-check` (types) |
| `npm test`       | Unit tests                                 |
| `npm run lint`   | `oxfmt --check`                            |
| `npm run format` | `oxfmt` (writes)                           |

Kit configuration lives in `vite.config.js`
(`sveltekit({adapter: adapter()})`); there is no
`svelte.config.js`.

## 3. Repository layout

```
src/
  app.html                 HTML shell (title, fonts.css, favicon)
  global.css               Global styles, consume theme variables (§11.6)
  routes/
    +layout.server.ts      prerender = true
    +layout.svelte         Wraps pages in Layout
    +page.svelte           The app
    screencast/+page.svelte  Same app, noindex, used to record demos
  lib/
    color/                 Color model, conversions, parsing, formatting,
                           manipulation, contrast, simulation, naming
    definitions/nodes/     Node types (§6)
    definitions/presets/   Presets (§5.4, §7)
    stores/                Reactive state, `.svelte.ts` modules (§8)
    packing/               Permalink encoding (§10)
    components/            UI (§11)
    utils/                 Generic helpers (arrays, css, math, strings, …)
    presets.ts             parseTree / serializeTree (tree ⇄ PresetNode)
    palette.ts             getRootNode (initial tree from URL, storage or random)
    routing.ts             permalink(node)
    samples.ts             Color previews for pickers and sliders
    style.ts               Theme CSS variables from a color
    features.ts            Dark scheme preference (localStorage)
static/                    Fonts, favicon, favicon template, demo GIF
docs/adr/                  Architecture decision records
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

| Field       | Kind     | Description                                                              |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `id`        | readonly | `n<uid>`, unique per session                                             |
| `def`       | raw      | Node type definition (§6), replaced by `setType`                         |
| `token`     | state    | Name template (§4.4), `''` for an automatic name                         |
| `isHidden`  | state    | Excluded from combinations and exports, still drawn in the tree          |
| `args`      | state    | Parameter values, initialized from the type's defaults                   |
| `children`  | state    | Child nodes, ordered                                                     |
| `parent`    | state    | Parent node, `undefined` for the root                                    |
| `input`     | derived  | `parent.output`, or `[white, '']` for the root                           |
| `output`    | derived  | `[def.apply(input color, args), generateName(token, color, input name)]` |
| `generated` | derived  | Colors of a preset (§5.4), `{}` for other nodes                          |

Operations: `addChild(child)` (detaches it from its previous
parent first), `removeChild(child)`, `destroy()` (removes the
node and its subtree from its parent), `setType(type)` (changes
the definition, keeping the id, token, visibility and children),
`replaceWith(nodes)` (puts nodes in place of this one among its
siblings).

`setType` remaps args with `remapArgs`: an arg is kept when the
new type has a param with the same name, kind and range, and
reset to the new type's default otherwise (ADR 3). Highlight ↔
Shadow and Lightness ↔ Saturation keep all their args.

### 5.2 Outputs

`collectOutputs(root)` walks the tree depth-first, parent before
children, and returns `{[id]: [color, name]}` for every
**visible** node. Children of a hidden node are still collected.
A preset is replaced by its generated colors, which are all left
out when the preset is hidden.

`evaluateTree(PresetNode[], input)` computes the same record from
a plain tree, without `Node`s. Picker previews and presets use
it.

### 5.3 Tree serialization (`#lib/presets.ts`)

`PresetNode = {id?, type, token?, args?, children?, isHidden?}`
is the plain form of a tree, used by presets, permalinks and
history snapshots. `parseTree(PresetNode) → Node` merges given
`args` over the type defaults, reuses `id` when set, and drops
the children of presets; `serializeTree(Node) → PresetNode`
includes ids and omits empty tokens, args and children.
Permalinks don't store ids.

### 5.4 Presets

A preset is a node whose colors are generated (ADR 4). Its
definition (`PresetDef`) adds `build(args) → PresetNode[]` to a
regular one, and its `apply` returns the input unchanged.

- The tree returned by `build` is evaluated on the preset's
  output. It is derived, never stored: permalinks, storage and
  history only hold the preset's type and args.
- Template nodes get ids `<preset id>.<index>`, depth-first
  (`withIds`), which key the generated colors in outputs.
- A preset is named after its token, or after its parent when the
  token is empty, so that `$` in the tokens of its colors refers
  to it.
- A preset has no children.
- A template can contain presets. Their colors get ids
  `<preset id>.<index>.<index>`, and so on.
- `expandPreset(preset)` replaces the preset with
  `parseTree(build(args))`, in a single change. The new nodes
  keep the ids of the generated colors, so combination filters
  carry over. `$` in their tokens is replaced by the preset's
  token if any, and they are all hidden if the preset was.
  Presets of the template become preset nodes, which can be
  expanded in turn. The root can't be expanded.

## 6. Node types

Defined in `src/lib/definitions/nodes/`, registered in `index.ts`
(`defs` by type, `defList` for display order). A definition has a
short `type` code (used in permalinks), a `label`, an optional
`description` and `argsLabel`, `params`, a `samples` style for
previews (`single`, `discrete`, `continuous`) and
`apply(color, args)`.

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

Presets (§5.4, §7) are node types too. They are registered in
`defs`, but not in `defList`:

| Type  | Label                  | Params (min–max, default)                       | Generates                                                                                                                                |
| ----- | ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `stt` | States                 | amount % 0–50 (10)                              | Highlight `$ light` and Shadow `$ dark` of `amount`                                                                                      |
| `spc` | Split complementary    | —                                               | `scl` `Left $ complementary`, `scr` `Right $ complementary`                                                                              |
| `trd` | Triad                  | —                                               | `trl` `Left $ triad`, `trr` `Right $ triad`                                                                                              |
| `ttd` | Tetrad                 | —                                               | `ttl` `Left $ tetrad`, `ttr` `Right $ tetrad`                                                                                            |
| `sem` | Semantic colors        | —                                               | `inf` Info, `pos` Success, `wrn` Warning, `neg` Error                                                                                    |
| `smp` | Semantic color pairs   | —                                               | Semantic colors, each with a Contrasting child `On $`                                                                                    |
| `lsc` | Scale                  | steps 1–10 (9)                                  | `steps` Lightness nodes of `round(100 × i / (steps + 1))`%, `i` in 1…steps, i.e. without black and white                                 |
| `ntl` | Neutral                | saturation % 0–100 (5)                          | Hidden Saturation `Desaturated $` with Lightness 98, 85, 50, 15, 2 (`Neutral white` … `Neutral black`)                                   |
| `hrm` | Harmonies              | tetrad, triad, split complementary (all `true`) | The enabled harmonies, left ones then right ones                                                                                         |
| `rnb` | Rainbow                | count 1–23 (11)                                 | `count` Hue nodes of `round(360 × i / (count + 1))`°, `i` in 1…count                                                                     |
| `mtl` | Material tones light   | —                                               | Lightness 40 `$`, 100 `On $`, 90 `$ container`, 10 `On $ container`                                                                      |
| `mtd` | Material tones dark    | —                                               | Lightness 80 `$`, 20 `On $`, 30 `$ container`, 90 `On $ container`                                                                       |
| `mnl` | Material neutral light | —                                               | Hidden Saturation 10 with Lightness 99 Surface, 10 On surface, 90 Surface variant, 30 On surface variant, 50 Outline                     |
| `mnd` | Material neutral dark  | —                                               | Same tokens with Lightness 10, 90, 30, 80, 60                                                                                            |
| `mal` | Material light         | —                                               | Hidden Saturation 40 `Primary` with a `mtl` preset, hidden Complementary and Error branches each with a `mtl` preset, and a `mnl` preset |
| `mad` | Material dark          | —                                               | Same structure with `mtd` and `mnd` presets                                                                                              |
| `sch` | Schemist theme         | accents, semantics, neutrals (all `true`)       | The enabled sections: Triad left `Secondary` and right `Tertiary`, each with a `stt` preset; a `smp` preset; a `ntl` preset              |

Presets can contain presets, which are expanded in turn (§5.4).

Param kinds: `range` (integer slider), `color` (color picker,
§11.3), `boolean` (toggle button, used by Harmonies and Schemist
theme). Toggles are built like the color blindness filters, and
each spans a whole row of the options form.

## 7. Presets

Presets (§5.4, §6) are defined in `src/lib/definitions/presets/`.
Applying one adds a node of its type as a child of the selected
node. `$` in tokens refers to the parent's name.

`index.ts` lists them in display order: States, Split
complementary, Triad, Tetrad, Semantic colors, Semantic color
pairs, Scale, Neutral, Harmonies, Rainbow, Material tones light
and dark, Material neutral light and dark, Material light and
dark, Schemist theme. `definitions/nodes/index.ts` registers them
in `defs` from that list.

`src/lib/definitions/presets/presets.test.ts` snapshots the
colors and names of every preset, which guards them against
changes in the way they are built.

## 8. Application state

All state lives in `.svelte.ts` modules under `#lib/stores/`,
each exporting a single reactive object.

### 8.1 `palette`

| Member             | Description                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `root`             | Root `Node`, set when the palette component mounts                                                  |
| `outputs`          | `collectOutputs(root)`, updated synchronously                                                       |
| `debouncedOutputs` | Copy of `outputs`, updated after `10 + clamp(400 − ms since last update, 0–400) / 2` ms (10–210 ms) |
| `rootColor`        | Root's color in `debouncedOutputs`, else the first output, else `#feffff`                           |

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
| `colorEntries`                | `{id, name, color, rgbColor}` from `palette.debouncedOutputs`, in tree order           |
| `sortedColors`                | Entries sorted by `round(h) × 10 + (10 − round(l) / 10)`, rotated to start at the root |
| `all`                         | Every combination (§9.1)                                                               |
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
`''`).

### 8.5 `history`

Undo and redo of the palette tree, as decided in
`docs/adr/0002-snapshots-and-undo.md`. A generic `History` class
(`#lib/utils/history.svelte.ts`) holds `past` and `future` stacks
of snapshots (`serializeTree` of the root, with ids), capped at
100 entries.

| Method     | Effect                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reset()`  | Clears the stacks and takes the current tree as the committed state, without notifying. On palette mount, `startHistory()` calls it then syncs the URL, but not storage, so opening a link keeps the stored palette |
| `commit()` | Pushes the last committed state to `past` and clears `future`, unless the tree is unchanged                                                                                                                         |
| `undo()`   | Commits pending edits, then restores the last `past` snapshot                                                                                                                                                       |
| `redo()`   | Commits pending edits, then restores the last `future` snapshot                                                                                                                                                     |

Restoring rebuilds the `Node` tree with the same ids, so node
components update in place (open panels are kept).

Commits happen:

- after adding a node, applying a preset, removing a node,
  renaming a node and randomizing a color;
- on every `change` event in the document (slider release,
  checkbox, committed color field…); unchanged trees are skipped;
- 500 ms after the last edit, as a fallback.

Every new committed state replaces the URL query with its
`?preset=` (shallow `goto`, no history entry) and is stored in
`localStorage` under `palette`.

### 8.6 Persistence

The palette persists through the URL and `localStorage` (§8.5),
the dark scheme through `localStorage` (§8.3). Undo history,
combination filters and export settings are not persisted.

## 9. Contrast and accessibility

### 9.1 Combinations

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

## 10. Permalinks

### 10.1 Flow

- `permalink(root)` =
  `<origin>?preset=<encodeURI(pack(serializeTree(root)))>`, with
  `&`, `#` and `+` also percent-encoded so they survive the query
  string.
- The address bar always holds the permalink of the palette, as
  it is updated on every commit (§8.5).
- **Share** copies the permalink to the clipboard and shows "Link
  copied" (or a hint to copy it from the address bar if the
  clipboard is unavailable) for 2 seconds.
- On load, `getRootNode()` unpacks `?preset=`, else the palette
  stored in `localStorage`. If both are missing or invalid
  (errors are logged), the tree is a single Custom color node
  with a random usable color.
- Exports embed the permalink (CSS/Sass comment, design tokens
  description).

### 10.2 Format (`#lib/packing/`)

```
<version>@<payload>
```

Permalinks are generated with version `2`. Version `1` is still
read, so older links keep working. Both share the payload below
and only differ in how colors are written (see values).

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

Values: booleans `0`/`1`, ranges as is, colors as a dictionary
index. The dictionary entry of a color is:

| Version | Color entry                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| `1`     | 6-digit hex code without `#`, which rounds the color (lossy)                    |
| `2`     | `h_s_l` of the `SchemistColor`, as full precision JavaScript numbers (lossless) |

Version `2` rejects color entries that are not exactly three
finite numbers.

Examples, a Custom color alone: `1@0@01223@clr,,color,ffc208`,
`2@0@01223@clr,,color,90_50_50`.

The rationale for keeping this custom format rather than
compressing links is recorded in
`docs/adr/0001-url-packing-compression.md`.

## 11. User interface

### 11.1 Layout

- Header: app name and baseline, **Dark/Light theme** toggle,
  link to the GitHub repository.
- Notification area: shows the previewed combination (§11.5).
- Two sections: **Palette** (tree, Export, Share, Undo and Redo
  buttons) and **Combinations (filtered / total)**.
- Shortcuts: `Ctrl`/`Cmd` + `Z` undoes, `Ctrl`/`Cmd` + `Shift` +
  `Z` redoes, except while editing text (text inputs, textareas,
  the editable node name), where native undo applies. Undo and
  Redo are disabled when their stack is empty.

### 11.2 Palette tree

Each node shows its color and name, then actions:

| Action     | Tooltip                                      | Effect                                                                       |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| Remove     | Remove this color and all of its derivatives | Not available on the root                                                    |
| Visibility | Don't compare this color                     | Toggles `isHidden`                                                           |
| Info       | Show color info                              | Hex, RGB, HSL and LCH values; name and hex of each color of a preset         |
| Options    | Tune this color                              | Parameter fields; open by default on the root only                           |
| Swap       | Change this color's type                     | Opens the child picker to replace the type; not on the root nor on presets   |
| Expand     | Turn into separate colors                    | Calls `expandPreset` (§5.4); presets only, in place of Swap, not on the root |
| Add        | Add matching colors                          | Opens the child picker; not on presets                                       |

Unavailable actions are hidden but keep their space, so buttons
stay aligned across nodes.

- The name is editable in place (Enter or blur commits). The hint
  reads "Insert parent color name with $." on child nodes, and
  "Leave empty to use the parent's name." on presets.
- A root without children shows a "Start by adding matching
  colors" call to action, unless it is a preset.
- A preset's color bar shows its colors top to bottom, and fades
  when the preset is hidden.
- Range fields show a gradient previewing the parameter's effect,
  except on presets.

### 11.3 Color field

Tabs **RGB**, **HSL**, **LCH** (sliders) and **CSS** (text
input), plus **Randomize** (`randomUsableColor`).

The CSS input applies valid colors as they are typed, without
rewriting the text. On commit (blur or Enter), invalid text shows
a validity message; valid text is rewritten in the format it was
typed in.

### 11.4 Child picker

A modal with two lists, each item previewed on the current color:
**Color palettes** (presets, §7, previewed with `evaluateTree`
from their default args) and **Single colors** (node types, in
`defList` order, §6).

When changing a color's type, the modal is titled "Change color
type" and only lists single colors, previewed on the parent's
color (the node's input). The current type is marked with a check
and `aria-current`. Picking a type calls `setType`, which history
records as one step.

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

Outputs (visible colors, tree order):

- **Table**: swatch, name, value.
- **Design tokens**: JSON
  `{"Colors": {"$description": "Build with Schemist (<permalink>)", "<name>": {"$type": "color", "$value": "#rrggbb"}}}`,
  always hex.
- **CSS**: `/* @see <permalink> */` then `--<name>: <value>;`
  lines.
- **Sass**: same with `$<name>: <value>;`.

Variable names are split on spaces, stripped of every character
but `a-z A-Z 0-9 _ -`, then joined in the chosen casing.

## 12. Testing

Unit tests cover utils, color parsing, color deficiency
simulation, the highlight temperature, packing (snapshots of
every node type, presets included, round trips, lossless colors
and backward compatibility), permalinks (tokens with special
characters), tree serialization (ids), the undo history and the
initial palette source (link, storage, random), and the colors
and names of every preset (snapshots). There are no component or
end-to-end tests. CI runs the unit tests only (not `check`,
`lint` or `build`).

## 13. Known issues and limits

- **Packed numbers above `0xfff`** (4096) cannot be encoded,
  which caps the dictionary size and the node count per tree.
- **`#lib` bare import** points to `src/lib/index.js`, which does
  not exist (only `#lib/*` is used).
- **Alpha** is dropped by permalinks and design tokens.
