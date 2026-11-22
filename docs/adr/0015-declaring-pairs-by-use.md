# 15. Declaring pairs by use, with a list of requirements

## Context

ADR 14 made the grid's check a use (Body text, Large text and UI,
Categories, Custom). Declaring a pair still feels obscure:

- It takes three places: pick a use in the filters, open a cell,
  press **Require <use>** in its card.
- The use filter is both what the grid shows and what Require
  declares, so looking at another use changes what the button
  does.
- Dimming (misses the use looked at) and the declared marks
  (border, badge, the pair's own targets) look alike, and a
  declared pair doesn't say which use it is for.
- What has been declared is a count in a hint; there is no list.

## Decision

### The filter is a lens only

**Check** picks the use the grid is dimmed by, and nothing else.
No action depends on it.

### The card declares, one button per use

The card gets a button per built-in use, each toggling that use's
targets on the pair: **+ Body text**, or **Body text ✓** with a
remove action when the pair has them. Custom stays the number
fields the card already has. `toggleUse(fg, bg, use)` takes the
use instead of reading the filter.

### A pair's uses are inferred

A pair is for every use whose targets it holds at those values;
targets left over are Custom. `usesOf(pair)` in `core/pairs.ts`
computes them. Nothing new is stored: pairs keep their targets,
and permalinks don't change.

The cell's tooltip and accessible name, and the card, name the
pair's uses.

### A list of requirements beside the grid

With no pair open, the column the card docks in (ADR 14) holds
the requirements: the declared pairs grouped by use (Custom
last), each with its colors and met or not. Activating one opens
its card; Close comes back to the list. Pairs with a hidden color
are listed last as not checked, replacing the list under the
grid. The column then is always there; under the grid when the
panel is narrow, as the card.

## Alternatives

- Declaring with a click on the cell when a use is picked: fast,
  but a stray click declares, and the cell then needs a second
  gesture to open its card.
- Rows and columns by role (surfaces, content), declaring a use
  on a whole block: closer to how designers work, but a format
  change and the largest step. Kept for later, on top of this.
- Storing the use on the pair: names it exactly, but a format
  change, and a pair with typed targets would need one anyway.

## Plan

1. `usesOf` in the core; the card's buttons per use; `toggleUse`
   taking a use; the uses in tooltips and names.
2. The requirements list in the side column.

## Later

- Rows and columns by role, a use declared on a block.
