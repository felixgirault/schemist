---
type: regex
target: file
path: out/palette.json
pattern: '"use"\s*:\s*"categories"|"difference"\s*:'
---

The palette requires the chart colors to differ: a Categories rule
(difference 10) or an explicit `difference` target, which `eval`
then checks.
