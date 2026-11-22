# 13. Declared pairs

## Context

A usable palette is its colors plus the pairs that must work
together: body text on the page background, a focus ring on a
surface, chart series against each other. Each pair has its own
requirement: text needs 4.5:1 or Lc 60, borders 3:1, chart series
a difference of 10.

Schemist knows the colors, not the pairs:

- The app lists every combination (`n × (n − 1)`), or every pair
  of a set in the difference matrix (ADR 12). Which ones matter,
  and against which target, is left to the user's memory.
- Agents pass the pairs to `eval --pair` on every run, and the
  evals spell them out in `expect.json`, as
  `{fg, bg, wcag2?, apca?, difference?}` (`PairExpect`). The
  pairs live outside the palette.
- The `feature-combination-grid` branch (WIP, based on an older
  `main`) let users tick bg × fg pairs in a grid, in memory only,
  with one global minimum.

## Goals

- Pairs are part of the palette: saved in the permalink and the
  tree JSON, read by the app and the CLI alike.
- Each pair has its own targets, any of WCAG 2, APCA and
  difference.
- A pair stays attached to its two colors through renames, moves
  and removals, enforced by the code rather than by care.
- Existing permalinks keep opening (AGENTS.md).

## Decision

### Format

The root node gets an optional `pairs`, in the tree JSON and
`PresetNode`:

```json
{
	"type": "clr",
	"args": {"color": "#ffffff"},
	"token": "bg/page",
	"children": ["…"],
	"pairs": [
		{
			"fg": "text/body",
			"bg": "bg/page",
			"wcag2": 4.5,
			"apca": 60
		},
		{"fg": "chart/1", "bg": "chart/2", "difference": 10}
	]
}
```

- A pair names its two colors, as `--pair` and `expect.json` do,
  and has at least one target. Targets are free numbers; no
  defaults for now.
- Pairs are ordered (`fg` on `bg`), since APCA is. A difference
  target ignores the order. A tree has at most one pair per
  ordered couple; `a/b` and `b/a` are two pairs.
- `pairs` is accepted on the root only; elsewhere it is an
  unknown key, like today.
- Old trees without `pairs` are unchanged.

### One resolver

`resolvePairs(pairs, colors)` (`core/pairs.ts`) maps names to
colors, and is the only place that does. It searches every color
of the tree, hidden ones included (`evaluate` leaves those out,
so the resolver gets its own list). It fails on an unknown name,
a name shared by several colors, a color paired with itself and a
pair without a target, with the messages `--pair` gives today
(`--pair` then uses it too). The CLI, the permalink reader and
the app all go through it.

The CLI is strict: a tree with an invalid pair fails, like any
invalid tree. The app is lenient on load: a permalink pair that
does not resolve is dropped and logged, and the rest of the
palette loads, since an invalid link otherwise falls back to a
random color (SPEC §10.1) and would lose the palette.

### In the app: nodes, not names

`palette.pairs` holds
`{fg: Node, bg: Node, wcag2?, apca?, difference?}`. The type has
no name, so a rename cannot leave a pair behind: names are
computed from the nodes when the palette is saved, and resolved
into nodes when it is loaded.

- **Rename**, own or a parent's (`On $`): nothing to update.
- **Move**: the nodes are the same objects.
- **Removal**: `palette.pairs` is derived from the stored pairs,
  keeping those whose two nodes are still in the tree. No removal
  code has to remember the pairs; saving drops the others from
  the stored list.
- **Hidden color**: the pair is kept and shown as hidden, not
  checked, like hidden colors in combinations.
- **Duplicate names**: in memory the pair is still exact. Saving
  needs unique names, so the pair is shown with a notice naming
  the colors to rename, like the token export conflicts (ADR 2),
  and is left out of the permalink until then. Nothing else is
  dropped.

A round-trip test (serialize, pack, unpack, parse) after renames,
parent renames, moves, removals and hides checks that every
saveable pair comes back on the same colors.

### Permalink

Packing version `2` adds the pairs after the nodes:

```
2@<root>@<nodes>@<pairs>@<dictionary>
```

A pair record is the dictionary index of its `fg` and `bg` names,
then its targets as (dictionary index of the target name, value).
Paired colors usually have tokens, already in the dictionary, so
a name mostly costs an index. Packing stays structural: it does
not evaluate colors, and the resolver checks the names on load.
Version `1` still unpacks, with no pairs. New links are always
version `2`.

