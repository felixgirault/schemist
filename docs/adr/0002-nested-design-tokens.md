# 2. Nested design tokens

## Context

The design tokens export (SPEC §11.8, `exportTokens` in
`core/export.ts`) is flat: every color is a key of a single
`Colors` group.

```json
{
	"Colors": {
		"$description": "…",
		"button/primary/bg": {
			"$type": "color",
			"$value": "#be7ef3"
		}
	}
}
```

Agents generating a design system palette named their tokens with
slashes (`button/primary/bg`), as most design systems do. Two of
the three runs of the harder agent test noted that the flat
output needs converting before token tools can use it: the Design
Tokens Community Group (DTCG) format expresses hierarchy with
nested groups, and forbids `.` in token names.

Two related problems exist today:

- **Duplicate names lose colors.** Tokens are built with
  `Object.fromEntries`, so two colors with the same name keep
  only the last one, silently.
- **Dots are invalid** in DTCG names, yet a name like
  `button.primary.bg` is exported as is.

## Goals

- Slash and dot separated names export as nested groups, in the
  app and the CLI.
- No color is ever dropped from the export.
- Palettes without separators export exactly as today.

## Decision

`exportTokens` splits each name on runs of `/` and `.`, dropping
empty segments, like variable names (`words()` in
`utils/strings.ts`). The segments are the path of the token under
`Colors`. Spaces stay part of a segment, as today.

```json
{
	"Colors": {
		"$description": "…",
		"button": {
			"primary": {
				"bg": {"$type": "color", "$value": "#be7ef3"}
			}
		}
	}
}
```

Nesting is always on, without an option: a name without
separators gives a one-segment path, which is today's output.

### Conflicts

DTCG does not allow a group to also be a token, and a path can
only hold one token. `exportTokens` returns the JSON and the list
of conflicting names instead of losing a color:

| Case                                                                          | Output                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A path is both a token and a group (`button/primary` and `button/primary/bg`) | The token stays flat under `Colors`, with its full name as key      |
| Two colors have the same path                                                 | The second and later ones get ` (2)`, ` (3)`… on their last segment |

- **CLI:** `export --format tokens` fails on any conflict, with a
  message naming the names involved, so an agent renames them. It
  is a tree problem, not a usage one: no usage text.
- **App:** the export modal shows a short notice above the code,
  listing the conflicting names. The output stays usable.

## Alternatives rejected

- **An option to nest or not**: no case for flat slash names was
  found, and one-segment names already give today's output.
- **Splitting on spaces too**: names like `Neutral white` are one
  token in every existing palette.
- **Rejecting conflicts in the app**: the export would vanish for
  a naming detail the user may not care about.
- **Group level `$type`**: valid DTCG, but per-token `$type` is
  simpler and already what tools read.

## Plan

1. Characterization: add export snapshot cases with slash, dot,
   conflicting and duplicate names, on the current code. They
   show today's flat output and the lost duplicate.
2. Nest in `exportTokens`, returning `{json, conflicts}`; update
   the snapshots of step 1 (the only snapshots allowed to change)
   and the app's tokens component.
3. CLI: fail on conflicts; tests.
4. App: conflict notice in the export modal; component test
   through `svelte/server`.
5. SPEC §11.8 and §14, README CLI section.

## Consequences

- Token files from palettes with slashes or dots change shape.
  That is the point of the change, but worth a line in the
  release notes.
- The notice is the first export state that is not pure output;
  keep it to one line.
