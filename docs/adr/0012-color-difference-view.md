# 12. Color difference view

## Context

ADR 3 added `difference()` (`core/difference.ts`, SPEC §9.6) and
`eval --difference`, and left the app unchanged: "showing
differences there would be its own decision".

The Combinations panel (SPEC §11.5) answers "can I read this
color on that one?". It lists both orders of every pair
(`n × (n − 1)` cards), as background and text. Color difference
answers another question: "can I tell these colors apart?". It is
symmetric, and it only matters within a set of categorical colors
(chart series, tags), not across the whole palette. In the
dashboard eval case, 6 of the palette's 13 or more colors are
chart series: 15 pairs that matter out of 78.

## Goals

- See at a glance which pairs of a chosen set of colors are too
  close, with and without the simulated color vision
  deficiencies.
- The same numbers as `eval --difference`, so the app and the CLI
  agree.

## Prior work

Checked in each tool's source code where available, in
November 2026.

| Tool                     | Metric                    | Threshold     | Display                                   | Simulations              |
| ------------------------ | ------------------------- | ------------- | ----------------------------------------- | ------------------------ |
| Adobe Leonardo           | CIEDE2000                 | 11            | One pair: a row per vision type, ΔE bar   | Worst case decides; rows |
| Colorgorical             | CIEDE2000                 | none          | Pairwise matrix with swatches             | none                     |
| Viz Palette              | CIEDE2000, custom weights | 5 / 15 / 20   | Arcs between swatches, tiers by mark size | One at a time            |
| Adobe Color              | not published             | not published | Conflict lines between swatches, 5 colors | Worst case               |
| chroma.js Palette Helper | CMC (chroma-js 2.0.4)     | 9             | "Colorblind-safe" or not, no pairs listed | Separate                 |
| Palettailor              | CIEDE2000                 | 10            | No pairwise view                          | none                     |
| Coolors                  | no difference check       |               | Simulated colors next to the originals    | One at a time            |

Sources:

- Leonardo: github.com/adobe/leonardo, `docs/ui/src/js/utils.js`
  (`getDeltaE00`), `compareColors.js` (threshold 11),
  `colorScaleQualitative.js` (`testCvd`).
- Colorgorical: github.com/connorgr/colorgorical,
  `public/static/js/score.js` (`deMtx`).
- Viz Palette: projects.susielu.com/viz-palette, deployed bundle
  (the repository returned 404).
- chroma.js Palette Helper: github.com/gka/palettes,
  `src/colorBlind.js`.
- Palettailor: github.com/IAMkecheng/palettailor,
  `js/optimizeFunc.js`.
- Adobe Color: blog.adobe.com, 2020-09-16; metric not published.
- Coolors: its help center; closed source.

No tool combines a matrix with a worst case across simulations.

## Decision

### Mode

The Combinations panel gets a **Contrast | Difference** switch
(`combinations.mode`, default `contrast`, not persisted like the
other filters).

In Difference mode:

| Filter                         | Behavior                                          |
| ------------------------------ | ------------------------------------------------- |
| **Colors**                     | The colors to compare (empty = all visible)       |
| **Color blindness simulation** | Unchanged: simulations included in the worst case |
| **Luminosity analysis**        | Unchanged                                         |
| **Contrast type**              | Hidden                                            |
| **Minimum contrast level**     | Replaced by **Minimum difference**                |

The section heading shows the pairs at or above the minimum and
the pairs compared, `(12 / 15)`, like the contrast counts
(filtered / total). With fewer than two compared colors, the
panel says to select at least two.

### Minimum difference

`combinations.minDifference`, a number field, default 10, the
reference value of SPEC §9.6 (Palettailor's floor; Leonardo uses
11). It is a setting, not a built-in grade, so ADR 3's "no
built-in thresholds" still holds: what counts as different enough
depends on the use.

### Matrix

`combinations.differences`: `difference(a, b, blindnessTypes)`
for each pair of the compared colors, once per pair, in
`sortedColors` order.

A compact lower triangle, so large sets stay scannable. Rows are
labeled with the color's swatch and name, and stay in place while
the matrix scrolls. Columns are labeled with the swatch alone,
the name in its tooltip and accessible label. Each cell is a
button of fixed width showing `minLevel` rounded to a whole
number (about 1 is the just-noticeable difference, so decimals
add little), in the panel's text color so it stays readable on
any pair. Cells below the minimum show a warning icon instead of
the number, and an outline. The pair details keep 1 decimal.

The first version repeated both swatches and 1 decimal in every
cell, and full names in column headers: about 7rem per column, so
15 colors were two to three screens wide. Compact, a column is
about 2.5rem: 15 colors take about 43rem, 30 about 80rem
(estimated from the CSS).

Activating a cell shows the pair below the matrix: one row for
normal vision and one per simulation, each with the two colors as
simulated and the level, like the simulation rows of a contrast
card. The open pair is kept by id (`<idA>-<idB>`) and closes when
either color is removed, hidden or filtered out.

The matrix scrolls horizontally when wider than the panel.

### Cost

Measured in Node with the 3 simulations: 0.39 ms for 6 colors,
2.09 ms for 30, 5.99 ms for 50, about the cost of `combine` for
the same colors (0.35, 3.02, 9.16 ms), which the panel already
runs. The Lab conversion and CIEDE2000 add 4.5 kB minified, 1.1
kB gzipped, to the app (culori code alone, not a full build).

## Alternatives rejected

- **A difference line on each contrast card**: each value shown
  twice (a/b and b/a), compared across the whole palette, and
  mixes two questions in one card.
- **Pair cards sorted from closest**: fits narrow screens, but
  hides the structure (which color conflicts with several
  others).
- **A separate selection for the compared colors**: the Colors
  filter already is a subset of node ids.
- **A "closest color" line on each tree node**: clutters the
  tree, and compares against the whole palette.
- **A fixed threshold**: no single value fits every use (ADR 3).
- **A difference filter in the contrast view**: over 200,000
  random sRGB pairs, every pair reaching WCAG 3:1 had a
  difference of at least 25.3 (4.5:1: 36.9; APCA Lc 45: 19.9; Lc
  60: 30.4), so it would filter nothing once a contrast minimum
  is set. The Colors filter only restricts backgrounds there, so
  it cannot scope the check to a set, and every pair shows twice.
- **A list of the closest pairs above the matrix**: easy to scan
  at any size, but repeats the matrix. Can be added if large
  palettes stay hard to read.
- **Hiding rows and columns without a pair below the minimum**:
  shows nothing for a palette without conflicts, and the layout
  moves with the minimum.

## Later

- Viz Palette's arcs with tiers by mark size (lines and points,
  medium areas, large areas; Szafir 2018).
- Selecting a token group (`chart/`) in the Colors filter at
  once.
- Previewing a pair, as contrast cards do.

## Plan

1. Store: `mode`, `minDifference`, `differences`, with tests on
   pair count, order, simulations and the Colors filter; SPEC
   §8.2.
2. UI: mode switch, filters per mode, heading count, matrix and
   pair details; SPEC §11.1 and §11.5.

## Consequences

- The app bundle grows by about 1 kB gzipped.
- On a phone, a large set means scrolling the matrix sideways.
  The point where it starts is an estimate (around 8 colors at
  360 px), not tried in a browser yet.
