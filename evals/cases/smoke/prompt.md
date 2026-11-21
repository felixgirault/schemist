---
runs: 1
max_turns: 15
timeout_seconds: 300
model: haiku
---
Set up the Schemist CLI and check that it works: run `npm ci`, then `npm run cli:build`, then write the output of `npm run -s cli -- types` to `out/types.json`. If a step fails, write the error to `out/error.txt` instead.
