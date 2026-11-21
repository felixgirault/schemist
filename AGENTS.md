# Agents

- To generate or check color schemes, use the CLI documented in
  the "Command-line interface" section of README.md (setup:
  `npm ci`, then `npm run cli:build`).
- Check every palette with `eval --pair` under both
  `--contrast wcag2` and `--contrast apca`, each with
  `--blindness protanomaly,deuteranomaly,tritanomaly`, and read
  `minLevel`: aim for 4.5 and Lc 60 for body text, 3 for input
  borders and focus rings, and iterate until every pair passes.
- SPEC.md is the reference for the codebase.
