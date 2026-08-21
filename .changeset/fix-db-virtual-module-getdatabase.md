---
"omni-svelte": patch
---

fix($db virtual module): import `getDatabase` instead of non-existent `database` named export

The `$db` virtual module was generating code that imported `database` from
`omni-svelte/database`. However, `database` is not exported from
`src/database/index.ts` — only `configureDatabase` and `getDatabase` are.

This caused a runtime error when any code imported from `$db`.

The fix calls `getDatabase()` after `configureDatabase()`, which is already
the established pattern throughout the codebase (hooks, migrations, models, etc.)
and correctly returns the initialized database instance.

**Before (broken):**
```ts
import { configureDatabase, database } from 'omni-svelte/database';
configureDatabase({...});
export { database as db };
export default database;
```

**After (fixed):**
```ts
import { configureDatabase, getDatabase } from 'omni-svelte/database';
configureDatabase({...});
const db = getDatabase();
export { db };
export default db;
```
