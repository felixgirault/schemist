# 2. Snapshots, undo and URL persistence

- Status: accepted
- Date: 2026-10-24
- Issue:
  [#18](https://github.com/felixgirault/schemist/issues/18)

## Context

Issue #18 asks to save snapshots of the palette, to prevent data
loss on accidental refreshes and to build an undo feature. A
comment on the issue suggests decoupling the tree definition from
the derived data, with snapshots being a stack of definitions
whose topmost item is derived into colors and names.

### Current state

- Each `Node` (`src/lib/stores/nodes.svelte.ts`) holds its
  definition in `$state` fields (`token`, `isHidden`, `args`,
  `children`) and derives its data (`input`, `output`). The
  definition can already be extracted as plain data with
  `serializeTree`, and packed into a string with `pack`.
- The `preset` query parameter is read once on load and never
  updated. A refresh either yields a random palette, or reloads
  the shared link the user started from, silently dropping every
  edit made since.
- Node components are keyed by node id. Ids are generated at
  runtime and are not part of `PresetNode`, so rebuilding a tree
  from its serialized form remounts every node component and
  loses their UI state (open panels, focus, ongoing slider drag).

### Considerations on the proposal

- **The snapshot stack should not hold the live state.** If its
  topmost item were the edited definition, every keystroke or
  slider step would either push a snapshot or mutate the top of
  the stack. Keeping one live definition and recording frozen
  copies of it keeps both concerns simple.
- **Idle time makes a poor undo boundary.** Two quick unrelated
  edits would be merged into one step, and a slow slider drag
  split into several. Undo steps should follow user actions
  instead.
- **Components should not have to mark undo steps.** Calling
  `commit()` after every action, or listening to `change` events,
  scatters history concerns across the UI and is easy to forget.
  Steps can be told apart from the data alone, by comparing each
  state with the previous one.
- **Ids must be part of the definition**, so that restoring a
  snapshot keeps components mounted.

## Decision

### Model

- The tree definition is a plain object with stable ids:
  `{id, type, token, isHidden, args, children}` (a `PresetNode`
  with an `id`). It is the single source of truth.
- Colors and names are derived from it.

### Recording

An effect records a frozen copy of the definition
(`$state.snapshot`) on every change. Changes made in the same
tick (e.g. applying a preset) are batched by the effect, so they
form one change. Each change either starts a new undo step, or
merges into the current one:

- a change that only touches one arg of one node merges into the
  current step if the previous change touched that same arg less
  than 1 s ago, so that a slider drag or typing a color is one
  step;
- any other change starts a new step: adding, removing, hiding
  or renaming a node, applying a preset, or changing another arg.

Unrelated edits never merge, however quick. Two drags of the same
slider within a second do, and so do two quick Randomize clicks
on the same color, which is an acceptable imprecision.

A step whose changes lead back to its starting state (e.g. a
slider dragged back) is dropped. Identical consecutive snapshots
are ignored, which includes the change made by restoring a
snapshot on undo.

### Undo and redo

- `past` and `future` stacks of snapshots, capped at 100 entries.
- Undo restores the last snapshot of `past` into the live
  definition and pushes the current one to `future`. Redo does
  the opposite. Any new step clears `future`, and a restored
  state never merges with the changes that follow it.
- Snapshots keep node ids, so restoring one updates components in
  place instead of remounting them.
- Undo and redo buttons, and the `Ctrl`/`Cmd` + `Z` and
  `Ctrl`/`Cmd` + `Shift` + `Z` shortcuts. Shortcuts are ignored
  while a text field or the editable node name has the focus, so
  native text undo keeps working there.
- The stacks live in memory and are lost on reload.

### Persistence

- Every change replaces the URL with the permalink of the
  definition (`history.replaceState`, so the browser history is
  not polluted). A refresh restores the exact palette, since
  permalinks are lossless (ADR 1), and the address bar is always
  a valid share link. This happens 300 ms after the last change,
  so that slider drags don't rewrite the URL constantly.
- Every change also stores the packed definition in
  `localStorage`.
- On load, the palette comes from the `preset` parameter if any,
  else from `localStorage`, else it is a random color.
- UI state (open panels, combination filters, export settings) is
  not part of snapshots.

### Implementation steps

1. Sync the URL with the palette, and make Share copy the link.
   This alone fixes the data loss on refresh.
2. Undo and redo, with ids added to `serializeTree` and
   `parseTree`. Restoring a snapshot rebuilds the `Node` tree
   with the same ids.
3. Restore the last palette from `localStorage`.
4. Replace the `Node` class with the plain definition and a
   derived map of outputs, with tree operations as pure functions
   on the definition.

Steps 1 to 3 deliver the feature with the current `Node` class.
Step 4 completes the decoupling and can be decided on afterwards.

## Consequences

- Refreshing the page no longer loses work, and any URL in the
  address bar can be shared as is.
- URLs change while editing, and get long for large palettes
  (about 500 characters for the largest preset).
- Undo steps match what the user did, rather than when they
  paused.
- Until step 4, restoring a snapshot rebuilds the `Node` tree.
  Thanks to stable ids, components stay mounted, but it is more
  work than updating a plain definition.
- With step 4, every edit recomputes the outputs of the whole
  tree instead of the edited branch only. Trees are small (under
  100 nodes), but color naming is comparatively costly and should
  be cached by hex code.
- Combination filters reference node ids, which stay valid across
  undo and redo.
