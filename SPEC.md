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
    definitions/presets/   Presets (§7)
    stores/                Reactive state, `.svelte.ts` modules (§8)
    packing/               Permalink encoding (§10)
    components/            UI (§11)
    utils/                 Generic helpers (arrays, css, math, strings, …)
    presets.ts             parseTree / serializeTree (tree ⇄ PresetNode)
    palette.ts             getRootNode (initial tree from URL or random)
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

| Field      | Kind     | Description                                                              |
| ---------- | -------- | ------------------------------------------------------------------------ |
| `id`       | readonly | `n<uid>`, unique per session                                             |
| `def`      | readonly | Node type definition (§6)                                                |
| `token`    | state    | Name template (§4.4), `''` for an automatic name                         |
| `isHidden` | state    | Excluded from combinations and exports, still drawn in the tree          |
| `args`     | state    | Parameter values, initialized from the type's defaults                   |
| `children` | state    | Child nodes, ordered                                                     |
| `parent`   | state    | Parent node, `undefined` for the root                                    |
| `input`    | derived  | `parent.output`, or `[white, '']` for the root                           |
| `output`   | derived  | `[def.apply(input color, args), generateName(token, color, input name)]` |

Operations: `addChild(child)` (detaches it from its previous
parent first), `removeChild(child)`, `destroy()` (removes the
node and its subtree from its parent).

### 5.2 Outputs

`collectOutputs(root)` walks the tree depth-first, parent before
children, and returns `{[id]: [color, name]}` for every
**visible** node. Children of a hidden node are still collected.

### 5.3 Tree serialization (`#lib/presets.ts`)

`PresetNode = {type, token?, args?, children?, isHidden?}` is the
plain form of a tree, used by presets and permalinks.
`parseTree(PresetNode) → Node` merges given `args` over the type
defaults; `serializeTree(Node) → PresetNode` omits empty tokens,
args and children.

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

Param kinds: `range` (integer slider), `color` (color picker,
§11.3), `boolean` (checkbox; no current type uses it).

## 7. Presets

Defined in `src/lib/definitions/presets/`, listed in `index.ts`.
A preset is `{label, description?, nodes: PresetNode[]}`;
applying it adds its nodes as children of the selected node. `$`
in tokens refers to the parent's name.

| Preset                 | Nodes                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| States                 | Highlight `$ light`, Shadow `$ dark`                                                                                          |
| Split complementary    | `scl`, `scr`                                                                                                                  |
| Triad                  | `trl`, `trr`                                                                                                                  |
| Tetrad                 | `ttl`, `ttr`                                                                                                                  |
| Semantic colors        | `inf` Info, `pos` Success, `wrn` Warning, `neg` Error                                                                         |
| Semantic color pairs   | Semantic colors, each with a Contrasting child `On $`                                                                         |
| Scale                  | Lightness 0, 10, …, 100                                                                                                       |
| Neutral                | Hidden Saturation 5 `Desaturated $` with Lightness 98, 85, 50, 15, 2 (`Neutral white` … `Neutral black`)                      |
| Harmonies              | Left tetrad, left triad, split complementaries, right triad, right tetrad                                                     |
| Rainbow                | Analogous steps 1–11                                                                                                          |
| Material tones light   | Lightness 40 `$`, 100 `On $`, 90 `$ container`, 10 `On $ container`                                                           |
| Material tones dark    | Lightness 80 `$`, 20 `On $`, 30 `$ container`, 90 `On $ container`                                                            |
| Material neutral light | Hidden Saturation 10 with Lightness 99 Surface, 10 On surface, 90 Surface variant, 30 On surface variant, 50 Outline          |
| Material neutral dark  | Same tokens with Lightness 10, 90, 30, 80, 60                                                                                 |
| Material light         | Hidden Saturation 40 `Primary` with light tones, hidden Complementary and Error branches with light tones, and light neutrals |
| Material dark          | Same structure with dark tones and dark neutrals                                                                              |
| Schemist theme         | Triad left `Secondary` and right `Tertiary` with States, Semantic color pairs, Neutral                                        |

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

None of this state is persisted except the dark scheme.

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

Culori's `filterDeficiencyProt/Deuter/Trit` filters at default
severity, applied to both colors of a pair. Results are clamped
to the sRGB gamut, since out-of-gamut values would make APCA
return 0 (issue #46).

### 9.5 Luminosity analysis

A CSS grayscale filter on the whole layout, to compare lightness
by eye.

## 10. Permalinks

### 10.1 Flow

- `permalink(root)` =
  `<origin>?preset=<encodeURI(pack(serializeTree(root)))>`, with
  `&`, `#` and `+` also percent-encoded so they survive the query
  string.
- **Share** navigates to that URL (the address bar then holds the
  link; nothing is copied to the clipboard).
- On load, `getRootNode()` unpacks `?preset=`. If it is missing
  or invalid (the error is logged), the tree is a single Custom
  color node with a random usable color.
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
- Two sections: **Palette** (tree, Export and Share buttons) and
  **Combinations (filtered / total)**.

### 11.2 Palette tree

Each node shows its color and name, then actions:

| Action     | Tooltip                                      | Effect                                             |
| ---------- | -------------------------------------------- | -------------------------------------------------- |
| Remove     | Remove this color and all of its derivatives | Not available on the root                          |
| Visibility | Don't compare this color                     | Toggles `isHidden`                                 |
| Info       | Show color info                              | Hex, RGB, HSL and LCH values                       |
| Options    | Tune this color                              | Parameter fields; open by default on the root only |
| Add        | Add matching colors                          | Opens the child picker                             |

- The name is editable in place (Enter or blur commits). The hint
  reads "Insert parent color name with $." on child nodes.
- A root without children shows a "Start by adding matching
  colors" call to action.
- Range fields show a gradient previewing the parameter's effect.

### 11.3 Color field

Tabs **RGB**, **HSL**, **LCH** (sliders) and **CSS** (text
input), plus **Randomize** (`randomUsableColor`).

The CSS input applies valid colors as they are typed, without
rewriting the text. On commit (blur or Enter), invalid text shows
a validity message; valid text is rewritten in the format it was
typed in.

### 11.4 Child picker

A modal with two lists, each item previewed on the current color:
**Color palettes** (presets, §7) and **Single colors** (node
types, in `defList` order, §6).

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
every node type and preset, round trips, lossless colors and
backward compatibility) and permalinks (tokens with special
characters). There are no component or end-to-end tests. CI runs
the unit tests only (not `check`, `lint` or `build`).

## 13. Known issues and limits

- **Packed numbers above `0xfff`** (4096) cannot be encoded,
  which caps the dictionary size and the node count per tree.
- **`#lib` bare import** points to `src/lib/index.js`, which does
  not exist (only `#lib/*` is used).
- **Alpha** is dropped by permalinks and design tokens.
