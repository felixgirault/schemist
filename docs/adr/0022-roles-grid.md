# 22. Targets as a grid of roles

## Context

The Requirements panel is a tree: a role, its colors, its rules,
each rule's table of pairs (ADR 16, 18, 20). Three jobs share one
nesting: which colors have a role, what roles must meet on each
other, and whether they do. A rule shows under its first role
only, the second one telling it as "used by …", and adding one
takes a form. Even empty, the three default roles (ADR 21) fill a
column of "No pair yet".

## Decision

The panel becomes three flat sections, then **+ Pair**.

```
Roles
  Surfaces   ● Page  ● Card   [+] [×]
  Text       ● Ink   ● Grey   [+] [×]
  Borders    ● Line           [+] [×]
  + Role

Targets      on Surfaces            on Text     on Borders
  Surfaces   [—           ▾]        [— ▾]       [— ▾]
  Text       [Body text   ▾] ⚠      [— ▾]       [— ▾]
  Borders    [Large…      ▾] ✓      [— ▾]       [— ▾]

Checks
               Light          Dark
  Text on Surfaces · Body text ⚠
  Ink & Page   AAA 15.8 ✓     AA 5.1 ✗
  …
  One-off pairs · Custom
  …
One-off pairs
  + Pair
```

- **Roles**: a line per role, its name (editable), its colors as
  chips, the picker and Delete, as today.
- **Targets**: a `<table>`, the roles as rows (`fg`) and columns
  (`bg`), in role order. Each cell is a `<select>`: "—" or one of
  the `uses`. The diagonal is the role among itself. Without
  roles, there is no table.
- **A cell is a view of `rules`**: the ones of its two roles (on
  the diagonal, `bg` missing or the same as `fg`). Picking a use
  replaces them with one rule of that use, "—" removes them. One
  change, so one undo.
- **What a cell can't offer** (several rules, or targets of their
  own, from a link or the CLI) is an extra option naming them,
  "Body text + Custom", selected until another is picked. Nothing
  is lost by looking, and undo brings it back.
- **Status**: ✓ or ⚠ with its text ("not met in Dark", ADR 19)
  beside a filled cell; none while nothing is checked (ADR 21).
- **Empty cells** are faded, not hidden, still at a readable
  contrast.
- **Checks**: one table (amended after the first build, which had
  a table per rule), the combination first, then a column per
  variant. Each cell, in the grid's order, then each use of the
  one-off pairs, is a title spanning the row ("Text on Surfaces ·
  Body text" and its status) over a row per combination, as ADR
  20 draws them. A cell without checked pairs is left out: the
  grid shows it, and one hint replaces every "No pair yet".
  (Amended after the first build: a cell with several rules is
  one group, titled as its extra option, "Body text + Large text
  and UI", with each combination once, rather than a group per
  rule listing the same pairs twice. Also amended: **Override**
  is an icon button, and an APCA level reads "Lc 105", rounded
  down, with no grade, to narrow the table.)
- **Names**: each select is labelled by its couple ("Text on
  Surfaces", "Text among themselves").
- **Narrow panels**: the grid scrolls sideways, role names
  sticky, as in ADR 20.
- **Removed**: the rules under roles, "+ Rule" with its form and
  "New role…", "Remove rule", "used by …".

Amended after the first build, the polish: selects are styled as
the other fields and narrow (7.5rem), a status icon never wraps
below, and empty cells are faded by color (not `opacity`, which
would lower the contrast) to at least 4.5:1, in full on hover and
focus. Row names and group titles are sticky, on the theme's
background. Delete role is right-aligned at the end of the line,
the section headings are `h3` and larger. `addRule` and
`removeRule`, used only by tests, are gone.

Nothing saved changes, nor does the CLI.

## What it replaces

- ADR 16, 18: rules listed under their role, and their form.
- ADR 20's tables and **Override**, ADR 18's **+ Pair**, and ADR
  21's defaults stay.

The grid ADR 18 removed crossed every color, most couples asked
by nobody. This one crosses a few roles, and what a cell holds is
set there.

## Alternatives

- **The checks of a selected cell only**: shorter, but hides
  failures, and a cell would both select and set.
- **Uses as toggles in the cell**, several at once: three buttons
  in each cell, for combinations the strictest use mostly covers.
- **Only the filled cells, plus an add button**: the list of
  rules again.
- **Colors in the grid's headers**, no Roles section: rows too
  tall with many colors, and roles written twice.

## Plan

1. `setRule(fg, bg, use?)` in the palette store, replacing a
   couple's rules; tests (replace several, the diagonal, clear,
   undo, save).
2. The three sections, rough, judged by hand before the rest.
3. Labels, sticky names, fading; tests and SPEC.md. Remove what
   nothing uses anymore (`addRule` and `removeRule` if only tests
   are left).

## Later

- Editing a rule's own targets (Custom) from its cell.
