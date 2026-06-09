---
'omni-svelte': patch
---

Add `--package-manager` flag to the `add` command.

- Users can now specify `--package-manager <name>` on `omni add` (already existed on `omni init`)
- When the flag is omitted, both `init` and `add` now prompt interactively to choose a package manager
- Supports all six package managers: npm, pnpm, yarn, bun, deno, vp
