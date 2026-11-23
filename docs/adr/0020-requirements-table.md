# 20. Requirements as a table of variants

## Context

Since ADR 19, each pair is checked in every variant, but the
Requirements panel draws the cards of the selected variant only.
The others show as a rule's status ("not met in Dark") and a line
on the card; seeing a pair in Dark means switching to it, and
seeing it under a simulation means a strip per simulation under
the card. Nothing shows every variant and simulation of a pair at
once.

Also from the walkthrough of 23 November: a one-off pair's fields
and buttons are drawn in the pair's colors, unreadable on the
pairs that fail, the ones that need them.

## Decision

Each rule, and each use in One-off pairs, lists its pairs as a
table: a row group per pair, a column per variant, a row per
selected simulation.

```
on Surfaces · Body text ⚠
                     Light               Dark
Text & Page          [AAA 15.8 met]      [AA 5.1 · APCA 61 ✗]
  deuteranomaly      [AAA 15.1 met]      [AA 4.1 ✗]
  protanomaly        [AAA 15.4 met]      [AA 4.9 · APCA 60 ✗]
  [Override]
Muted & Page         [AAA 9.2 met]       [AAA 8.0 met]
  …
```

- **Always the table**: a palette without variants has one
  column, and without simulations a pair is one row. One layout,
  compact cells, replacing the card grid.
- **A cell** is one line, the pair drawn in that variant's
  colors, under the row's simulation if any: each target's grade
  and level, then ✓ or ✗ ("met" or "not met" as text), as in the
  sketch; not a card (amended after the first build, which drew
  cards in cells). A failing cell is marked by more than color.
  Difference pairs show their two colors as a small swatch pair,
  in the panel's colors.
- **The row header** holds the pair's names and its actions, in
  the panel's colors: **Override** on a rule's pair, the target
  fields and **Remove pair** on a one-off pair. Their names don't
  change ("Override Grey on White").
- **Preview** is a button in each cell of the normal row: it
  themes the app with the pair in that cell's variant. The
  preview state holds the variant with the pair, and `previewed`
  reads that variant's colors (`variantColors`), not the selected
  one's; the preview stops if its variant is deleted.
- **Markup**: a `<table>`, pair names as row headers and variant
  names (then simulation names) as column and row headers with
  `scope`, so that a screen reader names each cell ("Dark,
  deuteranomaly").
- **Narrow panels and many variants**: the table scrolls sideways
  within its rule, the row headers staying in place (sticky).
- **The selected variant's column is highlighted**; the switch
  doesn't otherwise change the Requirements.
- **Removed**: the card grid, the "Not met in Dark" line
  (`failingElsewhere`), and the simulation strips under cards.
  Rule statuses and the header count stay as they are (ADR 19).

Nothing saved changes.

## What it replaces

- ADR 19, UI: "Requirements show the cards of the selected
  variant" becomes every variant, in columns.
- ADR 16, 17: the cards under each requirement become a table;
  ADR 18's **+ Pair** and **Override** are unchanged.

## Alternatives

- **A strip per variant on each card**, simulations as chips (A2)
  or as the other variants' worst case (A1): denser, but a chip
  shows one number for two targets, and A1 hides the other
  variants' simulated colors.
- **An "All" choice in the switch**, repeating the cards per
  variant: every card two or three times.
- **The table only with variants**, cards without: denser for
  palettes without variants, but two layouts for one thing.

## Plan

1. The table: a row per pair, a column per variant, the row
   header with names and actions, cells as today's card content;
   replaces the card grid in rules and One-off pairs, with the
   "Not met in Dark" line (`failingElsewhere`) and the card
   strips. A rough version first, judged by hand.
2. Simulation rows, scope headers, sticky row headers, the
   selected column's highlight.
3. Preview per cell in its variant.

## Later

- Collapsing a rule's passing pairs, if long tables get in the
  way.
