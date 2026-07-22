---
"omni-svelte": minor
---

## Breaking Changes: CLI command restructuring

### `omni add` is no longer for installing OmniSvelte into an existing project

`omni add` has been repurposed to add **OmniSvelte features and plugins** (auth, drizzle, shadcn, docker, etc.) to a project that already has OmniSvelte installed. The feature add-on system is shipping in a future release; running `omni add` today will show the planned feature list.

**Before:**
```sh
omni add                        # installs omni-svelte into current project
omni add --package-manager pnpm # with explicit package manager
```

**After — use `omni migrate` instead:**
```sh
omni migrate                    # migrates current project to OmniSvelte (interactive)
omni migrate sveltekit          # explicit: migrate from a vanilla SvelteKit project
omni m sveltekit --package-manager pnpm
```

---

### `omni migrate` is no longer a top-level database command

The old `omni migrate` (which ran Drizzle migrations) has been moved under the `omni db` namespace, consistent with all other database operations.

**Before:**
```sh
omni migrate
omni migrate up
```

**After — use `omni db migrate` instead:**
```sh
omni db migrate
omni db:migrate   # colon-style alias also available
```

---

### Summary of command changes

| Old command | New command | Notes |
|---|---|---|
| `omni add` | `omni migrate` | Project migration (alias: `omni m`) |
| `omni migrate` | `omni db migrate` | Database migrations |
| `omni migrate up` | `omni db migrate` | |
| `omni migrate rollback` | `omni db rollback` | |
| `omni migrate fresh` | `omni db fresh` | |
| *(new)* | `omni add [feature]` | Feature/plugin add-ons (coming soon) |
| *(new)* | `omni db:migrate` | Alias for `omni db migrate` |
