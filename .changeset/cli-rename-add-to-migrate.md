---
"omni-svelte": minor
---

breaking: restructure CLI commands — `omni add` repurposed, `omni migrate` moved to `omni db migrate`

> **Migration guide:** See [CLI reference](/docs/cli) for the updated command structure.

- `omni add` is now for adding OmniSvelte features/plugins (coming soon), not for migrating a project
- Use `omni migrate sveltekit` to migrate an existing SvelteKit project
- `omni migrate` (database migrations) is now `omni db migrate`
- `omni db:migrate` colon-style alias is also available
