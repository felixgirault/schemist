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
                           parsePairs / namePairs / parseRoles (pairs and roles ⇄ names, §8.1)
    palette.ts             loadPalette (initial tree, pairs, roles and rules from URL, storage or random; default requirements if none)
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

| Field        | Kind     | Description                                                                                 |
| ------------ | -------- | ------------------------------------------------------------------------------------------- |
| `id`         | readonly | `n<uid>`, unique per session                                                                |
| `def`        | raw      | Node type definition (§6), replaced by `setType`                                            |
| `token`      | state    | Name template (§4.4), `''` for an automatic name                                            |
| `isHidden`   | state    | Excluded from combinations and exports, still drawn in the tree                             |
| `args`       | state    | Parameter values, initialized from the type's defaults                                      |
| `overrides`  | state    | Args by variant id, never the base's (§5.4), `{}` without                                   |
| `activeArgs` | derived  | `args` with the overrides of the selected variant (`view.variant`) over them                |
| `children`   | getter   | Child nodes, ordered (private state, read-only)                                             |
| `parent`     | getter   | Parent node, `undefined` for the root (private state)                                       |
| `input`      | derived  | `parent.output`, or `{color: white, name: ''}` for the root                                 |
| `generated`  | derived  | Colors of a preset, `{[id]: {color, name}}`, `{}` for other types (§7)                      |
| `output`     | derived  | `{color: def.apply(input.color, activeArgs), name: generateName(token, color, input.name)}` |

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
their args. Overrides follow with `remapOverrides`: kept for the
params that `remapArgs` would keep, except structural ones
(§5.4), a variant left with none being dropped.

### 5.2 Outputs

`collectOutputs(root)` walks the tree depth-first, parent before
children, and returns `{[id]: {color, name}}` for every
**visible** node, presets replaced by their generated colors
(§7). Children of a hidden node are still collected.

`evaluate(NodeData, withHidden?, variant?)`
(`#lib/core/evaluate.ts`) computes the same visible outputs
without the store, as `PaletteColor`s
(`{id, name, color, rgbColor}`). Ids are depth-first indexes
(`'0'`, `'1'`, …). With a `variant` (a name of the tree's
`variants`, §5.4) the node's overrides apply over its args, and a
preset builds its colors from them; ids are the same in every
variant. In the store, `view.variant`
(`#lib/stores/nodes.svelte.ts`: the id of the selected variant,
nothing for the base; view state, not saved nor in history) makes
`output`, `generated` and so every color read from the nodes
those of that variant. `setArg(name, value)` writes an override
of the selected variant, or the arg without one;
`isOverridden(name?)` tells whether it has one (for the name, or
any) and `resetArg(name)` removes it (a variant left with none is
dropped). An override equal to the base's value is kept: it stays
until reset.

### 5.3 Tree data (`#lib/tree.ts`, `#lib/core/tree.ts`)

`NodeData = {id?, type, token?, args?, overrides?, children?, isHidden?, pairs?, roles?, rules?, variants?}`
(`#lib/core/nodes.ts`) is the plain form of a tree, used by
presets, permalinks, history snapshots and the CLI, with `type` a
`NodeType` (§6). `parseTree(NodeData) → Node` merges given `args`
over the type defaults and reuses `id` when set;
`serializeTree(Node, pairs?, roles?, rules?, variants?) → IdentifiedNodeData`
(a tree whose ids are all set) includes ids, omits empty tokens,
args, overrides and children, and writes the root's pairs, roles,
rules and variants (§8.1). Permalinks don't store ids.
`changedArg` and `withIds` live in `#lib/core/tree.ts`.

