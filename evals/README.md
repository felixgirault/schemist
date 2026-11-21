# Evals

Agent evals, see [ADR 4](../docs/adr/0004-agent-evals.md). They
call the model on your account: run them by hand, never in CI.

```sh
npm run eval -- [--case <name>] [--runs <n>] [-j <n>] [--ref <ref>]
                [--model <alias>] [--max-cost <usd>]
npm run eval:grade -- [<results dir>]   # re-grade, default: latest
```

`--case` is repeatable (default: every case), `--runs` overrides
the case's `runs` (default 3), `-j` runs up to 8 at once, and
`--model` replaces the model of every case for the round (e.g.
`sonnet`), `--max-cost` stops launching runs once the runs so far
cost that much, and `--ref` is the commit under test (default
`HEAD`; uncommitted changes are not tested). Needs `claude`
logged in, and network for `npm ci`.

Cost: on Sonnet, about $0.12 per `website` run and $0.45 per
`dashboard` run, so a default round of both is about $2. On Opus
(the manual rounds), about $0.40 and $1.20 to $1.50, so about $5.

## Files

```
evals/
  run.ts, grade.ts, eval.ts   Runner, grader, both in a row
  cases.ts, report.ts         Case loading, scoring and report
  frontmatter.ts, settings.ts Grader files: parsing and validation
  graders/                    One file per grader type, and index.ts
  schemist.ts, transcript.ts  The CLI as the graders call it, the
                              events of a transcript
  evals.test.ts, fixtures/    Tests, on recorded runs (no model)
  cases/<name>/               prompt.md, expect.json, graders/*.md
  results/<timestamp>/        Git-ignored
    <case>/run-<n>/           transcript.jsonl, final.md, meta.json,
                              stderr.log, out/ (copy of the
                              agent's out/)
    report.md
```

Each run happens in a fresh one-commit repository holding the ref
without `evals/`, removed afterwards: the agent finds the graders
neither in the files nor in the history. The grader builds the
CLI once from the same ref, in its own clone, so a run cannot
change its own grade. The code is TypeScript run directly by Node
(type stripping, hence the `.ts` extensions in imports) and
checked by `npm run check`.

## Cases

- `smoke`: a canary on haiku (about $0.05): builds the CLI and
  writes `types` to a file. Run it first to check the harness and
  the environment.
- `website`: "generate a color scheme for a basic website, light
  and dark", from a base color.
- `dashboard`: a rebrand with brand hex values, AAA body text,
  states, status colors and a color blind safe chart palette.

Prompts are kept verbatim (not reformatted), followed by an
output contract: where to write files and which token names to
use, so that graders know where to look.

## Baseline

Sonnet 5.5, `--model sonnet -j 3`, `smoke` once, `website` and
`dashboard` 3 times each.

| Case        | Before (8d32dd7) | After (f68c0ce) |
| ----------- | ---------------- | --------------- |
| `smoke`     | 1.00             | 1.00            |
| `website`   | 0.44             | 1.00            |
| `dashboard` | 0.78             | 1.00            |
| Cost        | $1.51            | $1.71           |

Before, the README's agent loop started 91 lines into its CLI
section, and every `website` agent read only the first 80 lines
(`grep -A80`): they checked WCAG 2 alone, without simulations,
and failed APCA on muted text and the color blind worst case on
input borders. `dashboard` agents checked APCA because the prompt
requires it, but 2 of 3 still missed status text and chart colors
under simulation. Moving the loop to the top of the section, and
into `AGENTS.md`, made every run check both metrics with
`--blindness` and iterate until all pairs passed. (The "before"
scores are re-graded with the fixed `apca` grader; the `website`
contract also gained what each color is for between the rounds.)

Scores at 1.00 mean the cases no longer separate good runs from
bad ones on Sonnet: a regression shows as a drop, an improvement
needs a harder case.

## How graders work

A grader is a Markdown file in `cases/<name>/graders/`: flat
`key: value` front matter between `---` lines (strings, quoted or
not, numbers, booleans; anything else is an error), and a
description as body. `type` is required and `weight` defaults to
1; the other settings depend on the type. Mistakes (unknown type,
missing or mistyped setting, invalid regular expression) are
reported when the case is loaded, before any paid run. Each type
lives in `graders/<type>.ts`, with its settings and an example.

