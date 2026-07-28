---
"omni-svelte": patch
---

fix: add string-based model resolution for relationships to prevent circular dependency issues between models, and add fallback to `ownerKey` / `localKey` during relation loading.
