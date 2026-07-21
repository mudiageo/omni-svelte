---
title: Field Types
description: Complete reference for all field.* builder types and chainable modifiers.
section: Schema
order: 3
---

# Field Types

Complete reference for the `field.*` builder API.

## Core types

| Builder | Drizzle column | TypeScript type |
|---|---|---|
| `field.serial()` | `serial()` | `number` |
| `field.string(length?)` | `varchar(n)` / `text()` | `string` |
| `field.integer()` | `integer()` | `number` |
| `field.boolean()` | `boolean()` | `boolean` |
| `field.timestamp()` | `timestamp()` | `Date` |
| `field.date()` | `timestamp()` | `Date` |
| `field.json()` | `json()` | `unknown` |
| `field.money()` | `decimal(10,2)` | `string` |
| `field.richtext()` | `text()` | `string` |
| `field.enum(...values)` | `pgEnum()` | `union` |

## Semantic types

These map to underlying column types but also configure model validation and hooks:

| Builder | Column | Extra behaviour |
|---|---|---|
| `field.email()` | `text()` | Zod `.email()` validation |
| `field.password()` | `text()` | Auto-bcrypt via `.hash()` modifier |
| `field.url()` | `text()` | Zod `.url()` validation |
| `field.slug()` | `text()` | Zod slug-format validation |
| `field.uuid()` | `uuid()` | Auto `gen_random_uuid()` default |

## Modifiers (chainable)

All modifiers return the same `FieldDefinition` and can chain in any order:

```ts
// Column constraints
.required()          // .notNull()
.optional()          // removes .notNull()
.unique()            // .unique()
.primaryKey()        // .primaryKey()
.default(value)      // .default(value)
.defaultRandom()     // .defaultRandom() — for uuid PKs
.references(col)     // foreign key — 'table.column'

// String-specific
.minLength(n)        // Zod .min(n)
.maxLength(n)        // Zod .max(n)

// Password-specific
.requireUppercase()  // Zod custom validation
.requireNumbers()    // Zod custom validation
.hash()              // bcrypt on create/update

// Number-specific
.min(n)
.max(n)
.positive()
.integer()           // Zod .int()
```

## Examples

```ts
// UUID primary key
id: field.uuid().primaryKey().defaultRandom(),

// Required varchar with unique constraint
email: field.email().required().unique(),

// Auto-hashed password
password: field.password().required().minLength(8).hash(),

// Enum with default
role: field.enum('user', 'admin', 'moderator').default('user'),

// Foreign key
authorId: field.uuid().required().references('users.id'),

// Optional rich text
bio: field.richtext().optional(),

// JSON blob
metadata: field.json().optional(),
```
