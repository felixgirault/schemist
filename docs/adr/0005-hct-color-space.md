# 5. HCT color space

- Status: proposed
- Date: 2026-10-26

## Context

Material Design uses HCT (hue, chroma, tone) as its color space,
through [material-color-utilities][mcu]. The question is whether
it should replace `SchemistColor` as the space nodes work in.

### Current state

`SchemistColor` (`src/lib/color/conversion.ts`) takes its hue
from OKLCH, and its saturation and lightness from Okhsl.

| Concern                                         | State                                                   | Impact of HCT                                                |
| ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Lightness                                       | Okhsl `l`, designed to closely follow CIELAB L\*        | HCT tone is L\*, so little changes                           |
| Saturation                                      | Okhsl `s`, relative to the gamut: any `s` and `l` exist | HCT chroma is absolute: many combinations are out of gamut   |
| Hue                                             | OKLCH hue                                               | CAM16 hue, also perceptual, generally less even in the blues |
| Manipulations (`src/lib/color/manipulation.ts`) | Move `s`, `l` and `h` freely, results are always valid  | Results need gamut mapping, which lowers chroma for good     |
| Contrast (`src/lib/color/contrast.ts`)          | WCAG 2 and APCA (WCAG 3), computed on the output colors | Tone differences guarantee WCAG 2 contrast only              |
| Packing (`src/lib/packing/v1.ts`)               | Colors are stored as hex                                | Old links still decode, but derived colors change            |
| Dependencies                                    | culori                                                  | material-color-utilities on top: ARGB integers, no alpha     |

### What HCT brings

Tone works as a contrast guarantee: a tone difference of at least
40 means a WCAG 2 contrast of at least 3:1, and at least 50 means
at least 4.5:1. This is the main reason Material uses it.

### What HCT costs

- **Lossy chains**: with an absolute chroma, a hue or tone change
  can land out of gamut. The color is then mapped back by lowering
  its chroma, and a following node cannot recover it. The same
  problem was already met with LCH in `lchToSchemist`.
- **No APCA guarantee**: tone says nothing about APCA contrast,
  which Schemist also supports.
- **Changed palettes**: every preset and node would produce
  different colors from the same input.
- **A second color library**, with its own color representation.

### Options

1. **Switch to HCT**: replace `SchemistColor` with HCT, and the
   culori conversions with material-color-utilities.
2. **Keep the current space**, and borrow the contrast guarantee
   instead: nodes like Contrasting search lightness until a chosen
   WCAG 2 or APCA level is reached, using the existing contrast
   functions.
3. **Keep everything as is.**

## Decision

Option 2.

The current space already has a lightness close to tone, and its
relative saturation keeps every manipulation in gamut, which
chained nodes depend on. The only real gain of HCT is the contrast
guarantee, and targeting a contrast level directly gives it for
both WCAG 2 and APCA, without changing the color space.

## Consequences

- `contrastingColor` and the Contrasting node gain a contrast
  target, alongside or instead of their amount.
- No new dependency, and existing palettes are unchanged.
- HCT is not available as an input or export format. It can be
  added as a conversion later, without touching the node space.

[mcu]: https://github.com/material-foundation/material-color-utilities
