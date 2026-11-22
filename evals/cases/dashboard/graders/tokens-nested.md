---
type: regex
target: file
path: out/light.tokens.json
pattern: '"button":\s*\{[\s\S]*?"primary":\s*\{'
---

Slashes in token names become nested groups in the design tokens
file, as the CLI's `export --format tokens` produces them.
