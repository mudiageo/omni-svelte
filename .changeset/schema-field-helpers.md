---
'omni-svelte': minor
---

## New: `field.*` fluent field-definition builder

You can now define your schema fields using a chainable builder API instead of raw object literals.

### Before

```ts
defineSchema('posts', {
	id: { type: 'serial', primary: true },
	title: { type: 'string', length: 255, required: true },
	published: { type: 'boolean', default: false },
	password: {
		type: 'password',
		required: true,
		hash: 'bcrypt',
		validation: { min: 8, requireUppercase: true, requireNumbers: true }
	}
});
```

### After

```ts
import { defineSchema, field } from 'omni-svelte/schema';

defineSchema('posts', {
	id: field.serial().primaryKey(),
	title: field.string(255).required(),
	published: field.boolean().default(false),
	password: field.password().required().minLength(8).requireUppercase().requireNumbers().hash()
});
```

### Available factories

`field.serial()` · `field.string(length?)` · `field.integer()` · `field.boolean()` · `field.email()` · `field.password()` · `field.url()` · `field.slug()` · `field.timestamp()` · `field.date()` · `field.json()` · `field.money()` · `field.richtext()` · `field.array()` · `field.files()` · `field.enum(...values)`

### Available modifiers

`.primaryKey()` · `.required()` · `.optional()` · `.unique()` · `.default(value)` · `.hidden()` · `.unsigned()` · `.minLength(n)` · `.maxLength(n)` · `.requireUppercase()` · `.requireNumbers()` · `.hash(algorithm?)` · `.message(msg)` · `.validate(rules)`

Both the builder API and the original object-literal syntax remain fully supported — this is a non-breaking addition.
