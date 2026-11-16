---
title: Auth Tables
description: Reference Better Auth tables from your schemas with the auth reference proxy, read-only models and inverse relations.
section: Schema
order: 6
---

# Auth Tables

OmniSvelte integrates [Better Auth](https://better-auth.com) directly into your database schema architecture. Instead of managing separate database migration streams or manually importing raw Drizzle tables, OmniSvelte automatically introspects Better Auth's schema into an internal **Auth Registry**, types all auth tables, generates read-only models, and enables seamless foreign key references and inverse relations from your schemas.

---

## The `auth.*` Reference Proxy

When defining schemas, you can reference any Better Auth table using the typed `auth` reference proxy exported from `omni-svelte/schema`.

```ts
import { defineSchema, field, relation, auth } from 'omni-svelte/schema';

export const postSchema = defineSchema('posts', {
	id: field.serial().primaryKey(),
	title: field.string(255).required(),
	content: field.text().required(),

	// Foreign key pointing to Better Auth user.id
	authorId: field.reference(() => auth.user).required(),

	// Virtual relation with inverse mapping
	author: relation.belongsTo(() => auth.user, {
		via: 'authorId',
		inverse: { name: 'posts', kind: 'hasMany' }
	})
});
```

### Supported Tables

The `auth` proxy supports all core Better Auth tables as well as tables added by Better Auth plugins:

- `auth.user` — User identity and credentials
- `auth.session` — Active user sessions
- `auth.account` — Linked OAuth accounts
- `auth.verification` — Email/token verification requests
- `auth.twoFactor` — Two-factor authentication credentials
- Plugin tables (e.g. `auth.organization`, `auth.member`, `auth.invitation`, `auth.passkey`, `auth.apiKey`, etc.)

---

## Automatic Primary-Key Type Inference

Traditional schemas often use integer or serial auto-incrementing primary keys. Better Auth, however, defaults to `text` (UUID/nanoid) strings for `user.id` and other table identifiers.

`field.reference()` automatically inspects the target table's primary key column type:

- Referencing `auth.user` produces a **`text`** foreign-key column matching `user.id`.
- Referencing a user schema with a `serial` primary key produces an **`integer`** foreign-key column.

```ts
// Produces a text column in Postgres/MySQL/SQLite with FK constraint -> user.id
field.reference(() => auth.user).required();

// Accepts all standard chainable modifiers
field
	.reference(() => auth.user)
	.optional()
	.unique();
```

> [!NOTE]
> You can pass either a thunk `() => auth.user` or a string key `field.reference('user')`. The thunk syntax is recommended for full editor autocomplete and compile-time type safety.

---

## Querying Read-Only Auth Models

OmniSvelte generates read-only model classes under `src/lib/db/models/auth/` (e.g., `User`, `Session`, `Account`).

These models allow you to read, query, filter, and eager-load auth data using OmniSvelte's standard Model and `resource()` APIs:

```ts
import { User } from '$lib/db/models/auth/user';

// Find user by ID
const user = await User.find('usr_123');

// Query with filters
const activeUsers = await User.query()
	.where('emailVerified', true)
	.orderBy('createdAt', 'desc')
	.get();

// Eager-load inverse relations
const userWithPosts = await User.with(['posts']).where('id', 'usr_123').first();
```

### Mutation Safety & `AUTH009`

Auth tables contain sensitive credentials, password hashes, and session tokens. To protect identity data integrity, **write operations are strictly prohibited** on auth models:

- **Model Level**: Generated auth classes extend `ReadonlyModel`. Mutation methods like `.create()`, `.update()`, and `.delete()` are absent from both TypeScript types and runtime instances. Calling them produces a runtime `TypeError`:

```ts
// ❌ Static type error (and runtime TypeError: User.create is not a function):
await User.create({ name: 'Alice', email: 'alice@example.com' });
await user.delete();
```

- **Remote Resource Guard (`AUTH009`)**: If a remote function attempts to expose write operations (`create`, `update`, `remove`) on an auth model via `resource()`, OmniSvelte blocks the operation at runtime with an `[AUTH009]` diagnostic:

```ts
// ❌ Throws [AUTH009] Cannot write to auth table "user" using resource():
export const { create: createUser } = resource(User, {
	only: ['create']
});
```

> [!IMPORTANT]
> All mutations to user credentials, accounts, and authentication states must be performed through Better Auth's official server or client APIs (`auth.api.signUpEmail`, `auth.api.updateUser`, etc.).

---

## Adding Custom Data: Profile Pattern vs `additionalFields`

When your application requires additional data associated with users, you have two primary options:

### 1. The Profile Pattern (Recommended)

Create a dedicated `profiles` schema linked to `auth.user`. This keeps identity authentication separate from application-specific business logic:

```ts
// src/lib/schemas/profile.schema.ts
import { defineSchema, field, relation, auth } from 'omni-svelte/schema';

export const profileSchema = defineSchema('profiles', {
	id: field.serial().primaryKey(),
	userId: field
		.reference(() => auth.user)
		.required()
		.unique(),
	bio: field.text().optional(),
	avatarUrl: field.string(500).optional(),
	preferences: field.json().default('{}'),

	user: relation.belongsTo(() => auth.user, {
		via: 'userId',
		inverse: { name: 'profile', kind: 'hasOne' }
	})
});

export const Profile = profileSchema.model;
```

**Advantages of the Profile Pattern:**

- Independent lifecycle, migrations, and access control.
- Allows fine-grained authorization rules via `resource(Profile, ...)`.
- No risk of polluting or breaking core authentication schemas.

### 2. The `additionalFields` Pattern

If you need columns directly on Better Auth's `user` table (for instance, a simple `role` or `plan`), define them in `vite.config.ts` under `auth.user.additionalFields`:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { omniSvelte } from 'omni-svelte/vite';
import { field } from 'omni-svelte/schema';

export default defineConfig({
	plugins: [
		omniSvelte({
			auth: {
				enabled: true,
				user: {
					additionalFields: {
						role: field.string().default('user'),
						bio: field.text().optional(),
						newsletter: field.boolean().default(false)
					}
				}
			}
		})
	]
});
```

OmniSvelte uses a **Permissive Hybrid** strategy:

- You can supply Omni field builders (`field.string().default('user')`).
- Or native Better Auth field configs (`{ type: 'string', required: true, defaultValue: 'user' }`).
- Changing `additionalFields` in `vite.config.ts` automatically updates the generated Drizzle tables and `.omni/schema.d.ts` without requiring a dev server restart.

---

## Inverse Relations on Auth Tables

Because auth tables are managed by Better Auth rather than an Omni `defineSchema`, you declare inverse relations on the referencing side using the `inverse` option:

```ts
export const commentSchema = defineSchema('comments', {
	id: field.serial().primaryKey(),
	body: field.text().required(),
	authorId: field.reference(() => auth.user).required(),

	author: relation.belongsTo(() => auth.user, {
		via: 'authorId',
		inverse: { name: 'comments', kind: 'hasMany' }
	})
});
```

OmniSvelte registers virtual relations in TypeScript via declaration merging:

```ts
import { resource } from 'omni-svelte/remote';
import { User } from '$lib/db/models/auth/user';
import '$models/posts.model';
import '$models/comments.model';
import '$models/profile.model';

// Eager load virtual inverse relations in remote queries
export const { list: userList } = resource(User, {
	with: ['posts', 'comments', 'profile']
});
```

---

## Many-to-Many Relations

You can associate users with other entities (such as organizations, workspaces, or roles) through join tables:

```ts
// src/lib/schemas/team-member.schema.ts
export const teamMemberSchema = defineSchema('team_members', {
	id: field.serial().primaryKey(),
	teamId: field.reference(() => teamSchema).required(),
	userId: field.reference(() => auth.user).required(),
	role: field.string(50).default('member'),

	user: relation.belongsTo(() => auth.user, {
		via: 'userId',
		inverse: { name: 'teamMemberships', kind: 'hasMany' }
	})
});
```

---

## Diagnostics and Troubleshooting

OmniSvelte validates all auth schema references and outputs targeted diagnostics:

| Code      | Message / Condition                                     | Remedy                                                                                              |
| --------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `AUTH001` | Unknown reference target                                | Verify the table name exists in Better Auth or check plugin configuration.                          |
| `AUTH002` | Registry unavailable or invalid                         | Run the auth generation step or ensure `.omni/auth-schema.ts` exists.                               |
| `AUTH003` | Composite or missing PK on referenced auth table        | Ensure the referenced auth table defines a single primary key column.                               |
| `AUTH004` | Registry key collision                                  | Verify unique table keys when configuring Better Auth plugins.                                      |
| `AUTH005` | Inverse relation name collision                         | Use a distinct `inverse.name` on your relationship declaration.                                     |
| `AUTH006` | User schema shadows auth table                          | Rename your schema; a schema cannot share the same name as a core auth table (e.g. `user`).         |
| `AUTH007` | Modifier incompatible with inferred type                | Do not apply numeric modifiers (`.unsigned()`, `.autoIncrement()`) to `text` PK references.         |
| `AUTH008` | Unsupported `additionalFields` type or callback default | Use supported types (`string`, `number`, `boolean`, `date`) and static literal default values.      |
| `AUTH009` | Write attempted on read-only auth table                 | Perform user writes through Better Auth's official API (`auth.api.*`), not through model mutations. |

---

## What Not to Do

- **Do NOT define a user schema named `user` or `users`** when authentication is enabled. Use the profile pattern (`defineSchema('profiles', ...)`) instead.
- **Do NOT execute `.create()`, `.update()`, or `.delete()`** on read-only auth models. All authentication records must be managed via Better Auth.
- **Do NOT use function-based default values in `additionalFields`** (e.g. `default(() => new Date())`). Functions cannot be serialized to static configuration files; use static literals or lifecycle hooks instead.
- **Do NOT manually re-generate or edit `.omni/auth-schema.ts`**. OmniSvelte syncs this file automatically whenever your auth configuration changes.
