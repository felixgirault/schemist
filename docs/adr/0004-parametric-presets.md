# 4. Parametric presets

- Status: accepted
- Date: 2026-10-25

## Context

Applying a preset inserts a subtree of preconfigured nodes. Once
inserted, these nodes are independent: changing the number of
steps of a Scale, or the range it spans, means editing, adding or
removing nodes one by one.

The goal is parametric presets: presets that appear as a single
node, whose parameters tune all of their colors at once.

### Current state

| Concern                                        | State                                                      | Impact                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `Node` (`src/lib/stores/nodes.svelte.ts`)      | One node, one `output` color                               | A preset needs several outputs                            |
| `collectOutputs`                               | Keys every visible color by node id                        | Generated colors need ids of their own                    |
| Combinations, exports, filters                 | Read `palette.outputs`, filters reference ids              | Follow generated colors once they are in `outputs`        |
| Packing (`src/lib/packing/v1.ts`)              | Encodes a type code and args, via `defs[type].params`      | A preset registered as a type needs no format change      |
| History (`changedArg` in `src/lib/presets.ts`) | One arg change is merged into the current step             | Dragging a preset slider is one undo step, as is          |
| `presetSamples` (`src/lib/samples.ts`)         | Evaluates a `PresetNode[]` into colors, without `Node`s    | Can compute generated colors, once it also produces names |
| `Preset` (`src/lib/definitions/presets/`)      | `{label, description, nodes}`, listed by the child picker  | Can be replaced by the parametric definitions themselves  |
| `NodeOptions.svelte`                           | Range gradients come from `paramSamples`, i.e. `def.apply` | A preset's `apply` gives no meaningful gradient           |

Scale, Rainbow and Harmonies are not referenced by other presets,
so converting them affects nothing else.

### Options

1. **Multi-output node types**: a type whose `apply` returns a
   list of colors, written as a function. Simple, but every
   preset reimplements in code what presets already describe as
   trees, and there is no direct way back to plain nodes.
2. **Bound subtrees**: insert real nodes whose args are
   expressions of the preset's params. The nodes stay editable,
   but expressions, their editing and their packing are a large
   addition, and it is unclear what happens when a bound node is
   edited by hand.
3. **Template presets**: a type whose params feed a
   `build(args) → PresetNode[]` function. The tree it returns is
   derived, never stored, and evaluated with the existing node
   types. Expanding it into plain nodes is `parseTree` on that
   same tree.

## Decision

Option 3.

### Model

- A `PresetDef` is a `NodeDef` with a
  `build(args) → PresetNode[]` function. Its `apply` returns the
  input unchanged. Presets are registered in `defs`, so packing,
  storage and history handle them as any other node. They are not
  listed in `defList`.
- A preset node has no stored children. Its generated colors are
  derived: the tree returned by `build` is evaluated on the
  node's input, honoring the `isHidden` and tokens of the
  template nodes. `$` in their tokens refers to the preset's
  name, which is the preset's token, or the parent's name when
  the token is empty (as `apply` leaves the color unchanged).
- `presetSamples` becomes an evaluator returning
  `[id, color, name]` for each node of a `PresetNode[]`, used by
  both picker samples and presets. Ids are the preset's id
  followed by the node's index in depth-first order, e.g.
  `n12.3`.
- `collectOutputs` emits the visible generated colors of a preset
  instead of the preset itself. Hiding the preset hides all of
  them.
- Children found under a preset in a permalink or in storage are
  dropped by `parseTree`.

### Expanding

- An "Expand" action replaces the preset with
  `parseTree(build(args))`, at the preset's position among its
  siblings, in one tick so that history records a single step.
- Expanded nodes reuse the generated ids (`n12.3`). Ids stay
  unique since the preset is removed, and combination filters on
  generated colors carry over.
- This is the escape hatch for anything a preset's params don't
  cover, e.g. adding States under one step of a Scale. Generated
  colors can't have children.

### First presets

Each replaces the static preset of the same name. Old permalinks
store plain nodes, so they are unaffected.

