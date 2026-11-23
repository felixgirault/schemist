# 18. The requirements without the grid

## Context

Since ADR 16, rules produce the pairs that matter, and the
requirements show each of them as a card with its status (ADR 17,
amended: Requirements is its own panel). The grid beside them
lists every ordered couple of colors, most of which no
requirement asks for. What it still does:

- Finding candidates: a rule's hover dims what misses its use. A
  color added to a role answers the same, its cards showing met
  or not met at once.
- Spotting a forgotten pair: the grid shows every couple, but not
  which ones matter; only rules know that.
- Declaring one-off pairs: a cell opens the card with the per-use
  buttons (ADR 15). The only job left to it.

## Decision

The grid goes. The page is two panels: **Palette** and
**Requirements**.

- **+ Pair**, in the One-off pairs section, declares a one-off
  pair: a foreground color, a background color (names with
  swatches, as the role picker) and a use. **Override** on a
  rule's card stays the way to replace a rule's targets on one
  pair.
- **Simulate** and **Grayscale** move to the Requirements header.
- Removed with the grid: its role groups (ADR 17), the rule's
  outline and dimming on hover (ADR 16, 17), the pair card opened
  from a cell, and their state (`openPairIds`, `ruleId`,
  `outlinedCells`, `dimmedCells`, `groups`, …).
- Nothing saved changes.

## Alternatives

- **Keeping the grid for exploring**: it lists arbitrary pairs; a
  color added to a role shows its cards at once.
- **Suggestions**: per rule, the colors that would pass if added
  to a role. Targeted where the grid is arbitrary; later, if
  browsing turns out to matter.

## Plan

1. **+ Pair** in One-off pairs, so that nothing depends on the
   grid.
2. Remove the grid and what only it uses; move the toggles.

## Later

- Suggestions per rule.
