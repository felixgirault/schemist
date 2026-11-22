# Agents

- To generate or check color schemes, use the CLI documented in
  the "Command-line interface" section of README.md (setup:
  `npm ci`, then `npm run cli:build`).
- Check every palette with `eval --pair` under both
  `--contrast wcag2` and `--contrast apca`, each with
  `--blindness protanomaly,deuteranomaly,tritanomaly`, and read
  `minLevel`: aim for 4.5 and Lc 60 for body text, 3 for input
  borders and focus rings, and iterate until every pair passes.
  For categorical colors (chart series, tags), also check every
  pair with `--difference` and aim for a `difference.minLevel` of
  at least 10.
- SPEC.md is the reference for the codebase.
- Compatibility: permalinks already published (`?preset=` v1,
  also embedded in exports) must keep opening. A format change
  adds a new version and keeps reading the old ones; no other
  migration code is needed unless asked.
- Don't deploy until the declared pairs land on `main` (ADR 5):
  permalink version 2 is defined by both the port of `feature-v2`
  and the pairs.
