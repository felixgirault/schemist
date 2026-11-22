# 5. Port feature-v2 onto main

## Context

`feature-v2` and `main` split at `02fdfda` (24 October 2026).
`feature-v2` gathered 54 commits from 7 pull requests in two
days, then stopped; `main` went on with the core library, the
CLI, nested tokens, color difference and agent evals (ADRs 1 to
4). The declared pairs work (`feature-difference-view`,
`feature-unified-grid`) is built on `main`.

`feature-v2` was never deployed, so its permalinks don't exist in
the wild.

The two lines overlap in a few places:

- **The same refactor, twice**: domain types and pure functions
  moved out of the stores, into `core/` on `main` (for the CLI),
  into `model/` on `feature-v2` (its ADR 6), under other names
  (`PresetNode` and `NodeData`, `evaluate` and `evaluateTree`).
- **Permalink version 2 means two things**: lossless colors on
  `feature-v2`, declared pairs on `feature-difference-view`.
- **ADR numbers 1 to 6 exist on both lines** with other subjects.

## Goals

- Every feature and fix of `feature-v2` on `main`, nothing lost.
- `main`'s structure kept: `core/` stays the layer shared by the
  app and the CLI, and the CLI works after each step.
- One permalink version for lossless colors and pairs.

## Decision

Port feature by feature on a branch from `main` (`port-v2`), one
reviewable step at a time, using `feature-v2`'s code as reference
and cherry-picking where it applies cleanly. Replaying the 54
commits was rejected: the moves to `model/` would conflict with
`core/` at almost every commit.

### What moves, and where

| feature-v2                               | Commits                                                               | On main                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Data layer typing (its ADR 6)            | `e8d337f` to `88eaf98`                                                | In `core/`, not `model/`; CLI tree validation reused to validate unpacking |
| Parametric presets (its ADR 4)           | `80fab6f`, `1e5b063`, `0f33654`, `05502c8`, `2960ec3`, `641fdc4`      | After typing, which `definePreset` needs                                   |
| Color swapping (its ADR 3)               | `027a64e` to `08bbdc1`                                                | As is                                                                      |
| Snapshots, undo, persistence (its ADR 2) | `271d0dd` to `7d1e05b`                                                | Stable ids in memory only; persistence to `localStorage` changes SPEC §8   |
| Node popovers                            | `ebeb70b`                                                             | As is                                                                      |
| Lossless permalinks (its ADR 1 context)  | `8072902`, `80b394a`, `cb4360d`                                       | Packing version 2, which pairs extend later                                |
| Fixes for SPEC §13 known issues          | `832ed05` (highlight temperature), `5833331` (tokens with `,` or `@`) | Removes both items from §13                                                |
| Color fixes                              | `1d4ac06`, `00336f7`, `50d918d`, `c955f80`                            | `c955f80` (simulation in linear RGB) changes measured levels               |
| Other                                    | `3540fea` (obsolete package script)                                   | With step 1                                                                |
| Proposed ADRs: URL compression, HCT      | `44199c5`, `a7ccbbd`                                                  | Copied as proposed, renumbered                                             |

The triad right and tetrad right nodes and the `semanticPairs`
preset are already on `main`; `feature-v2` only changed them
while making presets parametric and typing definitions, so those
changes come with steps 2 and 3.

### Order

1. **Color fixes and known issues**: highlight temperature,
   tokens with special characters, ranges, chroma clamping,
   missing channels, simulation in linear RGB. Independent of the
   rest, and they change results, so they go first, alone, with
   the CLI tests and README examples updated.
2. **Data layer typing** in `core/`: node types as a checked
   union, typed definition arguments (`defineNode`), `PresetNode`
   renamed `NodeData` (and "preset" kept for parametric presets),
   unpacking validated with the CLI's tree checks, private `Node`
   links, `NodeOutput` as `{color, name}`, `PaletteColor`.
   Everything below depends on it.
3. **Parametric presets**, with the new nodes and presets.
4. **Color swapping**.
5. **Snapshots, undo and persistence**.
6. **Node popovers**.
7. **Lossless permalinks** (version 2).
8. **Proposed ADRs** copied over, renumbered.

Each step updates SPEC.md and README.md for what it changes, and
keeps the app, the CLI and their tests passing.

This ADR's commit also adds to AGENTS.md the compatibility rule
recorded on `feature-difference-view` (published v1 permalinks
must keep opening; a format change adds a version), and the rule
that no deployment happens until the declared pairs land.

### Permalinks

No deployment happens between this port and the declared pairs
(user's decision, November 2026). So version 2 is defined once,
with lossless colors and pairs: the port adds the lossless part,
and the pairs work extends the same version when it is rebased.
Version 1 keeps opening (AGENTS.md).

### ADR numbers

`feature-v2`'s accepted ADRs land on `main` first, in the order
of the steps: typing 6, parametric presets 7, color swapping 8,
snapshots and undo 9 (this one is 5). Its two proposed ones
become 10 (URL compression) and 11 (HCT). The difference view and
declared pairs ADRs (5 and 6 on their branches) become 12 and 13
when rebased.

### Then

Rebase `feature-difference-view` and `feature-unified-grid` onto
the ported `main`:

- snapshots and history include the declared pairs;
- pairs extend permalink version 2;
- swapping keeps pairs, since the node object stays the same;
- names and types follow the typing step (`NodeData`,
  `PaletteColor`).

## Alternatives rejected

- **Merging `feature-v2` as is**: undoes one of the two
  refactors, and breaks the CLI, which depends on `core/`.
- **Replaying its 54 commits**: conflicts at almost every commit
  of the `model/` move.
- **`model/` instead of `core/`**: the CLI, its tests and SPEC
  already rely on `core/`.
- **Pairs as permalink version 3**: only needed if a version 2
  were deployed first, which it won't be.

## Consequences

- The simulation fix (`c955f80`) changes CLI outputs and may move
  eval results: re-run the evals after step 1.
- `localStorage` persistence (step 5) means a reload keeps the
  palette; SPEC §8's "nothing is persisted but the dark scheme"
  changes.
- `feature-v2` and its descendant branches
  (`feature-combination-grid`, `grid-*`) stay as references;
  nothing is deleted.
