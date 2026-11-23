# Gaps for a full color token definition

November 2026, written after the Grid prototype
(`feature-unified-grid`, ADR 6 and its UI changes). It answers:
does the grid allow a solid definition of color tokens, and what
would a designer still need? The prior work section was added
after researching six tools and standards.

## What the grid covers

- Pairs of colors with their own targets: WCAG 2, APCA, color
  difference (ADR 6).
- The worst case across the simulated color vision deficiencies.
- Difference between categorical colors (chart series, tags).
- Pairs saved with the palette (permalink v2, tree JSON), with
  the same results in the app and the CLI.

It answers "do these pairs work". It doesn't yet answer
everything a token set needs.

None of the tools researched checks pairs between arbitrary
tokens, with their own targets, across simulations: Leonardo
checks each color against one background, Material pairs fixed
roles, Radix guarantees a single pair, and Figma and Tokens
Studio have no pairs at all. That is where Schemist stands apart.

## Gaps, most important first

### 1. Light and dark themes

Both eval cases (`evals/cases/dashboard`, `evals/cases/website`)
ask for two trees, `out/light.json` and `out/dark.json`, with the
same token names. In Schemist, each palette is its own permalink:

- every pair has to be declared twice;
- nothing checks that a pair passes in both themes;
- nothing checks that a token exists in both.

Every tool researched does the same thing instead: **one token
name, a value per theme**, and the same pairs and targets checked
in each theme.

- Figma: a variable holds one value per mode (light, dark).
- Radix: identical variable names, swapped by a `.dark` selector.
- Leonardo: the same ratios with a background lightness per
  theme.
- Material: the same role pairs and minimum contrast, with tones
  computed per scheme.
- DTCG: a separate resolver module picks token sets by mode.

Cost: the largest of this list. It changes the saved format and
needs its own ADR. See "Implications for themes" below.

### 2. Separate rows and columns, by role

**Colors** restricts the grid's rows and columns together, so 40
tokens make 1,560 cells, most of them meaningless (`text/body` as
a background). Designers think in roles: surfaces as backgrounds,
text, icons and borders as foregrounds.

- Material names this relationship with "on-" roles (`on-primary`
  on `primary`).
- Radix assigns roles to scale steps (1–2 backgrounds, 6–8
  borders, 11–12 text).

Idea: pick rows and columns separately, ideally by token group
(`bg/` as rows, `text/` and `border/` as columns). It ties in
with "Select a token group in the Colors filter" in the roadmap.

Cost: small. The grid needs it at real token-set sizes.

### 3. Why a pair exists

A pair stores `wcag2: 4.5`, not "body text":

- someone reviewing later can't tell 4.5 for body text from 4.5
  for large text, or why a border only needs 3;
- APCA targets depend on font size and weight together: body text
  at least Lc 75 (Lc 90 preferred), other content text Lc 60,
  large or heavy text Lc 45, spot text such as placeholders Lc 30
  (APCA "In a Nutshell").

Idea: a free label per pair, a light form of the roles deferred
in ADR 13 (since done as uses, ADR 14; roles as groups of colors
in ADR 16).

### 4. Handing the rules to developers

Exports carry values, not pairs. Developers never learn that
`text/secondary` is only meant for `bg/page` and `bg/surface`.

