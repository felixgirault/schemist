# Agents

- To generate or check color schemes, use the CLI documented in
  the "Command-line interface" section of README.md (setup:
  `npm ci`, then `npm run cli:build`).
- Declare the pairs the palette must meet in the tree's root
  `pairs`, each with its targets: `wcag2` 4.5 and `apca` 60 for
  body text, `wcag2` 3 for input borders and focus rings, and
  `difference` 10 between categorical colors (chart series,
  tags). Then `eval` the tree with
  `--blindness protanomaly,deuteranomaly,tritanomaly`, read each
  pair's `levels` and `pass`, and iterate until every pair
  passes.
- SPEC.md is the reference for the codebase.
- Compatibility: permalinks already published (`?preset=` v1,
  also embedded in exports) must keep opening. A format change
  adds a new version and keeps reading the old ones; no other
  migration code is needed unless asked.
- Don't deploy until the declared pairs land on `main` (ADR 5):
  permalink version 2 is defined by both the port of `feature-v2`
  and the pairs.