### CLI

- `eval`'s permalink carries the pairs (version `2`).
- `eval` on a tree with pairs reports them by default:
  `pairs: [{fg, bg, targets, levels, pass}]`, each target checked
  in the worst case of `--blindness`. `--pair` keeps working on
  any pair and replaces the declared ones for that run.
- Tree validation reports resolver errors with their JSON path
  (`pairs[2].fg: unknown color "text/bdy"`).
- README agent loop: declare the pairs in the tree, then `eval`.

### UI

A **Pairs** mode in the Combinations panel, next to Contrast and
Difference:

- A grid with backgrounds as rows and foregrounds as columns,
  built from the difference matrix (ADR 12): compact cells, swatch
  headers, sticky row headers, a details card.
- Every cell is drawn as its pair, "Aa" in the foreground on the
  background, so the grid is a map of the palette before any pair
  is declared (empty cells looked like nothing to do). A declared
  cell gets a border and a corner badge in the panel's colors, a
  check or a warning icon with a dashed border, showing whether
  the pair meets all its targets (worst case of the selected
  simulations). Marks drawn in the pair's own colors would vanish
  on the pairs that fail.
- The card shows each target's field and measured levels, per
  simulation, and a **Remove pair** button.
- The heading counts passing pairs / declared pairs, hidden pairs
  left out of both.
- **The filters are a brush.** A **Check** switch picks
  **Contrast** (with **Contrast type** and **Minimum contrast
  level**) or **Difference** (with **Minimum difference**), the
  filters of the other modes. Undeclared cells are lit when the
  pair passes the brush in the worst case of the selected
  simulations, dimmed otherwise, so the grid shows what could
  pass before anything is declared.
- **Activating a cell toggles the brush's target on its pair**:
  it adds `wcag2`, `apca` or `difference` with the current
  minimum, or removes it when the pair has it already (the pair
  goes with its last target), and opens the card for fine edits.
  With a minimum of 0 (KO) there is no target to add: cells only
  open the card, and a hint asks for a minimum. One brush at a
  time, so that declaring text pairs does not also give them the
  default difference target.
- Other filters: **Colors** restricts the grid's rows and
  columns, **Color blindness simulation** and **Luminosity
  analysis** work as in the other modes.

Pairs keep their own targets: the brush only sets them. A single
global constraint was rejected, as a palette needs several (7:1
for body text, 3:1 for chart series on the page, a difference of
10 between series in the dashboard eval case), and filters are
not saved, so pairs would lose their meaning on reload and in the
CLI.

Contrast and Difference modes stay, to explore before declaring.

## Alternatives rejected

- **Pairs by tree position in the JSON**: robust to duplicate
  names, but agents would have to count nodes, and every edit
  would renumber. Positions are used only inside the packed form,
  which nobody writes by hand.
- **Names stored in the app's pairs**: every rename, including a
  parent's, would need an update, which is what goes out of sync.
- **Persistent node ids in the format**: exact, but a larger
  format change, and ids mean nothing to agents.
- **A `{tree, pairs}` wrapper document**: breaks every existing
  tree file, while a root field breaks none.
- **Selection in memory only** (`feature-combination-grid`): lost
  on reload, and one tick cannot say what the pair is for.
- **Roles with default targets**: deferred until free targets
  show which values repeat.

## Later

- Default targets or roles (text, border, distinct).
- Presets declaring their pairs (`semanticPairs`: each color and
  its `On $` child).
- Eval cases checking the tree's own pairs instead of
  `expect.json`.
- Pairs in exports (a comment, or token metadata).

## Plan

Built on `feature-difference-view`, which is not merged yet.

1. Core: `PresetNode.pairs`, `resolvePairs`, and the check of a
   pair against its targets, with tests; SPEC §9.
2. CLI: tree validation, `eval` reporting declared pairs,
   `--pair` through the resolver; README and SPEC §14.
3. Packing v2 with pairs, v1 still read; round-trip tests; SPEC
   §10.
4. Store: `palette.pairs` of nodes, serialization through the
   resolver, the duplicate-name notice; the round-trip test of
   edits; SPEC §8.
5. UI: Pairs mode, grid, card editor; SPEC §11.

## Consequences

- Permalinks gain a version; v1 links keep working.
- Tree files gain an optional root field; existing files stay
  valid.
- A pair on two same-named colors cannot be saved until one is
  renamed.
