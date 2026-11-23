# 21. Default requirements

## Context

A palette without requirements shows an empty panel: roles and
rules (ADR 16) must be thought up before anything is checked.
Most design systems need the same few.

## Decision

`loadPalette` gives a palette without pairs, roles and rules the
default ones: a new palette, and a link or stored palette that
declares none. A palette with any of them is left as it is.

| Role            | Rules                                                        |
| --------------- | ------------------------------------------------------------ |
| Surfaces        |                                                              |
| Text            | on Surfaces, Body text                                       |
| Borders         | on Surfaces, Large text and UI                               |
| Accents         | on Surfaces, Large text and UI                               |
| Text on accents | on Accents, Body text                                        |
| Categories      | among themselves, Categories; on Surfaces, Large text and UI |

- **Roles start empty**: nothing is guessed from names or the
  tree (ADR 16). Picking colors is what starts the checks.
- **Borders** are the ones that must be seen (inputs, focus
  rings), hence 3:1; dividers stay out of the role.
- **Data, in the saved format** (`defaultRequirements` in
  `core/pairs.ts`, beside `uses`), read by `parseRoles` and
  `parseRules` as a link's are.
- **Ordinary once loaded**: renamed, deleted and saved as any
  other, in links too. They are set before the history starts, so
  undo doesn't remove them.
- **A rule without pairs has no status**: it showed ✓ ("met"),
  which six empty roles would make misleading. Its "No pair yet"
  hint stays.
- The CLI adds nothing: `eval` checks what a tree declares.

Limit: the format doesn't tell "cleared" from "never set", so
deleting every role, rule and pair brings the defaults back on
the next load.

## Alternatives

- **A button, "Use common roles"**: nothing imposed, and a
  cleared palette stays so, but one more control, and the panel
  still starts empty.
- **New palettes only**: leaves links and stored palettes without
  requirements empty.
- **Filling roles from token names** (`bg/…`, `text/…`): assumes
  the palette's names (ADR 16).
- **Muted text as a role**: same rule as Text.

## Plan

1. The defaults, loaded; tests of the three sources (new, without
   requirements, with some) and SPEC.md.
2. No status on a rule without pairs.
