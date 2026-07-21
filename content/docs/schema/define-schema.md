---
title: defineSchema & field.*
description: The defineSchema function and fluent field.* builder API for defining your data model.
section: Schema
order: 2
---

# defineSchema & field.*

## `defineSchema(name, fields, options?)`

```ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('posts', { /* fields */ }, { /* options */ });
```

| Argument | Type | Description |
|---|---|---|
| `name` | `string` | Table name (snake_case) |
| `fields` | `Record<string, FieldDefinition>` | Field definitions |
| `options` | `SchemaOptions` | Table-level options (optional) |

---

## The `field.*` builder

Every `field.*` method returns a `FieldDefinition` object. Modifiers chain fluently in any order.

### Core field types

```ts
field.serial()           // auto-increment integer PK
field.string(length?)    // varchar(n) or text
field.integer()          // integer
field.boolean()          // boolean
field.timestamp()        // timestamp with timezone
field.date()             // date-only timestamp
field.json()             // json column
field.money()            // decimal(10,2)
field.richtext()         // text (for HTML/markdown content)
field.enum(...values)    // pgEnum
```

### Semantic field types

These map to underlying column types but add extra validation and model-level behaviour:

```ts
field.email()            // text — validates email format in Zod
field.password()         // text — hashed automatically on save
field.url()              // text — validates URL format
field.slug()             // text — validates slug format
field.uuid()             // uuid — defaults to gen_random_uuid()
```

### Modifiers (chainable)

```ts
field.string(255)
  .required()            // .notNull()
  .unique()              // .unique()
  .default('draft')      // .default(value)
  .optional()            // remove .notNull()
  .references('users.id') // foreign key

field.password()
  .required()
  .minLength(8)
  .requireUppercase()
  .requireNumbers()
  .hash()                // auto-bcrypt on create/update

field.integer()
  .primaryKey()
  .defaultRandom()       // for uuid PKs
```

### Alternative: inline object syntax

If you prefer plain objects over the builder:

```ts
defineSchema('users', {
  id:    { type: 'serial',   primary: true },
  name:  { type: 'string',   length: 255, required: true },
  email: { type: 'email',    required: true, unique: true },
  role:  { type: 'enum',     values: ['user', 'admin'], default: 'user' }
});
```

---

## Full example

```ts
// src/lib/users.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema(
  'users',
  {
    id:        field.serial().primaryKey(),
    name:      field.string(255).required(),
    email:     field.email().required().unique(),
    password:  field.password().required().minLength(8).hash(),
    role:      field.enum('user', 'admin', 'moderator').default('user'),
    bio:       field.string().optional(),
    avatarUrl: field.url().optional(),
    verified:  field.boolean().default(false),
    lastSeen:  field.timestamp().optional()
  },
  {
    timestamps: true,
    softDeletes: true,
    indexes: ['email', 'role'],
    hidden: ['password']           // exclude from .toJSON()
  }
);
```
