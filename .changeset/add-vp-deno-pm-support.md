---
'omni-svelte': minor
---

Add Vite+ (vp) and Deno package manager support to the CLI.

- Extended `PackageManager` type with `'deno'` and `'vp'`
- Added command mappings for both managers (install, add, run/task, exec/dlx)
- Vite+ projects are auto-detected via `vite-plus` import in vite.config.ts
- Deno detection uses upstream `package-manager-detector` library
- Interactive package manager selection prompt during `omni init` and `omni add`