| Type          | Passes when                                                                                   | Example                                                                |
| ------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tool_used`   | `tool` (or `Write\|Edit`) was called `min` (default 1) to `max` times, input matching a regex | `tool: Bash`, `input_match: --blindness`                               |
| `regex`       | `pattern` is found in the transcript or in a file (not found with `expect: absent`)           | `target: file`, `path: out/light.json`, `pattern: #be7ef3`, `flags: i` |
| `file_exists` | `min` (default 1) files match the glob `path`, relative to the run directory                  | `path: out/{light,dark}.json`, `min: 2`                                |
| `check`       | every tree and pair of the case's `expect.json` is valid and meets its targets                | no settings                                                            |

`check` re-checks the agent's trees with the CLI built from the
ref, not with what the agent claims. For each tree of
`expect.json` it reads the colors, then asks for the level of
each pair that has a `wcag2` or `apca` target, in the worst case
of the three color blindness simulations. It fails when a tree is
missing or invalid, a pair's token is missing, a pair is under
its target in any tree, or an expected `hex` is in no tree. The
report lists the problems and each failed pair with its level and
target.

A run's score is the weighted fraction of graders passed, a
case's score the mean of its runs.

## Isolation

Eval runs must not load the user's own Claude Code configuration,
but must keep the user's login. Probed with `claude -p` 2.x on
`haiku`, `--max-turns 1` (or 2 for the Bash probe), from an empty
directory in `/tmp`. No credential file was read or copied.

Command that works:

```sh
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude -p "<prompt>" \
	--setting-sources project --strict-mcp-config \
	--output-format stream-json --verbose
```

`--setting-sources project` alone drops the user's `CLAUDE.md`
(and the files it imports), settings, hooks, plugins and user
skills, contrary to the guess in ADR 4. Two leaks remain without
the other two switches: account-level claude.ai MCP connectors
(`--strict-mcp-config`) and the auto-memory instructions
(`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`).

| Approach                                                                              | Authenticated        | CLAUDE.md loaded | Hooks applied  | Settings loaded                                                                     |
| ------------------------------------------------------------------------------------- | -------------------- | ---------------- | -------------- | ----------------------------------------------------------------------------------- |
| none (control)                                                                        | yes                  | yes              | yes (4 events) | yes (34 skills, 9 plugins)                                                          |
| `--setting-sources project`                                                           | yes                  | no               | no             | no (3 built-in plugins, 19 built-in skills); claude.ai MCP and memory prompt remain |
| `--setting-sources project --restricted`                                              | yes                  | no               | not tested     | no; also removes Bash, so unusable for evals                                        |
| `CLAUDE_CONFIG_DIR=<empty dir>`                                                       | no ("Not logged in") | -                | -              | -                                                                                   |
| `CLAUDE_CODE_SIMPLE=1`                                                                | no ("Not logged in") | -                | -              | - (this is what `--bare` sets)                                                      |
| `--setting-sources project --strict-mcp-config` + `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | yes                  | no               | no             | no; no MCP servers, no memory prompt                                                |

How each was told:

- CLAUDE.md: "Answer only yes or no: do your instructions mention
  RTK?" gave yes for the control, no for every isolated run.
- Hooks: `--include-hook-events` in stream-json. The control
  logged `SessionStart`, `UserPromptSubmit` and `PreToolUse:Bash`
  hooks, the isolated runs none. (A model's recorded `tool_use`
  input is the pre-hook command, so it does not show `rtk`
  rewrites.)
- Settings: the `init` message lists plugins, skills and MCP
  servers. The user's settings disable bundled skills and
  claude.ai connectors; both come back as soon as user settings
  are dropped.
- Memory: asking whether the instructions mention a memory
  directory gave yes without the environment variable, no with
  it.

Remaining leaks: none seen. Managed (policy) settings, if any,
would still apply; there are none on this machine. The project's
own `CLAUDE.md`/`AGENTS.md` and `.claude/` in the cloned ref are
loaded on purpose, since agents are meant to read them.

The probes cost about $0.03 in total.
