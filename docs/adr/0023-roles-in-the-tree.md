# 23. Roles in the tree

## Context

A role says what a color is, so Roles moved under the palette
(ADR 22, amended). It is still a second list of the colors, far
from the tree's own rows and, with a long palette, from Targets.
Setting roles on the rows was rejected because a preset is one
row for several colors, which have none.

## Decision

- **A preset lists its colors** under its row, read-only: a line
  each, with swatch, name and roles, in a `<details>` ("9
  colors"), open by default. Open or closed is not saved. The
  list is flat, in the order of `generated`: ids don't hold the
  template's nesting. Hidden template colors have no line, as
  they are not colors of the palette. (Amended after the build:
  no swatches. Open, each line draws its part of the preset's
  bar, rather than a gradient that a wrapped name would put out
  of line.) The preset's own row has no roles: it is not a color.
- **Roles on a row**: a color's roles are written on its label
  line ("custom color · Text, Borders"). A **Roles** button, an
  icon, the only one on a generated color's line, opens a popover
  (as Info and Tune) with a checkbox per role, calling
  `addMember` and `removeMember`: one click, one undo. It is
  named by its color ("Roles of Ink"). Without roles, the popover
  says to add one in Targets.
- **Roles are managed in Targets**: a row header is the role's
  name as a field, and **Delete role**; **+ Role** is under the
  table, with its form. Column headers stay text. Without roles,
  the Targets section stays, with **+ Role** and a hint.
- **The Roles section goes**, with its chips, picker and search.
- **Names that can't be saved**: a role on a color whose name
  another color has is left out of the saved palette
  (`unsavedMembers`), and nothing shows it today: the role is
  lost on reload. Such a row with roles gets a warning icon, with
  a text saying that its roles won't be saved until one of the
  colors is renamed.

Nothing saved changes, nor does the CLI.

## Checked before deciding

- Every preset used twice on the same color without tokens gives
  each name twice. Used once, none collides with itself, but the
  first of the Material tones has its parent's name ("$"). Hence
  the warning.
- Generated ids are positions. Scale (steps), Rainbow (colors),
  Harmonies and Schemist theme (their toggles) change how many
  colors they make, so a role can move to another color: turning
  Secondary off in Schemist theme shifts all that follow. It is
  so today, for pairs too; the lines make it visible.

## What it replaces

- ADR 22: the Roles section, wherever it is.
- ADR 16's later "read-only role tags in the tree".

## Alternatives

- **Keeping the Roles section too**: a role's colors in one
  place, but two ways to do one thing. What is lost: a role
  without rules shows its colors in the tree only; with rules,
  Checks names them.
- **Presets closed by default**: shorter, but a color that can't
  be seen can't be given a role.
- **Roles on the preset itself**, for all its colors: a scale's
  steps have different roles.
- **Ids that survive a change of count** (by token): tokens are
  optional, and guessed names change with the color. Pairs need
  it as much; a decision of its own.

## Plan

1. Presets list their colors, read-only, in the tree.
2. Roles on rows: the label, the button and popover, for nodes
   and generated colors; the warning.
3. Roles managed in Targets; the Roles section removed. Steps 1
   to 3 are a rough version, judged by hand before the rest.
4. Polish, narrow widths, tests and SPEC.md to their final state.

## Later

- Stable ids for generated colors.
- A role given to several colors at once.
