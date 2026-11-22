# 14. Grid checks by use, and a docked pair card

## Context

The Grid mode (`feature-unified-grid`) is meant to make the
Contrast and Difference modes unneeded: every ordered pair is a
cell, dimmed when it misses the brush, and a click declares the
brush as a target of the pair (ADR 13).

Two parts of it don't hold up:

- The brush is either Contrast (WCAG 2 or APCA, one minimum) or
  Difference (one minimum). A real requirement mixes them: body
  text needs WCAG 2 4.5 and APCA Lc 75 at once (APCA "In a
  Nutshell"). Declaring both takes two passes, switching the brush
  in between. The pair format already holds every target at once
  (`wcag2`, `apca`, `difference`); only the brush is split.
- The pair card is a popover anchored to its cell. It covers
  cells next to the one open, and moves on every click.

## Decision

### Checks by use

The brush picks a use instead of a metric. A use is a named set
of targets:

| Use | Targets |
|---|---|
| Body text | WCAG 2 4.5, APCA 75 |
| Large text and UI (borders, focus rings, icons) | WCAG 2 3 |
| Categories (chart series, tags) | difference 10 |
| Custom | any of the three, typed in |

- The uses are data in `core/pairs.ts`, next to `targetNames`, so
  that the CLI and agent guidance can name the same values later.
- A cell lights when the pair meets every target of the use, in
  the worst case of the selected simulations (`checkPair`, as
  today).
- A click on a cell sets every target of the use on the pair,
  keeping its other targets; a second click removes them if the
  pair has them at those values (today's `toggleBrush`, for
  several targets).
- Custom shows a minimum field per metric, empty meaning not
  checked. It starts from the use picked last.
- In Grid mode, the Check toggle, the contrast type and the
  minimum contrast level go away; the Contrast and Difference
  modes keep their own filters.
- The card shows each target of the use, as is and per
  simulation, met or not.

No format change: pairs are stored as before, and permalinks are
unaffected.

AGENTS.md and the README say "apca 60 for body text"; they move
to 75 in the same step, so that the app and the guidance agree.

### Docked card

The card leaves the popover for a column beside the grid:

- With a pair open, the panel is two columns: the grid, scrolling
  on its own, and the card, sticky at the top. With none, the
  grid has the whole width.
- When the panel is too narrow for both (a container query), the
  card goes under the grid.
- Focus stays on the cell, so that moving to the next cell takes
  one key; the card is a labelled region. Esc, Close or the open
  cell close it.
- The popover code goes: `showPopover`, the anchor CSS, the
  invoker kept for focus.

## Alternatives

- One minimum per metric, each switched on or off: today's
  filters side by side. Rejected: the user has to know which
  targets go together, and the brush has no name to declare.
- One score merging contrast and difference. Rejected: they
  measure different things (lightness, overall distance), the
  score would hide which one fails, and it couldn't be a target.
- The card replacing the filters column. Rejected: filters and
  card are used together, the brush especially.
- The card in a row opened inside the table. Rejected: the grid
  moves under the pointer, and a card doesn't fit a table row.

## Plan

1. Dock the card beside the grid, removing the popover.
2. Add the uses to the core, make the brush a use with Custom,
   show every target of the use in the card, and move the
   guidance to APCA 75.

## Later

- Removing the Contrast and Difference modes, once the grid
  covers what they give (the contrast cards and their preview,
  the unordered pairs of the difference matrix).
- Uses saved with the palette, if the built-in ones don't fit.
- An `eval --use` option in the CLI.
