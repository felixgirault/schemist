# 17. One page: the grid beside the requirements

## Context

The combinations panel has grown four modes (Contrast,
Difference, Grid, Result) and filters for them (Colors, Check,
Contrast type, Minimum contrast level, Minimum difference, Color
blindness, Luminosity analysis). Since ADR 16:

- The requirements declare what is checked, so the Check lens
  (ADR 14) no longer declares anything, and the Result mode is
  the requirements with their cards (ADR 16, as amended in its
  UI).
- Grid and Result split one task over two modes: the pairs on one
  side, what they must meet on the other.
- Contrast and Difference are covered by the grid and by rules
  among a role (Categories).

## Decision

One page, no mode: the grid beside the requirements, each
requirement with its cards underneath (today's Result).

```
┌ Combinations ── Simulate: [P] [D] [T]  [Grayscale] ─────────────┐
│ ┌ grid ──────────────────┐ ┌ Requirements ────────────────────┐ │
│ │ Surfaces ▾  ● ● ● ●    │ │ ▸ Text on Surfaces  Body text ⚠  │ │
│ │  ●  ▣ ▣ ▣ ▣            │ │   [card] [card] [card] [card]    │ │
│ │  ●  ▣ ▣ ▣ ▣            │ │ ▸ Series among themselves  ✓     │ │
│ │ Other ▸                │ │ + Rule …   One-off pairs …       │ │
│ └────────────────────────┘ └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- **Removed:** the mode switch, the Contrast list, the difference
  matrix, and the Colors, Check, Contrast type, Minimum contrast
  level and Minimum difference filters.
- **Simulate** (protanomaly, deuteranomaly, tritanomaly) and
  **Grayscale** (today's luminosity analysis, the whole page in
  grayscale) are toggles in the panel's header. Simulations apply
  to the grid's strips and to the cards.
- **The grid is grouped by role** in rows and columns, each group
  collapsible ("Surfaces ▾"), in place of the Colors filter. A
  color appears once, in its first role (ADR 16); colors without
  a role are an **Other** group, collapsed by default once a role
  exists.
- **A rule previews its use on the grid**: hovering or focusing a
  rule outlines its cells (ADR 16) and dims the cells that miss
  its use, in the worst case of the selected simulations. Nothing
  is dimmed otherwise. This replaces the Check lens; outlines and
  dimming still mean one thing each (the rule's cells, missing
  its use).
- **A cell opens its card at the top of the requirements
  column**, closed with Close, Esc or the cell, as the grid's
  card does today (ADR 14, 15: per-use buttons, sources,
  Override).
- **Narrow panels** (container query at 48rem): the grid above
  the requirements.

Nothing saved changes: no filter is in permalinks.

## What it replaces

- ADR 12 (difference view): the matrix goes; differences are
  Categories rules and cards.
- ADR 14: the Check lens goes; uses stay.
- ADR 15: the requirements list is the requirements column with
  cards, not a side list.
- ADR 16: the Result mode becomes the page's right column.

## Alternatives

- **Keeping the Colors filter**: redundant with roles for
  declared colors; groups shrink the grid without a second way to
  pick colors.
- **Dropping Grayscale**: differences don't replace it, they
  measure a distance between two colors, not the lightness order
  of the palette; it costs a toggle.
- **Clicking a declared cell scrolls to its card**: more
  connected, but two behaviours for one click.
- **Keeping the Contrast list for exploring**: the grid holds the
  same pairs, and a rule's preview shows what could pass.

## Plan

1. Remove the modes and filters (Contrast list, difference
   matrix, their filters, `mode`, Colors, Check); move Simulate
   and Grayscale to the header; lay out the grid and the
   requirements with cards side by side; the cell card at the top
   of the column.
2. Group the grid by role, collapsible, Other collapsed by
   default.
3. A rule's use dims the grid on hover and focus.

## Later

- Levels on grid cells, if exploring by tooltip is not enough.