| Preset    | Params (min–max, default)                       | Builds                                                                           |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Scale     | steps 1–10 (9)                                  | `steps` Lightness nodes of `round(100 × i / (steps + 1))`%, for `i` in `1…steps` |
| Rainbow   | count 1–23 (11)                                 | `count` Hue nodes of `round(360 × i / (count + 1))`°, for `i` in `1…count`       |
| Harmonies | tetrad, triad, split complementary (all `true`) | The enabled harmonies, in today's order: tetrad, triad, split, triad, tetrad     |
| Neutral   | saturation % 0–100 (5)                          | Today's tree, a hidden Saturation of `saturation` with five Lightness levels     |

Defaults reproduce today's presets, except for Scale, which
leaves out the black and white ends: they are the same whatever
the color, so they add nothing to a palette. As they are always
left out, Scale has no `from` and `to` params, only a number of
steps between them. Rainbow uses Hue nodes rather than Analogous
ones, whose 30° steps can't spread an arbitrary count. Harmonies
is the first type with boolean params. Neutral is also part of
the Schemist theme, which therefore embeds a parametric preset.

Type codes must not collide with existing ones (`scl` is taken by
Left split complementary): `lsc`, `rnb`, `hrm` and `ntl`.

### Remaining presets

Every other preset becomes parametric too, so that any preset is
inserted as a single node:

| Preset                    | Params                                                |
| ------------------------- | ----------------------------------------------------- |
| States                    | amount % 0–50 (10), shared by both colors             |
| Schemist theme            | secondary, tertiary, semantics, neutrals (all `true`) |
| Split complementary       | —                                                     |
| Triad, Tetrad             | —                                                     |
| Semantic colors and pairs | —                                                     |
| Material tones, neutral   | — (light and dark stay separate presets)              |
| Material light, dark      | —                                                     |

Presets without params still gather their colors into one node,
which can be removed, hidden or expanded at once.

Since every preset is parametric, the preset modules are the
definitions themselves: `src/lib/definitions/presets/` holds
them, its `index.ts` lists them for the picker, and `defs`
registers them from that list.

Presets that reuse other presets (Material, Schemist theme) embed
them as preset nodes rather than plain trees: expanding them
yields the inner presets, which can be expanded in turn, one
level at a time. Their colors get ids such as `n12.1.0`.
Harmonies interleaves the colors of three pairs, so it uses the
plain nodes of those presets instead.

A snapshot test records the colors and names of every preset, and
was recorded before the conversion: parametric presets reproduce
the static ones exactly (Scale aside).

### Interface

- Presets are listed in the child picker as today. Their previews
  use the evaluator, and picking one adds a node of its type.
- A preset node shows a segmented bar of its generated colors
  instead of a single color, its label and an `argsLabel` (e.g.
  "11 steps"). Its name is editable, and is the `$` of its
  colors.
- Actions: Remove, Visibility and Options as usual. Swap and Add
  are disabled (and hidden), which keeps buttons aligned. Info
  lists the name and hex of each generated color. A new "Expand"
  action, titled "Turn into separate colors", takes the place of
  Swap.
- Range fields of a preset have no gradient preview in this first
  version.

### Implementation steps

1. The evaluator, replacing `presetSamples`, with tests on ids,
   names and hidden nodes.
2. `PresetDef`, generated outputs on `Node` and in
   `collectOutputs`, with tests: outputs follow args, hiding the
   preset hides its colors, packing round-trips a preset.
3. The parametric Scale, Rainbow and Harmonies, replacing the
   static presets, with tests that defaults match them (without
   the ends of the scale).
4. Expanding, with tests: position, ids, one undo step.
5. The preset node interface and the Expand action, with a new
   icon.
6. Update `SPEC.md` (§5 for presets and their outputs, §6 for the
   new types and boolean params, §7 for the converted presets,
   §11.2 for the actions).

## Consequences

- Scales, rainbows and harmonies can be tuned at once, and a
  slider drag is one undo step.
- Permalinks, storage and history need no format change, and a
  preset packs into a single record, which shortens links.
- Generated colors can't be customized one by one without
  expanding, which is one way: expanded nodes can't be turned
  back into a preset.
- Combination filters on a generated color are lost when its
  index disappears, e.g. when lowering a Scale's step count.
- Expanding a Rainbow yields Hue nodes, where the old preset
  inserted Analogous ones.
- ADR 2 step 4 (a plain definition with derived outputs) fits
  this model: a preset is a definition whose outputs are derived
  from `build`, with no extra state.
- More presets can be added with a `build` function, reusing
  existing node types.
