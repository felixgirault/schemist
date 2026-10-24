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
  the stack. Keeping one live definition and pushing frozen
  copies of it at commit points keeps both concerns simple.
- **Idle time makes a poor undo boundary.** Two quick unrelated
  edits would be merged into one step, and a slow slider drag
  split into several. Commits should follow user actions instead.
- **Ids must be part of the definition**, so that restoring a
  snapshot keeps components mounted.

## Decision

### Model

- The tree definition is a plain object with stable ids:
  `{id, type, token, isHidden, args, children}` (a `PresetNode`
  with an `id`). It is the single source of truth.
- Colors and names are derived from it.

### Commits

A commit freezes the current definition (`$state.snapshot`) and
pushes it to the undo stack. Commits happen:

- immediately after discrete actions: adding, removing or hiding
  a node, applying a preset, renaming a node;
- on the `change` event of continuous inputs (sliders, color
  fields), i.e. once the user releases the slider or commits the
  value;
- after 500 ms of inactivity, as a fallback for edits that have
  no natural end.

Consecutive identical snapshots (same packed string) are not
pushed.

### Undo and redo

- `past` and `future` stacks of snapshots, capped at 100 entries.
- Undo commits any pending edit, then restores the last snapshot
  of `past` into the live definition and pushes the current one
  to `future`. Redo does the opposite. Any new commit clears
  `future`.
- Snapshots keep node ids, so restoring one updates components in
  place instead of remounting them.
- Undo and redo buttons, and the `Ctrl`/`Cmd` + `Z` and
  `Ctrl`/`Cmd` + `Shift` + `Z` shortcuts. Shortcuts are ignored
  while a text field or the editable node name has the focus, so
  native text undo keeps working there.
- The stacks live in memory and are lost on reload.

### Persistence

- Every commit replaces the URL with the permalink of the
  committed definition (`history.replaceState`, so the browser
  history is not polluted). A refresh restores the exact palette,
  since permalinks are lossless (ADR 1), and the address bar is
  always a valid share link.
- Every commit also stores the packed definition in
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
