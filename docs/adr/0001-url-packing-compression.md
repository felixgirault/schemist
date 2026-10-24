# 1. Keep the custom packing format for permalinks

- Status: proposed
- Date: 2026-10-24
- Issue:
  [#53](https://github.com/felixgirault/schemist/issues/53)

## Context

Permalinks embed the whole node tree in the `preset` query
parameter. It is serialized by a custom format (`v1`, in
`src/lib/packing/v1.ts`), prefixed with its version (`1@…`).

`v1` is already a compression scheme:

- every type, token, argument name and hex color is stored once
  in a dictionary, and nodes reference it by index;
- numbers are written in hexadecimal, with `x`/`y` markers for 2
  and 3 digit values.

Issue #53 suggests replacing it with the
[Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API).

### Measurements

URL-encoded length of the `preset` parameter, in characters, for
every built-in preset. Compressed outputs are base64url encoded.

| Preset                 |   v1 |  JSON | deflate-raw(JSON) | deflate-raw(v1) | gzip(JSON) |
| ---------------------- | ---: | ----: | ----------------: | --------------: | ---------: |
| States                 |  100 |   538 |               231 |             112 |        255 |
| Split complementary    |   96 |   416 |               211 |             100 |        235 |
| Triad                  |   80 |   400 |               202 |              90 |        226 |
| Tetrad                 |   82 |   402 |               203 |              91 |        227 |
| Semantic colors        |   90 |   544 |               226 |             110 |        250 |
| Semantic color pairs   |  144 |  1140 |               270 |             148 |        294 |
| Scale                  |  131 |  1228 |               212 |             108 |        236 |
| Neutral                |  174 |  1004 |               283 |             159 |        307 |
| Harmonies              |  204 |   808 |               251 |             158 |        275 |
| Rainbow                |  114 |  1230 |               210 |              96 |        234 |
| Material tones light   |  112 |   716 |               230 |             118 |        254 |
| Material tones dark    |  114 |   715 |               230 |             118 |        254 |
| Material neutral light |  175 |  1005 |               288 |             164 |        312 |
| Material neutral dark  |  175 |  1005 |               284 |             162 |        308 |
| Material light         |  400 |  2903 |               387 |             290 |        411 |
| Material dark          |  406 |  2900 |               388 |             287 |        412 |
| Schemist theme         |  478 |  2826 |               447 |             359 |        471 |
| **Total**              | 3075 | 19780 |              4553 |            2670 |       4961 |

- Compressing the JSON tree instead of using `v1` is worse for
  almost every preset, up to 2.5 times longer on small ones: the
  deflate header and the lack of repetition outweigh the gains on
  such short inputs.
- Compressing the `v1` output is 13% shorter in total, but the
  whole gain comes from the largest presets. It is longer for
  small palettes, which are the most common ones.
- Picking the shortest of `v1` and `deflate-raw(v1)` per palette
  would save about 15% in total.

### Costs

- `CompressionStream` is promise-based, so `pack`, `permalink`
  and `getRootNode` would become asynchronous. `permalink` is
  currently called synchronously by the share button and while
  rendering the CSS/Sass and design tokens exports, so the change
  would spread to those components (Svelte only supports async
  derived values experimentally).
- Compressed links are opaque, while `v1` links can be read and
  debugged by eye (tokens like `Info,On $,Success` are visible).
- The longest preset link is 478 characters, well below the
  practical limits of browsers and messaging apps (2000+).

## Decision

Keep the custom packing format for permalinks and do not use the
Compression Streams API for now.

If shorter links become a requirement, add a new version that
applies `deflate-raw` to the packed output and encodes it in
base64url, used only when it is shorter. Older decoders stay to
support existing links, which the version prefix already allows.

## Consequences

- Permalink generation stays synchronous and links stay readable.
- Links of large palettes remain 15 to 25% longer than they could
  be.
- A format change was better spent on precision: `v1` stores
  colors as hex, which rounds them, so a palette opened from a
  permalink could differ by one unit on some channels (e.g.
  `#407aa6` became `#407aa5`), in 74% of the palettes tested.
  `v2` (`src/lib/packing/v2.ts`) is the same format with colors
  stored at full precision, which makes permalinks lossless for
  about 33 more characters per custom color. `v1` links are still
  supported.
