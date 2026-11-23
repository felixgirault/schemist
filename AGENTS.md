# Agents

- To generate or check color schemes, use the CLI documented in
  the "Command-line interface" section of README.md (setup:
  `npm ci`, then `npm run cli:build`).
- Declare the palette's requirements in the tree's root: `roles`
  (named lists of colors: surfaces, text, chart series) and
  `rules` (a role on a role, or a role among itself, each with a
  `use`): `body` (`wcag2` 4.5 and `apca` 75) for body text,
  `large` (`wcag2` 3) for input borders and focus rings, and
  `categories` (`difference` 10) between categorical colors
  (chart series, tags). A new color joins a role, not a list of
  pairs; `pairs` stays for an exception on one couple. Then
  `eval` the tree with
  `--blindness protanomaly,deuteranomaly,tritanomaly`, read each
  pair's `levels`, `pass` and `sources`, and iterate until every
  pair passes.
- SPEC.md is the reference for the codebase.
- Compatibility: permalinks already published (`?preset=` v1,
  also embedded in exports) must keep opening. A format change
  adds a new version and keeps reading the old ones; no other
  migration code is needed unless asked.
- Don't deploy until the declared pairs, roles and rules, and
  the variants (light, dark, …) land on `main` (ADR 5, ADR 16):
  permalink version 2 is defined by the port of `feature-v2`, the
  pairs, the roles and rules, and the variants.
