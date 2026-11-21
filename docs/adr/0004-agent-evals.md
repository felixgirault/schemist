# 4. Agent evals

## Context

The CLI exists so that agents can generate and check color
schemes. Whether it works for them depends as much on the README
and the error messages as on the code, and unit tests cannot
tell.

So far this was tested by hand: clone the branch, run headless
`claude -p` with a prompt, then read the transcripts and re-check
the agents' palettes with the CLI. It paid off:

- A fresh clone could not build the CLI (`svelte-kit sync`
  missing): 3 runs out of 3 hit it.
- Rewriting the README's agent loop moved APCA and color
  blindness checks from 0 runs out of 3 to 3 out of 3, and fixed
  every dark scheme that failed APCA.
- A harder prompt exposed slash names mangled in Sass, flat token
  files, and the lack of a color difference measure.

But each round used ad hoc shell loops and scripts, a regex hunt
for the agents' output files, and hand-written comparisons. It
cannot be re-run as is to check that a docs or CLI change did not
make agents worse.

## Goals

- Re-run the agent tests with one command, on any branch.
- Grade outcomes independently of what the agent claims: re-check
  its palettes with a CLI built from the ref under test.
- Grade the process too: did it build, check APCA and color
  blindness, iterate, or write its own color math.
- Results comparable between rounds: scores, costs, turns.

## Decision

### Not `claude plugin eval`

Claude Code's built-in harness was the first candidate. It has
the right shape (cases, graders, runs, scores, reports, isolated
runs), but its documentation
(`code.claude.com/docs/en/plugin-evals`) rules it out for now:

- "There are no custom-code graders": no grader can run the CLI
  on the agent's files, which is the grader that matters most. A
  regex on a file the agent wrote only checks what it claims.
- It targets plugins, and Schemist is not one.
- Shell commands run in an OS sandbox with network by allowed
  domain, and the setup script is limited to 120 s and to "files
  and git state". Whether `npm ci` can reach the registry is not
  documented.

Its format is reused, so that cases can move to it if custom-code
graders arrive.

### Layout

```
evals/
  README.md            How to run, what it costs
  run.mjs              Runs cases, collects results
  grade.mjs            Grades collected runs
  cases/
    website/
      prompt.md        Front matter + prompt
      expect.json      Pairs and targets for the check grader
      graders/*.md     One grader per file
    dashboard/
      …
  results/             Git-ignored
```

### Cases

`prompt.md` uses `claude plugin eval`'s front matter where it
applies: `runs` (default 3), `max_turns`, `timeout_seconds`,
`model`. The body is the prompt, which ends with an output
contract, so graders know where to look:

> Write the final trees to `out/<theme>.json` and the exports to
> `out/`.

Prompts name the tokens the graders check (`text/body`,
`bg/page`, …), instead of graders guessing names.

### Graders

One Markdown file per grader, with `type` and `weight` front
matter, as in `claude plugin eval`:

| Type          | Checks                                                                                |
| ------------- | ------------------------------------------------------------------------------------- |
| `tool_used`   | A tool call whose input matches `input_match` (e.g. `--blindness`), `min`/`max`       |
| `regex`       | A pattern in the transcript (`target: trace`) or in a file (`target: file`)           |
| `file_exists` | A file matching a glob in the run's directory                                         |
| `check`       | Every pair of `expect.json` meets its targets, re-checked with the CLI                |
| `llm`         | A question for a judge model, answered from the final message and the `check` results |

`check` is the reason for an own harness. `expect.json` lists the
trees and pairs:

```json
{
	"trees": ["out/light.json", "out/dark.json"],
	"pairs": [
		{
			"fg": "text/body",
			"bg": "bg/page",
			"wcag2": 7,
			"apca": 75
		},
		{"fg": "border/input", "bg": "bg/page", "wcag2": 3}
	],
	"hex": ["#be7ef3", "#1fb5a0"]
}
```

It fails on a missing tree, an invalid tree, a missing token, a
missing hex, or any pair under target in the worst case of the
three simulations. Its detail (each pair's levels) is kept for
the report and the `llm` grader, which judges whether the agent's
"couldn't meet" section matches reality.

Scoring follows `claude plugin eval`: a run's score is the
weighted fraction of graders passed, a case's score the mean of
its runs.

### Running

- `run.mjs` clones the ref under test (default: `HEAD`) once per
  run into a temporary directory, deletes `evals/` from the clone
  so the agent cannot read the graders, and runs
  `claude -p <prompt> --output-format stream-json` in it, with a
  timeout and up to `-j` runs at once. It keeps the transcript,
  the final message, `out/`, cost and turns.
- `grade.mjs` builds the CLI once from the same ref, separately
  from the runs, so that an agent changing the CLI cannot change
  its own grade, then grades every run and writes
  `results/<timestamp>/report.md`: a table per case of graders by
  run, scores, costs and turns.
- `npm run eval -- [--case <name>] [--runs <n>] [-j <n>] [--ref <ref>]`
  runs both.

Evals are not part of `npm test` nor CI: a round of both cases
costs about $5 and 10 minutes. They are run by hand after
changing the CLI, its errors or its docs, and before releases.

### Isolation

Runs must not load the user's settings, hooks or `CLAUDE.md`. The
manual rounds used `--setting-sources project`, which drops user
settings and hooks but probably not the global `CLAUDE.md`;
`--bare` would, but needs an API key. How to give each run a
temporary configuration while keeping the user's login is an open
question, settled by a spike in step 1.

## Alternatives rejected

- **`claude plugin eval` alone**: no grader can run the CLI.
- **`claude plugin eval` plus our check on its kept run
  directories** (`--keep-temp`): grading split between two tools,
  a dummy plugin manifest, and still the npm access question.
  Worth revisiting if custom-code graders arrive.
- **Running evals in CI**: costs and model variance make a
  failing run a signal to look at, not a gate.
- **Asking agents to write their own results to a file**: the
  agent writes what it believes, not what is true.

## Plan

1. Spike: run isolation with the user's login (temporary
   configuration directory, `--setting-sources`, …); record what
   works in `evals/README.md`.
2. `run.mjs` and `grade.mjs` with `tool_used`, `regex`,
   `file_exists` and `check`; unit tests for the grader logic on
   recorded transcripts and trees (from the manual rounds), so
   the harness is tested without paying for runs.
3. The two cases from the manual rounds, `website` and
   `dashboard`, with their output contract and `expect.json`.
4. The `llm` grader.
5. One real round of both cases; commit its report as a baseline
   in `evals/README.md`.
6. SPEC (evals section), README pointer, `.gitignore`.

## Consequences

- Prompts gain an output contract and named tokens, which makes
  them less natural than a real user's. The manual rounds without
  them remain the reference for discovery.
- Grades depend on the model and change with it; reports record
  the model used.
- Each round spends real money on the user's account.
