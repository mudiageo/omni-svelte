---
title: Schema
description: Define your data model with defineSchema and the field.* builder API.
---

# Schema

omni-svelte uses a schema-driven approach: you define your data shapes once in `.schema.ts` files and the framework generates Drizzle tables, Zod validators, and typed model classes automatically.

---

## Defining a schema

Create any file ending in `.schema.ts` inside your `src/` directory:

```ts
// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema(
	'posts',
	{
		id: field.serial().primaryKey(),
		title: field.string(255).required(),
		slug: field.string().required().unique(),
		content: field.string().required(),
		published: field.boolean().default(false),
		userId: field.integer().required()
	},
	{
		timestamps: true,
		indexes: ['slug', 'published']
	}
);
```

omni-svelte discovers all `.schema.ts` files matching `input.patterns` and re-generates output whenever they change.

---

## Field types

### `field.*` builder (fluent API)

Every method returns a `FieldDefinition` object that is compatible with `defineSchema`. Modifiers can be chained in any order.

| Builder                 | Underlying type | Drizzle column          |
| ----------------------- | --------------- | ----------------------- |
| `field.serial()`        | `serial`        | `serial()`              |
| `field.string(length?)` | `string`        | `text()` / `varchar(n)` |
| `field.integer()`       | `integer`       | `integer()`             |
| `field.boolean()`       | `boolean`       | `boolean()`             |
| `field.email()`         | `email`         | `text()`                |
| `field.password()`      | `password`      | `text()`                |
| `field.url()`           | `url`           | `text()`                |
| `field.slug()`          | `slug`          | `text()`                |
| `field.timestamp()`     | `timestamp`     | `timestamp()`           |
| `field.date()`          | `date`          | `timestamp()`           |
| `field.json()`          | `json`          | `json()`                |
| `field.money()`         | `money`         | `decimal(10,2)`         |
| `field.richtext()`      | `richtext`      | `text()`                |
| `field.enum(...values)` | `enum`          | `pgEnum()`              |

### Chaining modifiers

```ts
field
	.string(255) // varchar(255)
	.required() // .notNull()
	.unique() // .unique()
	.default('draft'); // .default('draft')

field.password().required().minLength(8).requireUppercase().requireNumbers().hash(); // auto-bcrypt on create/update

field.boolean().default(false).optional();
```

### Inline object syntax (alternative)

You can also pass raw `FieldDefinition` objects without the builder:

```ts
defineSchema('users', {
	id: { type: 'serial', primary: true },
	name: { type: 'string', length: 255, required: true },
	email: { type: 'email', required: true, unique: true }
});
```

---

## Schema config options

The third argument to `defineSchema` controls table-level behaviour:

```ts
defineSchema('posts', fields, {
	// Automatically add createdAt / updatedAt timestamp columns
	timestamps: true,

	// Soft deletes — adds deletedAt column, filters queries automatically
	softDeletes: false,

	// Index definitions — string = single column, array = composite
	indexes: ['slug', ['userId', 'published']],

	// Which fields users may mass-assign (default: 'auto' = all non-PK, non-timestamp)
	fillable: 'auto',

	// Which fields are hidden from toJSON() (default: 'auto' = password fields)
	hidden: 'auto',

	// Real-time push events via WebSockets
	realtime: {
		enabled: true,
		events: ['created', 'updated', 'deleted'],
		channels: (record) => [`posts`, `users.${record.userId}`]
	}
});
```

---

## Generated outputs

When you run `pnpm dev` (or `pnpm build`), omni-svelte writes these files:

| Output           | Default path                  | Controlled by                |
| ---------------- | ----------------------------- | ---------------------------- |
| Drizzle schema   | `src/lib/db/server/schema.ts` | `schema.output.drizzle.path` |
| Zod validators   | `src/lib/db/validation/`      | `schema.output.zod.path`     |
| Model classes    | `src/lib/db/models/`          | `schema.output.model.path`   |
| TS ambient types | `src/omni-env.d.ts`           | Auto (do not edit)           |

Configure output paths in `svelte.config.js`:

```js
omni: {
  schema: {
    input:  { patterns: ['src/**/*.schema.ts'] },
    output: {
      drizzle: { path: 'src/lib/db/server/schema.ts', format: 'single-file' },
      zod:     { path: 'src/lib/db/validation',       format: 'per-schema'  },
      model:   { path: 'src/lib/db/models',           format: 'per-schema'  },
    },
    dev: { watch: true, generateOnStart: true },
  }
}
```

---

## TypeScript tip — ambient type declarations

If you import from sub-paths like `$models/posts.model` and see a red underline, add a file next to your `tsconfig.json`:

```ts
// test-env.d.ts  (or src/app.d.ts)
declare module '$models/posts.model' {
	export * from '$lib/db/models/posts.model';
}
```

> **Important**: always use the `$lib/...` alias (non-relative) inside `declare module` blocks. TypeScript forbids relative paths (`./`) in ambient module declarations.

The auto-generated `src/omni-env.d.ts` handles the barrel imports (`$models`, `$schema`, `$validation`, `$db`) — you only need `test-env.d.ts` for individual sub-path shims during development.