Idea: put pairs and their labels in the design tokens export,
under a reverse-domain `$extensions` key (DTCG §5.2.3; tools must
keep extension data they don't understand), and as a comment in
CSS, so they become usage documentation. "Pairs in exports" is
already on ADR 6's later list. Best done with 3, since labels are
what make it readable.

### 5. Transparency

Alpha is dropped by permalinks and design tokens (SPEC §13). DTCG
colors support alpha natively (color module, §4.1). Overlays,
scrims and borders are often semi-transparent:

- Radix ships alpha scales that match the solid ones over one
  given background only.
- Material draws hover, focus and pressed states as opacity
  layers over a role (0.08, 0.12, 0.12), and disabled colors at
  0.12 and 0.38.

Contrast of a transparent color depends on what's underneath, so
a semi-transparent token would need the background it is checked
over, and the check runs on the blended color.

A medium gap, depending on whether users rely on such colors.

### 6. Contrast levels

Material gives each pair one minimum per contrast level
(standard, medium, high), and computes a scheme per level. A
"high contrast" variant is a theme like light and dark. Not
needed now, but the themes design should not rule it out.

### 7. Smaller points

- **Interaction states** (hover, pressed, focus, disabled) come
  in families. WCAG 2.2 exempts inactive components from 1.4.3
  and 1.4.11, so leaving disabled pairs undeclared is right (or
  holding them to APCA Lc 30). Grouping (2) helps with the rest.
- **Focus rings**: 3:1 against adjacent colors (WCAG 1.4.11, AA),
  so a ring needs pairs with both the component and the page. The
  AAA criterion 2.4.13 also asks 3:1 between focused and
  unfocused pixels.
- **Primitive and semantic tokens**: Material layers semantic
  roles (`md.sys.color.*`) over primitive tones
  (`md.ref.palette.*`), and DTCG and Figma support references
  (`{group.token}`). Exports are flat values with no references,
  so a rebrand changes values rather than references. Schemist's
  tree of derived colors is close in spirit, so this matters less
  for a contrast tool.

## Status, 23 November 2026

- Done since: 2 (roles, ADR 16), 3 (uses, ADR 14, 15, 16), 4
  (roles and pairs in exports, `94e613f`), the APCA correction
  (README and AGENTS.md now say Lc 75).
- Still open: 1 (themes), 5 (transparency), 6 (contrast levels),
  the CI option (`eval` still exits 0 on a failing pair,
  `src/cli/index.ts`), solving pairs.
- New gap, from the dashboard eval case: "disabled text … must
  still be visibly dimmer than secondary text". Targets are
  minimums; nothing expresses a maximum or an order between two
  colors.

## Light and dark in the eval runs

Measured 23 November 2026 on the 18 light/dark tree pairs in
`evals/results/` (dashboard and website, 3 runs × 3 dates), by
token name: type, parent and args in each theme.

- 17 of 18 pairs have the same structure: same tokens, types and
  parents. 411 of 414 shared tokens keep type and parent.
- Only args differ. Website runs (derivations): `l.amount` (98 →
  9 for backgrounds, 12 → 94 for text, 40 → 78 for primary), a
  few `s.amount` and `ctr.amount`; `ctr` nodes often keep theirs,
  since they adapt to their parent.
- The exception (`2026-11-21T23-12-07/website/run-1`) rebuilt
  three tokens in dark as `s` nodes under new `l` parents (3 more
  nodes).
- Dashboard runs (35 tokens): every token is a flat `clr` with a
  hex, no derivations; 197 `clr.color` differ. Unchanged across
  themes: the root, the buttons and the chart colors.
- So for variants (decision of 23 November: one tree, a variant
  overrides args, tokens may stay the same): arg overrides cover
  17 of 18 pairs; the exception needs a structure that differs,
  or a tree designed for both.

## Correction for the agent guidance

AGENTS.md and the README tell agents to aim for "Lc 60 for body
text". APCA's minimum for body text is Lc 75, Lc 60 being the
minimum for other content text. The dashboard eval case already
expects 75 for body text. To fix separately.

## Implications for themes

The tools converge on a model that fits declared pairs well:

- **Themes share token names and pairs**; only values change.
  Pairs are declared once, by name, and checked in every theme.
  Since ADR 6 pairs already point at names, they carry over.
- **A token missing from a theme** is an error, as Figma refuses
  to create a variable that isn't in every imported mode file.
- **Export one DTCG file per theme**: Figma imports each file as
  a mode, and Style Dictionary (via Tokens Studio's
  `permutateThemes`) works the same way. A DTCG resolver document
  could tie them together.
- **Keep values static on export**: Tokens Studio's modifiers and
  math are its own extensions, which Figma cannot import.
- **Open question**: one tree with a value per theme for each
  node, or one tree per theme sharing token names. Schemist
  derives colors from parents, so a dark theme may want other
  derivations, not just other values (Leonardo changes the
  background only, Material computes other tones).

## Positioning

If Schemist adds themes, roles and exports, it matches the token
tools on what they already do well. What would still set it apart
is the combination none of them has:

1. **Pairs between any tokens, each with its own targets**: WCAG
   2, APCA or color difference, in the worst case across
   simulations.
2. **Colors derived from a tree of rules** (contrasting,
   lightness, harmonies, presets) that users build, rather than a
   fixed algorithm (Material), target ratios against one
   background (Leonardo) or fixed scales (Radix).
3. **UI tokens and data visualization colors in one model**:
   contrast for text, difference for chart series, in the same
   palette and grid.
4. **The same answers in the app, the CLI and permalinks**, with
   the CLI built for agents and tested by evals. Agent support
   alone isn't unique: Leonardo has an MCP server (see below),
   but it checks one pair per call against fixed WCAG 2
   thresholds, with no custom targets, no simulations and no
   difference check, and never fails on a missed target.

Not worth competing on: managing tokens (references, sets, sync,
modes per plan), which Figma and Tokens Studio do. Schemist is
better as the tool they plug into: import DTCG, check the pairs
in every theme, export DTCG back. DTCG import doesn't exist yet.

**The big bet: solve the pairs, not just check them.** Material
moves a tone until its pair reaches the target, Leonardo picks
colors from target ratios, but only for their own fixed pairs.
Schemist knows arbitrary pairs and which rules produce each
color, so it could adjust the tree's settings until every
declared pair passes, in every theme. That's what agents do by
hand today, run after run. Costs: choosing which settings may
move, keeping changes small, saying when no solution exists.

**Palette as code**, a smaller step in the same direction: a
palette, its themes and pairs as a text file (the DSL idea),
reviewed in pull requests, with a CI check. Today `eval` exits
with 0 even when a declared pair fails (exit code 1 is only for
usage and tree errors, `src/cli/index.ts:15`), so an option to
fail on unmet pairs would be needed. Whether Style Dictionary
pipelines have any contrast check is from memory (they don't),
not verified.

## Suggested order

1. Separate rows and columns (2): cheap, needed at real size.
2. Design themes (1), with this research as input.
3. Labels and pairs in exports (3 and 4), together.
4. Fix the APCA body text guidance (correction above): small,
   independent.

## Ideas for later

- A declarative DSL to describe a palette, its tokens and pairs
  (user's note, November 2026). Not designed yet.

## Prior work

### Adobe Leonardo

Source: github.com/adobe/leonardo at HEAD,
`packages/contrast-colors/lib/`.

- A theme is a background, a lightness, a contrast multiplier and
  a saturation, with colors defined by target ratios per swatch
  (`theme.js:19`).
- Light and dark come from the same definition by changing only
  the background's lightness. A positive ratio means "away from
  the background" in both (`utils.js:388-420`).
- Colors are generated from targets, by searching a 3000-step
  scale for each ratio (`utils.js:468-513`). WCAG 2 or APCA.
- Every color is measured against the single theme background. No
  pairs between colors, no alpha, no references.
- Exports CSS custom properties per theme, and tokens with
  `$value`/`$type` (`docs/ui/src/js/createOutputParameters.js`).
  Names don't change across themes.

### Leonardo's agent tooling

Source: github.com/adobe/leonardo at `eb6481d` (2026-07-08); the
tooling landed in `2cda361` (2026-02-20, `@adobe/leonardo-mcp`
0.1.0).

- An MCP server (`packages/mcp/`, stdio only) with four tools:
  `generate-theme` (solves ratios against the one theme
  background), `check-contrast` (one pair per call, thresholds
  fixed at 4.5, 7 and 3; APCA returns the Lc value only),
  `convert-color`, `create-palette` (no contrast targeting).
- A failed contrast is a normal result: no tool errors or exits
  non-zero on a missed target (`server.js:60-62`,
  `cli.js:16-19`).
- An agent skill (`skills/leonardo-colors/SKILL.md`) and an
  `llms.txt`: an API guide, with no check-and-iterate workflow.
- No CIEDE2000 or simulation checks for agents. The web app has a
  difference check under full dichromacy for qualitative palettes
  (`docs/ui/src/js/colorScaleQualitative.js:259-275`), not
  exposed as a tool.
- No CLI; the library (`@adobe/leonardo-contrast-colors` 1.1.0)
  can be scripted.

### Material Design 3

Source: material-color-utilities at `dca2d34`,
`typescript/dynamiccolor/`. m3.material.io didn't load.

- Pairs are explicit: each `DynamicColor` names its `background`
  and a `ContrastCurve`, e.g. `on_primary` on `primary`,
  `ContrastCurve(4.5, 7, 11, 21)` (`color_spec_2021.ts`).
- A curve has one value per contrast level (-1, 0, 0.5, 1). A
  tone is kept if it already reaches the target, moved otherwise
  (`dynamic_color.ts:510-540`). WCAG ratio only, no APCA.
- `ToneDeltaPair` covers pairs that aren't text on a background,
  e.g. a container and its accent, 10 tones apart.
- Light and dark use different tones per role (`primary` 80 in
  dark, 40 in light), with the same pairs and targets.
- States are opacity layers (`_md-sys-state.scss` in
  material-web: hover 0.08, focus 0.12, pressed 0.12, dragged
  0.16); disabled is on-surface at 0.12 and 0.38.
- Tokens: semantic `md.sys.color.<role>` referencing primitive
  `md.ref.palette.<palette><tone>`.

### Radix Colors

Sources: radix-ui.com/colors docs, radix-ui/colors
`scripts/build-css-modules.js`, radix-ui/website
`components/generate-radix-colors.tsx`.

- 12 steps with roles: 1–2 backgrounds, 3–5 component states, 6–8
  borders, 9–10 solid, 11–12 text.
- Its only guarantee: steps 11 and 12 reach Lc 60 and Lc 90 on
  step 2 of the same scale. Nothing for borders or text on steps
  3–5.
- Light and dark scales share step names, swapped by `.dark`
  selectors.
- Alpha scales solve `target = bg·(1−α) + fg·α`, so they match
  the solid scale over one background only.
- The custom generator mixes the two nearest built-in scales; it
  doesn't re-check the Lc guarantee (not verified).

### DTCG

Sources: designtokens.org/TR/2025.10/ (Final Community Group
Report, 28 October 2025, not a W3C Standard), the format draft.

- References: `"$value": "{colors.blue}"` (§7.1.1), or JSON
  Pointer with `$ref` (§7.1.2); no circular references.
- `$extensions`: vendor data under a reverse-domain key; tools
  must keep what they don't understand (§5.2.3).
- Themes are not in the format: the resolver module combines sets
  and modifiers with `contexts`, chosen by inputs such as
  `{"mode": "dark"}`.
- Colors: `{colorSpace, components, alpha, hex}`, with 14 color
  spaces including oklch and display-p3 (color module §4.1–4.2).

### Figma variables

Source: help.figma.com, developers.figma.com.

- A collection holds variables and modes; a variable has one
  value per mode. Up to 10 modes on Professional, 20 on
  Organization; Starter appears limited to one.
- Variables can reference variables of the same type.
- Native DTCG import and export, one file per mode. A variable is
  created only if it exists in every imported file.
- No pairs; the contrast checker works on a selected layer.
  Plugins check user-defined pairs across modes.

### Tokens Studio

Source: docs.tokens.studio,
github.com/tokens-studio/sd-transforms.

- Themes are combinations of token sets; several theme groups
  combine (e.g. `light_casual`).
- References `{colors.green.1200}`, math, and paid color
  modifiers (lighten, darken, alpha, mix) stored in
  `$extensions['studio.tokens']`.
- Syncs a theme group to a Figma collection, each theme becoming
  a mode.

## Checked and unchecked

- Checked in the repo: alpha dropped by permalinks and tokens
  (SPEC §13), the two trees per eval case (`expect.json`,
  `prompt.md`), no references in the tokens export, the Lc 60
  body text guidance (AGENTS.md, README).
- Checked in sources (by research agents, with the file paths and
  URLs above): Leonardo, material-color-utilities and Radix
  source; DTCG 2025.10; WCAG 2.2 exemptions and focus criteria;
  APCA use cases; Figma and Tokens Studio docs.
- Not checked: m3.material.io (didn't load), Material's 2025 and
  2026 color specs, the Leonardo authors' articles (403), whether
  Figma reads variable scopes on import, Figma plan limits after
  November 2026.
