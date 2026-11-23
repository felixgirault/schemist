---
type: regex
target: file
path: out/palette.json
pattern: '"use"\s*:\s*"body"|"apca"\s*:'
---

The palette requires APCA contrast: a rule for body text (WCAG 2
4.5 and APCA 75) or an explicit `apca` target, which `eval` then
checks.
