---
title: Field Builder API
description: Quick reference for all field.* methods and chainable modifiers.
section: Reference
order: 2
---

# Field Builder API

Quick reference for the `field.*` builder imported from `omni-svelte/schema`.

## Import

```ts
import { defineSchema, field } from 'omni-svelte/schema';
```

## Core builders

| Method | Signature | Drizzle column |
|---|---|---|
| `field.serial()` | `() → FieldDef` | `serial()` |
| `field.string(n?)` | `(length?: number) → FieldDef` | `varchar(n)` / `text()` |
| `field.integer()` | `() → FieldDef` | `integer()` |
| `field.boolean()` | `() → FieldDef` | `boolean()` |
| `field.timestamp()` | `() → FieldDef` | `timestamp()` |
| `field.date()` | `() → FieldDef` | `timestamp()` |
| `field.json()` | `() → FieldDef` | `json()` |
| `field.money()` | `() → FieldDef` | `decimal(10,2)` |
| `field.richtext()` | `() → FieldDef` | `text()` |
| `field.enum(...v)` | `(...values: string[]) → FieldDef` | `pgEnum()` |

## Semantic builders

| Method | Column | Extra |
|---|---|---|
| `field.email()` | `text()` | Zod `.email()` |
| `field.password()` | `text()` | auto-bcrypt via `.hash()` |
| `field.url()` | `text()` | Zod `.url()` |
| `field.slug()` | `text()` | slug regex |
| `field.uuid()` | `uuid()` | `defaultRandom()` |

## Modifiers

| Modifier | Effect |
|---|---|
| `.required()` | `.notNull()` |
| `.optional()` | removes notNull |
| `.unique()` | unique constraint |
| `.primaryKey()` | primary key |
| `.default(v)` | column default |
| `.defaultRandom()` | random default (uuid) |
| `.references(col)` | foreign key `'table.col'` |
| `.minLength(n)` | Zod `.min(n)` |
| `.maxLength(n)` | Zod `.max(n)` |
| `.min(n)` | Zod `.min(n)` |
| `.max(n)` | Zod `.max(n)` |
| `.positive()` | Zod `.positive()` |
| `.integer()` | Zod `.int()` |
| `.requireUppercase()` | password: must have uppercase |
| `.requireNumbers()` | password: must have numbers |
| `.hash()` | auto-bcrypt on save |
