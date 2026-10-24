# 3. Changing the type of a color

- Status: accepted
- Date: 2026-10-24
- Issue:
  [#13](https://github.com/felixgirault/schemist/issues/13)

## Context

Issue #13 asks to swap a block for another, to change a color
that has children, say from "lightness" to "highlight", without
deleting it and recreating all of its children. "Swapping" means
changing the type of a node in place, not moving nodes around the
tree.

Today, the only way is to remove the node, which removes its
subtree, add a node of the new type, and rebuild the children by
hand.

### Current state

| Concern                                        | State                                                 | Impact                                            |
| ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `Node` (`src/lib/stores/nodes.svelte.ts`)      | `def` is `readonly`, set by the constructor           | The only blocker, it must become reactive         |
| Output                                         | Derived from `def.apply(input, args)`                 | Follows a new `def` by itself                     |
| History (`changedArg` in `src/lib/presets.ts`) | A change of `type` starts a new undo step             | A swap is one undo step, as is                    |
| Permalinks and storage                         | Store each node's `type`                              | No format change                                  |
| Combination filters                            | Reference node ids                                    | Stay valid if the id is kept                      |
| `Node.svelte`, `NodeOptions.svelte`            | Keyed by node id, read `def` through `$derived(node)` | Stay mounted and update, open panels are kept     |
| `ChildPicker.svelte`                           | Previews types on `node.output[0]`                    | A swap must preview on the parent's color instead |

### Arguments

Node types share parameter names with different meanings and
ranges. `amount` alone is used by five of them:

| Types                 | Meaning of `amount`  | Range |
| --------------------- | -------------------- | ----- |
| Lightness, Saturation | Absolute value       | 0–100 |
| Contrasting           | Strength of contrast | 0–100 |
| Highlight, Shadow     | Relative lightness   | 0–50  |

Keeping arguments by name only would give unexpected results: a
lightness of 50% would become the strongest possible highlight.
Resetting every argument would lose settings on the most likely
swaps, between Highlight and Shadow, or Lightness and Saturation,
whose parameters are identical.

### Root node

The root is a custom color in practice, and is the only node
whose input is the default white. Changing it to a relative type
would derive the whole palette from white, which is never useful.

## Decision

### Model

- `Node.def` becomes reactive state.
- A `setType(type)` method changes the definition and remaps the
  arguments, in the same tick so that history records a single
  change. The id, token, visibility and children are kept.
- An argument is kept if the new type has a parameter with the
  same name, kind and range (`min` and `max` for ranges).
  Otherwise, it takes the new type's default.

Previous arguments are not remembered per type, so swapping back
and forth resets the arguments that were not kept. This can be
added later, in memory only, if it proves useful.

### Interface

- A new action button, titled "Change this color's type", sits in
  `NodeActions` just before "Add matching colors". Like "Remove",
  it is disabled (and hidden) on the root, which keeps the
  buttons aligned across nodes.
- It opens the child picker in a replace mode, titled "Change
  color type":
   - single colors only, as presets can't replace a single node;
   - samples are computed from the parent's color, the input of
     the node, rather than from its output;
   - the current type is marked as selected.
- `ChildPicker` takes the color to preview on as a prop, instead
  of reading it from the node, and an option to hide presets and
  mark a type.

### Implementation steps

1. `Node.setType` and argument remapping, with tests: the id,
   children and token are kept, arguments are kept or reset as
   described, and Highlight ↔ Shadow keeps all of them.
2. A history test: a swap is one undo step, and survives packing
   and unpacking.
3. The replace mode of the child picker, and the action button,
   with a new icon.
4. Update `SPEC.md` (§5.1 for `setType`, §11.2 for the action,
   §11.4 for the replace mode).

## Consequences

- A color can change type without losing its subtree, in one
  undoable step.
- Permalinks, storage, history and combination filters need no
  change.
- Arguments that don't match are reset, which can surprise users
  swapping between types whose parameters differ (e.g. Lightness
  to Highlight).
- The root can't be swapped from the interface, though permalinks
  can still define a root of any type.
- ADR 2 plans to replace the `Node` class with a plain definition
  (step 4). `setType` then becomes a pure function changing the
  `type` and `args` of a node definition, with the same rules.
