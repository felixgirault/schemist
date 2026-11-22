# 16. Roles and rules

## Context

Pairs (ADR 13) are what gets checked: this color on that one, at
these targets. They are the wrong thing to write. A surface with
a body text and a dimmed one is two pairs; five surfaces and four
kinds of content are twenty, declared one by one, and a new
surface starts with none. The intent, "all text on all surfaces",
appears nowhere.

Design systems describe roles and derive the pairs: Material's
`on-surface` and `on-surface-variant` go on `surface`, Radix
gives each scale step a job (research doc, from the sources it
cites). Both rely on the palette's shape: names or steps.

Schemist assumes nothing about the palette's shape: not its tree
(parents, nesting), not its names. Groups must be explicit.

Also missing: the result. The tree shows inputs and the grid
checks, but nothing shows the palette as it will be used, and
exports carry no pairs.

## Goals

- Declare requirements as intent, so that a new color joins them
  in one action.
- No assumption on the tree or the names.
- Pairs stay the unit checked, listed and exported; everything
  built on them keeps working.
- Links stay in sync by code: roles and rules hold color ids, as
  pairs do (ADR 13, amended).
- One screen, little clutter, explicit about where each
  requirement comes from.

## Decision

### Model

- **A role** is a named list of colors picked by the user
  ("Surfaces", "Text", "Chart series"). Free names; a color can
  have several roles. Members are color ids, so roles survive
  renames, moves and preset expansion. A role stays until
  deleted, used by a rule or not.
- **A rule** is `fg role on bg role, for a use` (ADR 14), or a
  role among itself.
- **Pairs are expanded from rules**: every color of the fg role
  on every color of the bg role, skipping a color on itself. A
  rule from a role to itself gives unordered pairs (a difference
  ignores order, ADR 13), so three chart colors are three pairs.
- **One-off pairs stay**: today's pairs, declared from the card.
- **Overlaps**: rules covering the same couple combine, the
  strictest target winning per metric. A one-off pair on a couple
  replaces what the rules give it, which is how an exception is
  written. No exclusion: a color a rule shouldn't cover stays out
  of the role, or gets its own.
- **One expansion**: `expandRules(roles, rules, pairs)` in
  `core/pairs.ts` is the only place that turns rules into pairs,
  each with its sources (rules, one-off), as `resolvePairs` is
  for names.

"Role" had another meaning in ADR 13's later list (default
targets per kind of color); that is uses now, and ADR 13 says so.

### Format

The root gets `roles` and `rules` next to `pairs`, colors named
as in `pairs`, ids in the app and in undo snapshots (ADR 9).
Permalinks carry them.

### UI

The combinations panel keeps its filters and the grid. The side
column (ADR 14, 15) becomes **Requirements**:

```
▾ Muted text  on  Surfaces              Secondary text
    Muted text  ● text/muted  [+]
    Surfaces    ● bg/page  ● bg/card  ● bg/raised  [+]
                (used by 2 rules)
    ⚠ text/muted on bg/raised   Lc 54 / 60        [open]
▸ Text  on  Surfaces                    Body text
▸ Chart series  among themselves        Categories
  One-off pairs
+ Rule:  [role ▾] on [role ▾] for [use ▾]
```

- Rules are collapsed to one line: roles, use, and ✓ or ⚠. The
  pass count stays in the panel heading, for the whole grid.
- Expanding a rule (a disclosure button) shows its roles as chips
  and its failing pairs. A chip is removed with a labelled
  button; `[+]` opens a picker listing names with swatches, with
  a search field. A role being shared, the chip row says how many
  rules use it.
- The role menus of **+ Rule** list every role, unused ones
  included, and "New role…".
- Hovering or focusing a rule outlines exactly its cells in the
  grid, whatever their shape. The **Look at** filter keeps
  dimming; outlines and dimming never mean the same thing.
- Rows and columns are sorted by role as a reading aid, colors
  without a role last; a color with several roles appears once,
  its roles in its header's tooltip. No block is drawn.
- The card names every source of a pair's targets ("Secondary
  text, from Muted text on Surfaces"), and has **Override for
  this pair**, which declares a one-off pair from the rule's
  targets. The per-use buttons (ADR 15) declare one-off pairs as
  before.

### Result

A **Result** mode, next to Grid, with the Requirements column
beside it, shows each rule as its use, with the selected
simulations:

- text uses: each surface with a paragraph per text color;
- Large text and UI: a stroke and an outline on each surface;
- Categories: the colors as swatches and bars side by side.

One plain specimen per use; components mixing several rules (a
button: text on an accent on a surface) come later.

### Exports

Design tokens list each token's roles and the pairs it is in
under `$extensions` (DTCG keeps extension data tools don't know);
CSS and Sass get a comment per variable
(`/* body text on --bg-page */`); the table gets the
requirements.

### CLI and agents

`eval` expands the rules and reports each pair with its sources.
AGENTS.md asks agents to declare roles and rules. The evals'
`expect.json` stays as pairs, compared with the expanded set.

### Deploy

Roles and rules are part of version 2, which stays undeployed
until they are built (ADR 5): one format, defined once. Deploying
version 2 with pairs first, then roles and rules as version 3,
would ship sooner but keep one more reader.

## Alternatives

- **Roles on colors, one each, with uses from pairs of roles**
  (Material): the most automatic, but a fixed set doesn't fit
  every system, and editable roles are rules again.
- **Rules over tree parents or name patterns**: no extra input,
  but assumes the palette's shape, and breaks on a move or a
  rename.
- **Pairs grouped by surface**: quicker to enter, still one by
  one, and a new surface starts empty.
- **Exclusions in rules**: a pair with no target, a new kind of
  data, for cases a role split covers.
- **Rules drawn as blocks in the grid**: only works when a role's
  colors are contiguous on both axes, which several roles per
  color break.
- **Roles edited in their own section**: more explicit, one more
  list; roles are edited where rules use them.
- **Result as a tab in the side column**: too narrow for
  specimens.
- **Read-only role tags in the tree**: the panel and the headers
  already show membership.

## Plan

1. Core and format: roles, rules, `expandRules` with sources and
   overlaps, validation, packing; tests. CLI `eval` and
   AGENTS.md. Undo snapshots.
2. Requirements: rules in the side column, role chips and picker,
   **+ Rule**, the card's sources and override, rule outlines and
   sorting in the grid.
3. Result mode.
4. Pairs and roles in exports.

Step 2 is the uncertain one (does a rule with a ten-color role
and its failing pairs fit in 32ch?): a rough version first,
judged by hand before the rest.

## Later

- Exclusions, if a case needs them.
- Components mixing rules in the Result.
- Read-only role tags in the tree.
