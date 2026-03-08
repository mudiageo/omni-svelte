---
'omni-svelte': patch
---

## Fix: DrizzleGenerator now correctly serialises object and JSON defaults

Previously, setting `default: {}` (or any object) on a JSON/array field caused the generated Drizzle schema to emit invalid code like `.default([object Object])` or `.default(''{')`.

**Root cause**: `generateColumnDefinition` used plain template interpolation (`${field.default}`) for non-string values, which coerced objects to `[object Object]`.

**Fixed behaviour**:

| Default value        | Before (broken)             | After (correct)        |
| -------------------- | --------------------------- | ---------------------- |
| `{}` (object)        | `.default([object Object])` | `.default('{}')`       |
| `"{}"` (JSON string) | `.default('{}')` ✓          | `.default('{}')` ✓     |
| `[]` (array)         | `.default()`                | `.default('[]')`       |
| `null`               | `.default(null)` ✓          | `.default(null)` ✓     |
| `true` / `42`        | `.default(true)` ✓          | `.default(true)` ✓     |
| `'active'` (string)  | `.default('active')` ✓      | `.default('active')` ✓ |