`validateTree(data, path, isRoot?)` (`#lib/core/tree.ts`, which
also accepts the root's `pairs`, `roles`, `rules` and `variants`)
checks data from outside and returns a `NodeData`: unknown keys,
node types and params, and invalid values are rejected naming
their path. Color args are CSS strings, converted to colors. The
CLI (§14) validates its input with it, and `unpack` (§10)
validates what a permalink holds before building the tree.

### 5.4 Variants (ADR 19)

A palette has variants, such as light and dark: the root's
`variants` lists their names, the base first (the tree as it is),
and a palette without it is its base only. A variant changes
**args only**: a node's `overrides` is
`{<variant name>: {<param>: value}}` (the same values as `args`,
colors as CSS strings in files), never for the base. Types,
tokens, parents, children, visibility, roles, rules and pairs are
shared, so every token exists in every variant. A node without an
override keeps its base args in a variant; its color may still
differ through its parent.

A param that changes a preset's structure is marked
`isStructural` in its definition, and can't be overridden: Scale
`steps`, Rainbow `colors`, the Harmonies and Schemist theme
booleans. `validateTree` rejects an override that names an
undeclared variant or the base, an unknown param, a value out of
bounds or a structural param, with its path, and overrides when
the root declares no variants. Variants are names, not empty,
each once.

In the app, variants have ids (`AppVariant`, `{id, name}`, like
roles): `palette.variants` holds them, base first, empty without
variants, and a node's `overrides` are keyed by id.
`parseVariants` makes the ids when a tree loads and
`withVariantIds` keys the overrides by them; `serializeTree` with
`variants` writes names back. Variants are edited in the Palette
(§8.1, §11.2). `expandPreset` gives each generated node, per
variant, the args that differ from the base (`withOverrides`):
the structure being the same, they line up.

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

| Member            | Description                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`            | Root `Node` (`undefined` until the palette component mounts)                                                                                                                                                                                                                                      |
| `outputs`         | `collectOutputs(root)`, updated synchronously                                                                                                                                                                                                                                                     |
| `settledOutputs`  | Copy of `outputs`, updated after `10 + clamp(400 − ms since last update, 0–400) / 2` ms (10–210 ms)                                                                                                                                                                                               |
| `storedPairs`     | Declared pairs as set, `{fg: string, bg: string, wcag2?, apca?, difference?}` (`ColorPair`, color ids), set on load                                                                                                                                                                               |
| `pairs`           | `storedPairs` whose two colors are still in the tree (hidden and generated ones included)                                                                                                                                                                                                         |
| `storedRoles`     | Roles as set, `{id, name, colors: string[]}` (color ids), set on load (ADR 16)                                                                                                                                                                                                                    |
| `roles`           | `storedRoles` without the colors since removed; a role stays until deleted, even empty                                                                                                                                                                                                            |
| `rules`           | Rules as set, `{id, fg, bg?, use?, ...targets}` with `fg` and `bg` **role ids** (§9.7), set on load                                                                                                                                                                                               |
| `variants`        | Variants as set, `{id, name}`, base first, `[]` without (§5.4, ADR 19), set on load                                                                                                                                                                                                               |
| `selectedVariant` | The variant shown (`view.variant`), the base if none is chosen or it is gone; `undefined` without variants                                                                                                                                                                                        |
| `expandedPairs`   | `expandRules(roles, rules, pairs).pairs`: what is checked, one-off and rule pairs, `sources` holding **rule ids**                                                                                                                                                                                 |
| `unsavedPairs`    | `{pair, names}` for the pairs a permalink cannot hold (see below)                                                                                                                                                                                                                                 |
| `unsavedMembers`  | Names of role members a permalink cannot hold, shared by several colors (see below)                                                                                                                                                                                                               |
| `permalink`       | `permalink(serializeTree(root, pairs, roles, rules, variants), window.location.origin)` (§10.1)                                                                                                                                                                                                   |
| `variantColors`   | `{id, name, colors}` for each variant with colors (`[]` without variants): `colors` for the selected one, the settled colors of the others laid over it                                                                                                                                           |
| `settledVariants` | `PaletteColor[]` of each variant id, `evaluate`d from the tree once per `settle()` with `settledOutputs` (only with variants, the selected one left out as `colors` holds it; `selectVariant` settles), in the same order as `colors`; a variant missing until the next settle is not counted yet |
| `colors`          | `PaletteColor`s `{id, name, color, rgbColor}` from `settledOutputs`, in tree order                                                                                                                                                                                                                |
| `rootColor`       | Root's color in `settledOutputs`, else the first output, else `#feffff`                                                                                                                                                                                                                           |

`addVariant()` adds a variant with no overrides, named "Dark" if
free, else "Variant 2", "Variant 3"…, selects it and returns its
id; the first one also writes the base, "Light", before it.
`renameVariant(id, name)` trims the name and refuses it (returns
`false`) if blank or taken by another variant, the base being
renamable like the others. `deleteVariant(id)` does nothing for
the base, else removes the variant and its overrides in every
node. `selectVariant(id?)` selects a variant, the base if there
is no such id (the selection also falls back after an undo that
removes the selected variant). Changes to variants are changes
like any other (§8.5); the selection is not.

`setPair(fg, bg, targets)` declares or replaces a pair, or
removes it when it has no target. It only touches one-off pairs
(`pairs`): `combinations.pairChecks`, the hidden pairs and the
requirements list read `expandedPairs`, so rules are checked.

**Roles and rules hold ids too.** Roles and rules have ids of
their own (`AppRole`, `AppRule`, `r<n>` and `u<n>`), rules hold
role ids and the sources of expanded pairs hold rule ids:
renaming a role or removing a rule rewrites nothing elsewhere.
The core's `expandRules` looks roles up by name and numbers
rules, so `expandedPairs` gives it role ids as names and maps the
indexes of the sources back to rule ids. Names only exist in the
saved format, mapped like color names: `parseRoles(tree, root)`
and `parseRules(tree, roles)` give ids at load (what does not
resolve is dropped and logged), `nameRoles(root, roles)` and
`nameRules(roles, rules)` map back when saving; snapshots hold
ids (§8.5). Methods, each one change for the history:
`addRole(name, colors?)` (returns the id; nothing when the name
is empty or taken, names being what a permalink holds),
`renameRole(id, name)` (false when empty or taken),
`deleteRole(id)` (also deletes its rules),
`addMember(roleId, colorId)`, `removeMember`,
`setRule(fg, bg | undefined, use?)` (no `bg`, or `bg` equal to
`fg`, is a role among itself), which replaces the rules of a
couple with one of `use` (in place of the first, else at the end)
or with none, in one change. A role member whose name is shared
by several colors is left out of the saved role until renamed,
and listed in `unsavedMembers`; the pairs notice lists it with
the unsaved pairs' names.

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

| Member                        | Description                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blindnessTypes`              | Simulations to compute: `protanomaly`, `deuteranomaly`, `tritanomaly`                                                                                                                                                                                                     |
| `isLuminosityAnalysisEnabled` | Renders the whole app in grayscale                                                                                                                                                                                                                                        |
| `previewedUid`                | Combination applied to the app theme, or `null`                                                                                                                                                                                                                           |
| `previewed`                   | The pair (`bgName`, `fgName`, `contrast.bg`/`fg`) of the pair `<bgId>-<fgId>` of `previewedUid`, declared or not, or `null`                                                                                                                                               |
| `pairChecks`                  | In the selected variant (the rows): `{id, pair, fg, bg, checks, pass, for}` (`for` being `usesOf(pair)`, §9.7) for each declared pair (`palette.pairs`, §8.1) of two visible colors, `id` `<bgId>-<fgId>`, `checks` from `checkPair` (§9.7) with the selected simulations |
| `allChecks`                   | `{name, checks}` for each variant (one unnamed entry without): the pairs checked in its colors, `pairChecks` for the selected one                                                                                                                                         |
| `checkedPairs`                | Count of the pairs of `allChecks`, one per variant                                                                                                                                                                                                                        |
| `ruleStatus(id)`              | `{pass, text}` of a rule over every variant: `met`, `not met` or `not met in Dark` (from one map of failing variants by rule, built once per change)                                                                                                                      |
| `passingPairs`                | Count of the pairs of `allChecks` that pass                                                                                                                                                                                                                               |
| `hiddenPairs`                 | Declared pairs with a hidden color, left out of `pairChecks`                                                                                                                                                                                                              |
| `requirements`                | The one-off pairs (`sources.oneOff`) of `pairChecks` by use: `{id, name, checks}` for each built-in use and Custom (last) with a pair, a pair under each use it holds (`for`)                                                                                             |
| `addPair(fg, bg, use)`        | Declares the pair (ids) with every target of a use, keeping its other targets; `false`, nothing declared, for one color on itself                                                                                                                                         |
| `ruleChecks`                  | `Map` rule id → the `pairChecks` the rule is a source of                                                                                                                                                                                                                  |
| `describeRule(rule)`          | `{label, use}`: "Muted on Surfaces" (or "X among themselves") and the use's name (Custom if none)                                                                                                                                                                         |

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
`{tree, pairs, roles, rules, variants}`: the `serializeTree` of
the root (with ids, overrides by variant id), the declared pairs
(§8.1) and roles by color ids, the rules and the variants, frozen
by `$state.snapshot`. Undoing rebuilds the nodes with
`parseTree`, which keeps the ids, so the ids of the pairs still
point to the same colors, so each state gets back exactly its own
pairs. `setPair` is a change like any other, and so is a change
to roles or rules (they are in the snapshot and in the grouping
test). What goes to `localStorage` and to the URL is the packed
palette of the snapshot, pairs included (by names, §10).

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

For each color (as background) and every other color (as
foreground), one combination with `uid = <bgId>-<fgId>`. Both
orders of a pair are listed. `n` visible colors give
`n × (n − 1)` combinations. The CLI's `eval` uses it; the app
does not list them (ADR 17), its tables measure pairs with
`checkPair` (§9.7).

Each combination holds the base contrast, one contrast per
selected simulation, and `minLevel`/`minGrade`: the lowest of
them, used for filtering.

### 9.2 Metrics and grades

| Type   | Level                | Grades                                       |
| ------ | -------------------- | -------------------------------------------- |
| WCAG 2 | Contrast ratio, 1–21 | `AAA` ≥ 7, `AA` ≥ 4.5, `AA18` ≥ 3, else `KO` |
| APCA   | `                    | Lc                                           | ` (absolute APCA lightness contrast, text = foreground) | `5` ≥ 75, `4` ≥ 60, `3` ≥ 45, `2` ≥ 30, `1` ≥ 15, else `0` |

APCA returns 0 for a channel out of 0–255, which rounding errors
of the color conversions can give (red has a green of -7e-14), so
`wcag3Contrast` clamps channels first.

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
by eye; the **Grayscale** toggle of the combinations header
(§11.5).

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
UI** (`wcag2` 3), **Categories** (`difference` 10). A pair with
targets left over is Custom (§11.5).

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
either order). Each pair has
`sources: {rules, overrides, oneOff}`: the **indexes** in `rules`
of the rules it comes from (the app maps them to rule ids, §8.1),
or `oneOff: true` with no rules when a declared pair replaced
them, `overrides` then being the indexes of the rules it
replaced. Order: rules' couples by rule, one-off pairs replacing
in place, others last. `errors` are `{index, field?, message}`
for unknown roles (`fg` or `bg`), an unknown use, or no target;
the rule is left out. An unknown role is an error here, not in
`validateTree`, so that the app stays lenient like for pairs.

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
  Custom color node with a random usable color. A palette that
  declares no pairs, roles and rules (a new one, or a link or
  stored palette without them) gets `defaultRequirements`
  (`#lib/core/pairs.ts`, ADR 21) in the saved format: the roles
  Surfaces, Text and Borders, all empty, and the rules Text on
  Surfaces (Body text) and Borders on Surfaces (Large text and
  UI). They are set before the history starts, then ordinary; a
  palette with any pair, role or rule is left as it is, so
  deleting all of them brings the defaults back on the next load.
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

Version `2` adds the pairs, roles, rules (§9.7) and variants
(§5.4) after the nodes, and writes colors differently (see
values):

```
<root>@<nodes>@<pairs>@<roles>@<rules>@<variants>@<dictionary>
```

| Part         | Content                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionary` | Comma-separated strings, in order of first use: type codes, tokens, param names, colors (v2: also pair names, targets and values). `%`, `,` and `@` are escaped as `%25`, `%2C` and `%40` |
| `pairs`      | v2 only: comma-separated pair records, empty without pairs                                                                                                                                |
| `roles`      | v2 only: records of dictionary indexes, the role name then its color names                                                                                                                |
| `rules`      | v2 only: records of the indexes of `fg`, `bg` and `use` (the empty string for none), then (target name, value) indexes as in pairs                                                        |
| `variants`   | v2 only: a single record of dictionary indexes, the names of the variants, the base first                                                                                                 |
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

In version 2, the numbers are followed by one `~` and a block per
variant with overrides: the dictionary index of the variant's
name, then (dictionary index of the param name, value) pairs
(`1@…` records never have them).

Values: booleans `0`/`1`, ranges as is, colors as a dictionary
index. The dictionary entry of a color is:

| Version | Color entry                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| `1`     | 6-digit hex code without `#`, which rounds the color (lossy)                    |
| `2`     | `h_s_l` of the `SchemistColor`, as full precision JavaScript numbers (lossless) |

The sections of roles, rules and variants are left out when empty
and after the last non-empty one (a link with pairs only is as it
was, and a link without the sections is read as having none).

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
- Two sections, each under a large title (`h2`): **Palette**
  (tree, then **Roles** (§11.5) under a title as large, then
  Export, Share, Undo and Redo buttons) and **Requirements (met /
  checked)**: the declared pairs that pass (`passingPairs`) over
  the declared pairs of visible colors (`checkedPairs`), each
  counted once per variant (ADR 19), with the **Simulate** and
  **Grayscale** toggles (§11.5) in its header, then the
  requirements (§11.5). From 55rem, they are two columns, Palette
  (60ch, for long names) then Requirements.
- Shortcuts: `Ctrl`/`Cmd` + `Z` undoes, `Ctrl`/`Cmd` + `Shift` +
  `Z` redoes, except while editing text (text inputs, textareas,
  the editable node name), where native undo applies. Undo and
  Redo are disabled when their stack is empty.

### 11.2 Palette tree

Each node shows its color (a preset shows a bar of its generated
colors, top to bottom) and name, then actions:

| Action     | Tooltip                                                             | Effect                                                                                          |
| ---------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Remove     | Remove this color and all of its derivatives                        | Not available on the root                                                                       |
| Visibility | Hide this color: kept as a base for others, not exported or checked | Toggles `isHidden`                                                                              |
| Info       | Show color info                                                     | Popover with the Hex, RGB, HSL and LCH values; name and hex of each generated color for presets |
| Options    | Tune this color                                                     | Popover with the parameter fields                                                               |
| Expand     | Turn into separate colors                                           | Presets only, replaces them with plain nodes (§7)                                               |
| Swap       | Change this color's type                                            | Opens the child picker to replace the type; not on the root, replaced by Expand on presets      |
| Add        | Add matching colors                                                 | Opens the child picker; disabled on presets                                                     |

- Info and Options open popovers (the native `popover` attribute,
  toggled by `popovertarget` buttons, which close on outside
  click or Escape), positioned below their button where CSS
  anchor positioning is supported. Neither is open by default.
- The name is editable in place (Enter or blur commits). The hint
  reads "Insert parent color name with $." on child nodes.
- A preset lists its colors under its row (ADR 23), read-only: a
  native `<details>`, open by default and not saved, summarised
  as "9 colors", a line each in the order of `generated` (flat:
  ids don't hold the template's nesting) with a swatch (`Swatch`
  takes the `color` for one the palette doesn't list, a hidden
  preset's) and its name; dimmed on a hidden preset. Hidden
  template colors have no line.
- **Roles on a color** (`ColorRoles.svelte`, ADR 23), for a node
  (not a preset's own row) and for each line of a preset's list,
  taking the color's id and name: its roles' names after the
  label or the name ("custom color · Text, Borders"), then a
  **Roles of Ink** button (`RolesIcon`; the only action of a
  line) opening a popover (the native `popover`, id `<color
  id>-roles`, valid for ids with dots) that is a `fieldset` named
  by its `legend` "Roles of Ink", with a checkbox per role
  (`palette.roles` order), checked when the role holds the id and
  controlled by the store: a click is `addMember` or
  `removeMember`, one undo, and an undo unchecks it. Without
  roles it says to add one in Targets. A color that has a role
  and whose name is in `unsavedMembers` also shows a warning icon
  with a text (visually hidden, and tooltip) saying its roles
  won't be saved until one of the colors with that name is
  renamed.
- A root without children shows a "Start by adding matching
  colors" call to action.
- With variants (§5.4), the **Palette** header holds the variant
  switch: a group "Variants" of one toggle button per variant
  (`aria-pressed`, the base first), a **+** button ("Add a
  variant"), and for the selected variant a **Name** field
  (commits on change; a blank or taken name is put back) and a
  **Delete <name>** button, disabled for the base. A palette
  without variants shows only the **+**. The tree and its colors
  show the selected variant, the Requirements tables every one,
  and rule statuses and the count cover every variant (§11.5).
- In a variant other than the base, the Options fields write
  overrides. A node with one shows a "●" mark before its type
  (text alternative "Overridden in this variant"), and each field
  with one a **Reset to <base name>** button. Structural params
  (`isStructural`) are disabled, with the hint that they are the
  same in every variant. An edit of an override groups into one
  undo step like an arg edit does.
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

### 11.5 Requirements panel

No grid (ADR 18): the requirements are a section of the page
(§11.1), `Result.svelte` holding `Requirements.svelte`, with
every pair checked in one table (ADR 20, 22; simulation rows,
sticky headers and the selected column's highlight are still to
come). Its headings (Roles, Targets, Checks, One-off pairs) are
`h3`, under the section's `h2`, larger and with space above.

- **Header toggles** (in `App.svelte`, in the Requirements header
  beside the title, wrapping under it on narrow panels, always
  shown): **Simulate** with one toggle per simulation, **P**,
  **D**, **T** (protanomaly, deuteranomaly, tritanomaly;
  `blindnessTypes`), each with its full name as tooltip and
  accessible name, and **Grayscale**
  (`isLuminosityAnalysisEnabled`, §9.5). Simulations apply to the
  rule statuses and the count; the table does not show simulated
  levels yet. There is no other filter, no grid and no list of
  every pair (ADR 17, 18; the CLI keeps `combine`, §9.1).
- The checks are one `<table>` (`CheckGroup`s): the pair first,
  then a column per variant of `allChecks` (one column with a
  visually hidden header "Colors" without variants). Each rule,
  then each use of the one-off pairs, is a `<tbody>` with a title
  spanning the row (`<th scope="rowgroup">`), then a row per
  pair. The row header (`<th scope="row">`) has the names ("Grey
  & White") and the pair's actions, in the panel's colors, on one
  line. A cell is one line in that variant's colors (`allChecks`,
  looked up by pair id): per target (`{name, level, met?}`), the
  grade in bold and the level (rounded to 1 decimal; APCA as
  **Lc** and an integer rounded down, so that it never reads as
  the goal when unmet, with no grade), then ✓ or ✗ with "met" or
  "not met" as hidden text, targets separated by "·". A pair
  whose targets are all `difference` is not text on a background:
  its cell is in the page's colors, with the two colors as a
  small swatch pair before its level. The table uses the panel's
  font, not the export table's, and scrolls sideways when wider
  than the panel, the row headers and the group titles staying at
  the left (sticky, on the page's background). The scroll
  container has no `tabindex`: it holds focusable buttons.
- The **preview** button themes the whole app with the pair; the
  notification names it and has a stop button. `previewed` finds
  the pair among the visible colors, declared or not.
- Pairs are declared by rules (roles) or, for an exception, one
  by one under **One-off pairs**; nothing else opens or edits a
  pair (its targets are the use's).

**The roles** (`palette/Roles.svelte`), in the Palette section
(§11.1, a region labelled by its title), say what colors are, the
requirements what roles must meet (ADR 22). They are not in the
tree, where a preset's colors have no row. One line per role: its
name as an input (**Role name**, renamed on change, reverted if
empty or taken), its colors as chips (swatch, name and **Remove X
from Role**; hidden members dimmed, without swatch), **Add a
color to Role** (`aria-expanded`) opening a picker below (a
search field and the visible colors not in the role, as wrapping
buttons with swatches; Esc closes it), and **Delete role Role**,
at the end of the line, right-aligned and apart from the chips
(also deletes its rules; the tooltip counts them). **+ Role**
opens a form with a name field (**Add role**; a free name, else
an alert).

**The requirements** (`Requirements.svelte`), in the
**Requirements** section (§11.1, a region labelled by its title),
are two flat sections (ADR 22), then **One-off pairs**.

- **Targets**, with roles only: a `<table>` of the roles as rows
  (`fg`, `<th scope="row">`) and columns (`bg`, "on Surfaces"),
  in role order, in the panel's font, the row headers sticky when
  it scrolls sideways. Each cell is a `<select>` labelled by its
  couple ("Text on Surfaces", "Text among themselves"): "—" or a
  use, styled as the app's other fields (global `select`, with a
  focus ring), as wide as its use (9.5rem at most) and narrower
  when empty, so that four roles fit a wide panel; an empty one
  is faded (`color-mix`, at least 4.5:1) until hovered or
  focused. The status icon stays on its line. A cell is a view of
  the rules of its couple (on the diagonal, `bg` missing or the
  same as `fg`; `cellRules`); picking replaces them with one rule
  of the use, "—" removes them (`setRule`, one undo). A cell that
  holds several rules, or a rule with targets of its own, has one
  more option naming them ("Body text + Custom"), selected until
  another is picked; picking it changes nothing. Beside a cell
  with checked pairs, an icon with a text alternative and tooltip
  (`ruleStatus`: met when none of its rules' pairs fails, in any
  variant and in the worst case of the selected simulations; else
  "not met", or "not met in Dark" naming the failing variants);
  none otherwise (ADR 21).
- **Checks**: the table, given as the `pairs` snippet: each cell
  of the grid, in its order (rows, then columns), that has
  checked pairs, one group for all its rules, titled as the
  cell's extra option ("Text on Surfaces · Body text + Large text
  and UI", "Custom" for a rule with targets of its own) with its
  status and each pair once, then the one-off pairs by use
  ("One-off pairs · Custom"; `requirements`, Custom last, a pair
  under each use it holds). Nothing is measured again
  (`ruleChecks`). One hint says a rule is checked once its roles
  have colors, when one has none. The Preview button, named
  "Preview Grey on White", toggles `previewedUid` to
  `<bgId>-<fgId>`; it previews the selected variant's colors, so
  only that variant's column has one for now (ADR 20, step 3);
  **Override** (an icon button, `OptionsIcon`) in the row header
  of a pair that is not one-off declares it one-off with the
  targets the rules give, to edit it alone; a one-off pair's row
  header has a number field per target (**WCAG 2**, **APCA**,
  **Difference**, empty for none), applied on change, clearing
  them all removing the pair, and **Remove pair**; buttons and
  fields name their pair, as "Override Grey on White".

**One-off pairs** follow, always shown: **+ Pair** opens a
compact form, a **Foreground** and a **Background** color (each a
select of the visible colors by name, with a swatch of the chosen
one) and **For** (the use), then **Add pair**, which calls
`addPair` (one color on both sides gives an alert and nothing is
declared). The declared pairs are in the Checks table. Pairs with
a hidden color follow as **Not checked, a color is hidden**. With
nothing declared, a hint says to pick a use or declare a pair.

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

With variants (§5.4), **CSS** is one text with a block per
variant (`exportVariables`' `others`): the base in `:root { }`
and each other as `[data-theme="<dash-cased name>"] { }`,
declarations indented by two spaces; the pair comments are in the
base's block only. Without variants the output has no block, as
before. **Design tokens** and **Sass** are one file per variant:
the modal exports the selected variant and says so in a `.hint`
("Exporting the Dark variant"). The **table** has a Value column
per variant ("Value in Dark") and a Status column per variant.

- **Table**: swatch, name, value; then, if pairs are declared, a
  **Requirements** table (`requirementRows`): foreground,
  background, use, targets (`wcag2 4.5, apca 75`) and status, met
  or not met as is (no simulation), for each checked pair (rules
  expanded, `palette.expandedPairs`) of two exported colors.
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
  or for other formats. A token in a role or a pair gets
  `"$extensions": {"fr.fglt.schemist": {"roles": [...], "pairs": [{"color", "side", "use", "targets"}]}}`
  (DTCG's reverse-domain key for tool data; `roles` and `pairs`
  omitted when empty, the whole `$extensions` when both are): the
  role names, and each pair of the token: `color` a DTCG alias of
  the other color's token where it is placed (`{Colors.bg.page}`,
  `{Colors.Brand (2)}`), so that colors sharing a name stay
  apart, `side` the token's (`fg` or `bg`), `use` the lowercase
  names of the uses the targets hold (`body text`, `custom` for
  others), `targets` the pair's.
- **CSS**: `/* @see <permalink> */` then `--<name>: <value>;`
  lines.
- **Sass**: same with `$<name>: <value>;`.

In CSS and Sass, a variable in a pair has a comment on the line
above (one `/* ... */` line for a pair, a block with a line per
pair otherwise), written with the format's own variable names:
`body text on --bg-page (wcag2 4.5, apca 75)` for the text,
`--text as body text (...)` for its background,
`categories with --blue (difference 10)` for pairs with a
difference target only. Pairs with a hidden color are left out
everywhere. All exports take the requirements as `{pairs, roles}`
by color id (`Requirements`, optional) and are unchanged without
any; the CLI `export` declares them from the tree
(`exportRequirements`).

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
source (link, storage, random) and its default requirements (new,
without requirements, with some). Characterization snapshots
cover the outputs (hex values and names) of every preset under a
few root colors and the CSS, Sass and design tokens exports.
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
notice. `palette/Node.test.ts` renders a preset's list of colors,
the roles on a node and on a generated color (label, checkboxes,
popover ids) and the warning of a shared name (ADR 23). Export components are rendered server-side; there are no
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

The root may also have `roles` and `rules` (§9.7, "Roles and
rules"), validated with the rest, then resolved strictly: a role
member that does not resolve fails the tree
(`root.roles[0]: unknown color "x"`), and so does a rule on an
unknown role (`root.rules[1].fg: unknown role "x"`). `eval`
declares the expanded pairs (`declaredPairs` in `cli/tree.ts`:
the one-off `pairs` and the ones `expandRules` gives) and each
one has `sources`: `rules[i]` for every rule it comes from, and
`pairs` when a declared pair set its targets. The evals' graders
use combinations, not declared pairs, so they need no change.

The root may also have `variants` and nodes `overrides` (§5.4),
validated with the rest. `eval` then checks every variant
(`variantsOf` in `cli/tree.ts`): `colors`, `combinations` and the
declared `pairs` hold one entry per variant, each with a
`variant` (its name), and a pair passes only if its entries pass
in every variant. Names are the base's in every variant
(`inVariant`): the declared pairs and `--pair` resolve once, on
the base, whatever a color is called in another variant (a name
derived from its color changes with it). A tree without variants
has no `variant` field, as before. `export --variant <name>`
exports one variant of tokens or Sass (default: the base, the
first); it fails on a name that is not declared, on a tree
without variants and on `eval`. CSS has every block, whatever
`--variant` says (§11.8). `types` marks the params a variant
can't override with `structural: true`.

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
  simulations, every expected hex in some tree. A tree with
  variants is checked in each (a `variant` on the pair results,
  from `eval`), and `expect.json`'s `variants` makes it a problem
  for a tree to declare others.

A run scores the weighted fraction of its graders passed, a case
the mean of its runs. The report has a table of graders by run,
costs, turns, durations, models and the failed pairs.

**Cases.** `smoke` (a canary: build the CLI and write `types` to
a file), `website` (a light and dark scheme from one color, as
one tree with Light and Dark variants and one CSS) and
`dashboard` (a rebrand with brand colors, AAA text, states,
status colors and a color blind safe chart palette). Prompts end
with an output contract (file paths and token names) so that the
graders know where to look.

Evals call the model on the user's account: they are run by hand
after changing the CLI, its errors or its docs, and before
releases, never in `npm test` nor CI.
