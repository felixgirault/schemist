# 3. Color difference in `eval`

## Context

Schemist checks contrast: how readable one color is on another.
It cannot say whether two colors look different from each other,
which is what a categorical palette (chart series, map regions,
tags) needs. Two colors of the same lightness have a contrast
near 1:1 and can still be easy to tell apart, and two colors with
fine contrast can collapse into one under a color vision
deficiency.

In the harder agent test, all three runs had to write their own
check with culori for a 6-color chart palette. They used
different formulas and floors (ΔE 8, ΔE 15, "ΔE_OK 10.3"), so
their results cannot be compared, and each spent several turns
building the tool instead of the palette.

## Goals

- `eval` reports how different the two colors of each pair look,
  with and without the simulated color vision deficiencies, in
  the same worst-case shape as contrast.
- One well-known formula, so values can be compared with other
  tools and guidelines.
- The core computes it, so the app can show it later.

## Decision

### Metric

CIEDE2000 (`differenceCiede2000` from `culori/fn`), the CIE's
current color difference formula and the one most guidelines and
tools refer to. It needs the `lab65` mode registered in
`color/culori.ts`.

Simulations reuse the existing filters (`color/simulation.ts`),
applied to both colors, like contrast.

### Core

`core/difference.ts`:
`difference(a: RgbColor, b: RgbColor, blindnessTypes)` →
`{level, simulated: [{type, level}], minLevel}`. It stays out of
`combine`, whose cost already dominates the app's combinations
panel.

### CLI

`eval --difference` adds to each combination:

```json
"difference": {"level": 23.41, "minLevel": 9.87, "simulated": [{"type": "deuteranomaly", "level": 9.87}]}
```

- `simulated` and `minLevel` follow `--blindness`, like contrast.
- Levels are truncated to 2 decimals, like contrast levels.
- Without `--difference`, the output is unchanged.
- The difference is symmetric, so `a/b` and `b/a` give the same
  value. Agents already pick pairs with `--pair`.

No grades and no thresholds are built in: what counts as
"different enough" depends on the use (adjacent bars, a legend, a
map), and the README gives reference points instead.

## Alternatives rejected

- **Euclidean distance in Oklab (ΔE OK)**: consistent with
  Schemist's own color spaces, but its scale is less known, and
  values could not be compared with most published guidance.
- **CAM02-UCS**: arguably better for data visualization, but not
  in culori; it would mean a new dependency.
- **A separate `difference` command**: duplicates tree reading,
  validation and pair selection that `eval` already has.
- **A `--among` option** to compare every pair within a set: 15
  `--pair` for 6 colors is easy to script, as the agents did. Can
  be added if it proves tedious.
- **Built-in grades**: no single threshold fits every use.

## Reference values

Rules of thumb for the README and SPEC, not built-in thresholds:

- About 1 ΔE00 is the just-noticeable difference, varying with
  hue and saturation
  ([Wikipedia](https://en.wikipedia.org/wiki/Color_difference)).
- At least 10 between any two colors of a categorical palette:
  Palettailor makes it a hard constraint, citing Brychtová &
  Çöltekin (Lu et al., IEEE VIS 2020,
  [arXiv:2009.02969](https://arxiv.org/abs/2009.02969)).
- Smaller marks need larger differences, points more than bars or
  lines (Szafir, IEEE TVCG 2018, doi:10.1109/TVCG.2017.2744359).

## Plan

1. Register `lab65`; add `core/difference.ts` with tests against
   known CIEDE2000 values.
2. `eval --difference` (`simulated` is always present, empty
   without `--blindness`, like contrast), with tests on output
   shape, simulations and truncation; the built-CLI test covers
   one pair.
3. Re-run the chart part of the harder agent prompt against the
   new option, and check the agents use it instead of their own
   scripts. Done after step 4.
4. SPEC §14, README CLI section and agent loop (when to use
   `--difference`, reference values). Done before step 3: agents
   only use what the README's agent loop tells them, as the
   Sonnet baseline showed.

## Consequences

- The CLI bundle grows by the Lab conversion code, a few kB.
- The app is unchanged for now; showing differences there (for
  example a "distinct colors" view) would be its own decision.
