# Evals

## Isolation

Eval runs must not load the user's own Claude Code configuration, but
must keep the user's login. Probed with `claude -p` 2.x on `haiku`,
`--max-turns 1` (or 2 for the Bash probe), from an empty directory in
`/tmp`. No credential file was read or copied.

Command that works:

```sh
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude -p "<prompt>" \
	--setting-sources project --strict-mcp-config \
	--output-format stream-json --verbose
```

`--setting-sources project` alone drops the user's `CLAUDE.md` (and
the files it imports), settings, hooks, plugins and user skills,
contrary to the guess in ADR 4. Two leaks remain without the other
two switches: account-level claude.ai MCP connectors
(`--strict-mcp-config`) and the auto-memory instructions
(`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`).

| Approach                                            | Authenticated | CLAUDE.md loaded | Hooks applied   | Settings loaded                                                |
| --------------------------------------------------- | ------------- | ---------------- | --------------- | -------------------------------------------------------------- |
| none (control)                                      | yes           | yes              | yes (4 events)  | yes (34 skills, 9 plugins)                                     |
| `--setting-sources project`                         | yes           | no               | no              | no (3 built-in plugins, 19 built-in skills); claude.ai MCP and memory prompt remain |
| `--setting-sources project --restricted`            | yes           | no               | not tested      | no; also removes Bash, so unusable for evals                   |
| `CLAUDE_CONFIG_DIR=<empty dir>`                     | no ("Not logged in") | -         | -               | -                                                              |
| `CLAUDE_CODE_SIMPLE=1`                              | no ("Not logged in") | -         | -               | - (this is what `--bare` sets)                                 |
| `--setting-sources project --strict-mcp-config` + `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | yes | no | no | no; no MCP servers, no memory prompt |

How each was told:

- CLAUDE.md: "Answer only yes or no: do your instructions mention RTK?"
  gave yes for the control, no for every isolated run.
- Hooks: `--include-hook-events` in stream-json. The control logged
  `SessionStart`, `UserPromptSubmit` and `PreToolUse:Bash` hooks, the
  isolated runs none. (A model's recorded `tool_use` input is the
  pre-hook command, so it does not show `rtk` rewrites.)
- Settings: the `init` message lists plugins, skills and MCP servers.
  The user's settings disable bundled skills and claude.ai connectors;
  both come back as soon as user settings are dropped.
- Memory: asking whether the instructions mention a memory directory
  gave yes without the environment variable, no with it.

Remaining leaks: none seen. Managed (policy) settings, if any, would
still apply; there are none on this machine. The project's own
`CLAUDE.md`/`AGENTS.md` and `.claude/` in the cloned ref are loaded on
purpose, since agents are meant to read them.

The probes cost about $0.03 in total.
