---
'omni-svelte': minor
---

Add the `inverse` option to `relation.belongsTo` (and `relation.manyToMany`) so the owning schema can declare the inverse relation on a Better Auth table, for example `inverse: 'posts'`. `resource(User, { with: ['posts'] })` then works without editing auth tables.
