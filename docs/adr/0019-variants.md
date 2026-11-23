# 19. Variants

## Context

A color system has light and dark versions, sometimes a high
contrast one. In Schemist each is its own palette and permalink:
rules are declared twice, nothing checks that they pass in both,
nor that a token exists in both. Every tool researched does
otherwise: one token name, a value per theme, the same pairs
checked in each (research note, "Light and dark themes").

The end goal (23 November 2026): declare a color system's
requirements once and check them in every variant, the same in
the app, the CLI and CI, then hand the result to the token tools.
Schemist stays a checker for now; solving pairs comes later, and
must work across variants.

Measured on the 18 light/dark tree pairs the eval agents wrote
(research note, "Light and dark in the eval runs"): 17 have the
same structure in both, only args differ (`l.amount` above all);
`ctr` nodes often keep theirs; the root, buttons and chart colors
often don't change at all.

## Decision

### Model

- **A palette has variants**, named by the user, listed in order
  at the root. The tree as it is today is the first one, the
  **base** ("Light" by default, renamable). A palette without
  variants is a palette with only its base: older palettes open
  as they are.
- **A variant overrides args, on the node**:
  `overrides: {Dark: {amount: 9}}`. An override moves, copies and
  is deleted with its node, and keeps its meaning when the node
  is moved. Type, token, parent, children and visibility are
  shared: one structure, so every token exists in every variant,
  by construction.
- **In the app, variants have ids**, as roles do (ADR 16), and
  overrides are keyed by them: renaming a variant changes no
  node. Deleting one deletes its overrides.
- **A node without an override keeps the base's args** in that
  variant; its color may still differ, derived from a parent that
  has one.
- **Params that change a preset's structure can't be
  overridden**: Scale `steps`, Rainbow `count` ("colors"), the
  Harmonies and Schemist theme booleans. Their defs mark them, so
  the rule is enforced by code, not remembered. Other preset
  params (States `amount`, Neutral `saturation`) can.
- **Roles, rules, one-off pairs and their targets are shared.**
  Each pair is checked in each variant.
- **Swap** (ADR 8) treats overrides as it treats args: kept for
  the params the new type has with the same def, dropped
  otherwise. **Expand** gives each generated node, per variant,
  the args that differ from the base: the structure being the
  same, they always line up.

### Format

The tree JSON gets `variants` at the root (names, the base first)
and `overrides` on nodes (args by variant name, never the base).
Validation: a variant named at the root, a param of the node's
type, in bounds, not structural. Permalink version 2 carries
them: a variants part and overrides in node records. Version 2 is
not deployed (AGENTS.md), so it changes without a new version;
version 1 is still read.

### UI

```
┌ Palette ─ [Light] [Dark] [+] ┐ ┌ Requirements (52 / 54) ─ Simulate … ┐
│ ▌Brand                       │ │ Text                                  │
│  ▌bg/page        ●           │ │   on Surfaces · Body text ⚠          │
│  ▌text/body                  │ │   [cards of Dark]                     │
└──────────────────────────────┘ └───────────────────────────────────────┘
```

- **The variant switch** in the Palette header selects a variant;
  `+` adds one (a copy of the base, no overrides), and each can
  be renamed or deleted (not the base); these are changes, in
  undo. The selection is view state: not saved, not in undo, the
  base on load.
- **Editing an arg in a variant other than the base writes its
  override.** A node with an override shows a mark; a field with
  one has **Reset to Light** (named after the base). The tree
  previews the selected variant's colors.
- **Requirements** show the cards of the selected variant
  (replaced by ADR 20: every variant, in columns). A rule's
  status and the header count (met / checked, each pair counted
  once per variant) cover every variant: a pair failing in Dark
  only still shows as failing while Light is selected, the
  failing variant named in the status's text alternative and
  tooltip.
- **Preview** themes the app with the pair in the selected
  variant. The app's own **Dark theme** button is unrelated.

### Exports

- **Design tokens and Sass**: one file per variant, as Figma and
  Tokens Studio import them (research note); the modal exports
  the selected variant.
- **CSS**: one text, a block per variant, `:root` for the base
  and `[data-theme="<dash-cased name>"]` for the others.
- **The table**: a column per variant.
- Comments and `$extensions` (ADR 16) stay as they are, since
  roles and rules are shared.

### CLI and agents

- `eval` checks every variant: colors and pairs carry a
  `variant`, and each pair passes only if it passes in every
  variant.
- `export --variant <name>` exports one variant, the base without
  it; CSS gets every block whatever the flag.
- AGENTS.md and the README ask for one tree with variants instead
  of a tree per theme. The dashboard and website eval cases ask
  for one tree and the exports per variant; their graders and
  `expect.json` follow.

## Alternatives

- **One tree per variant sharing token names**: the same model in
  two documents, with a check that names match. Allows different
  derivations, which only 1 of 18 runs used, at the cost of
  keeping two structures in sync by hand.
- **Only the background changes** (Leonardo): too narrow for a
  tree of derivations; text and accents move too (research note).
- **Overriding types too**: would allow Material light here and
  dark there, but two structures under one name; expanding the
  preset and overriding its lightness covers it.
- **Overrides in a table at the root, by node id**: easier to
  list a variant's changes, but detached from the node it
  changes.
- **`@media (prefers-color-scheme)` in CSS**: only knows light
  and dark; a selector works for every variant, and a project can
  map one to the other.
- **"Theme" or "mode" as the name**: theme clashes with the app's
  own Dark theme button; mode is Figma's word for the same thing,
  less plain outside Figma. The user's word is variant.

## Plan

1. Core and format: variants and overrides, evaluation per
   variant, structural params in defs, validation, Swap and
   Expand, packing; `eval` and `export --variant`; tests.
2. Palette: the variant switch, editing overrides, marks and
   Reset, undo. A rough version first, judged by hand, since how
   a variant reads in the tree is the uncertain part.
3. Requirements across variants: cards of the selected variant,
   statuses and count over all.
4. Exports per variant, AGENTS.md, README, eval cases.

## Later

- **Contrast levels**: a high contrast variant is a variant; what
  it lacks is targets per variant (Material's curves). Later, on
  rules.
- **Structural differences between variants**, if a case needs
  them (1 of 18 runs).
- **Solving pairs across variants** (research note, "The big
  bet").
- **A DTCG resolver document** tying the per-variant files
  together; DTCG import.
