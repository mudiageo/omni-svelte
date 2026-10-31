---
title: Relations
description: Model associations between schemas using field.reference() and the relation.* builder — from simple foreign keys to polymorphic joins.
section: Schema
order: 4
---

# Relations

OmniSvelte splits relationship modelling into two complementary pieces:

- **`field.reference()`** — adds the physical foreign-key column to the database table.
- **`relation.*`** — declares the virtual relationship used by the ORM graph for eager loading, type inference, and `resource()` `with:` options.

You almost always use them together. This page walks through every pattern from a simple belongs-to up to polymorphic associations.

---

## The two-part pattern

A relationship has two sides: the column that holds the key, and the declared association that tells the ORM what to do with it.

```ts
import { defineSchema, field, relation } from 'omni-svelte/schema';

export const postSchema = defineSchema('posts', {
  id:       field.serial().primaryKey(),
  title:    field.string(255).required(),

  // 1. The physical column — stores the integer FK value
  authorId: field.reference(() => userSchema).required(),

  // 2. The virtual relation — tells the ORM how to join
  author:   relation.belongsTo(() => userSchema, { via: 'authorId' }),
});
```

`field.reference()` generates an integer column with a database-level foreign key constraint. `relation.belongsTo` registers the association so you can write `resource(Post, { with: ['author'] })` and get the user record joined automatically.

> [!NOTE] The `via` option on `relation.belongsTo` must match the `field.reference()` column name. If you name the column `authorId`, pass `{ via: 'authorId' }`.

---

## `field.reference(target)`

```ts
field.reference(() => userSchema)
field.reference(() => userSchema).required()
field.reference(() => userSchema).required().unsigned()
```

| Field | Type | Description |
| --- | --- | --- |
| `target` | `() => Schema` | Thunk returning the referenced schema |

Produces an integer column with a database foreign-key constraint pointing at the target schema's primary key. Accepts the same chainable modifiers as `field.integer()` — `.required()`, `.optional()`, `.default()`, `.unsigned()`.

---

## One-to-many (`hasMany` / `belongsTo`)

The most common pattern. A post belongs to a user; a user has many posts.

```ts
// src/lib/schemas/user.schema.ts
export const userSchema = defineSchema('users', {
  id:    field.serial().primaryKey(),
  name:  field.string(255).required(),
  email: field.email().required().unique(),

  posts: relation.hasMany(() => postSchema),
});

// src/lib/schemas/post.schema.ts
export const postSchema = defineSchema('posts', {
  id:       field.serial().primaryKey(),
  title:    field.string(255).required(),
  authorId: field.reference(() => userSchema).required(),

  author:   relation.belongsTo(() => userSchema, { via: 'authorId' }),
});
```

On the **owning side** (`posts`): `field.reference()` for the column + `relation.belongsTo` for the join.  
On the **inverse side** (`users`): `relation.hasMany` only — no extra column needed.

---

## One-to-one (`hasOne` / `belongsTo`)

Same structure as one-to-many, but the foreign key is unique and the inverse uses `hasOne`.

```ts
// src/lib/schemas/profile.schema.ts
export const profileSchema = defineSchema('profiles', {
  id:     field.serial().primaryKey(),
  bio:    field.richtext().optional(),
  userId: field.reference(() => userSchema).required().unique(),

  user:   relation.belongsTo(() => userSchema, { via: 'userId' }),
});

// In userSchema:
profile: relation.hasOne(() => profileSchema),
```

---

## Many-to-many (`manyToMany`)

Requires a pivot schema that holds both foreign keys.

```ts
// src/lib/schemas/post-tag.schema.ts
export const postTagSchema = defineSchema('post_tags', {
  postId: field.reference(() => postSchema).required(),
  tagId:  field.reference(() => tagSchema).required(),
});

// In postSchema:
tags: relation.manyToMany(() => tagSchema, {
  through:     () => postTagSchema,
  pivotFields: ['createdAt'],   // optional: pull extra pivot columns
}),

// In tagSchema:
posts: relation.manyToMany(() => postSchema, {
  through: () => postTagSchema,
}),
```

Both sides declare `manyToMany` pointing at each other through the same pivot schema.

---

## Polymorphic associations (`morphTo` / `morphMany`)

A polymorphic relation lets one schema belong to multiple different schemas using a type discriminator column instead of multiple foreign keys.

```ts
// src/lib/schemas/comment.schema.ts
export const commentSchema = defineSchema('comments', {
  id:              field.serial().primaryKey(),
  body:            field.richtext().required(),
  commentableId:   field.integer().required(),   // the FK value
  commentableType: field.string().required(),    // the type discriminator ('post' | 'video')

  commentable: relation.morphTo({
    types: {
      post:  () => postSchema,
      video: () => videoSchema,
    }
  }),
});

// In postSchema — inverse side:
comments: relation.morphMany(() => commentSchema, { as: 'commentable' }),

// In videoSchema — inverse side:
comments: relation.morphMany(() => commentSchema, { as: 'commentable' }),
```

The `as` value on `morphMany` must match the prefix of the type/id columns (`commentable` → `commentableId` + `commentableType`).

> [!NOTE] For polymorphic relations there is no `field.reference()` — use plain `field.integer()` for the id column and `field.string()` for the type column, as there is no single target table to constrain against.

---

## Eager loading with `resource()`

Any relation declared with `relation.*` can be eager-loaded in `resource()` via the `with` option:

```ts
// data.remote.ts
export const { list: posts, get: post } = resource(Post, {
  with: ['author', 'tags', 'comments'],
  pagination: { perPage: 20 },
});
```

Nested relations are supported with dot notation:

```ts
with: ['author', 'comments.author']
```

---

## Full end-to-end example

```ts
// src/lib/schemas/user.schema.ts
import { defineSchema, field, relation } from 'omni-svelte/schema';

export const userSchema = defineSchema('users', {
  id:      field.serial().primaryKey(),
  name:    field.string(255).required(),
  email:   field.email().required().unique(),
  profile: relation.hasOne(() => profileSchema),
  posts:   relation.hasMany(() => postSchema),
}, { timestamps: true });

// src/lib/schemas/post.schema.ts
export const postSchema = defineSchema('posts', {
  id:       field.serial().primaryKey(),
  title:    field.string(255).required(),
  slug:     field.string().required().unique(),
  authorId: field.reference(() => userSchema).required(),

  author:   relation.belongsTo(() => userSchema, { via: 'authorId' }),
  tags:     relation.manyToMany(() => tagSchema, { through: () => postTagSchema }),
  comments: relation.morphMany(() => commentSchema, { as: 'commentable' }),
}, { timestamps: true });
```

---

## `relation.*` API Reference

| Builder | Kind | Owns FK? |
| --- | --- | --- |
| `relation.belongsTo(target, options?)` | Many-to-one | ✓ this schema |
| `relation.hasMany(target)` | One-to-many | ✓ target schema |
| `relation.hasOne(target)` | One-to-one | ✓ target schema |
| `relation.manyToMany(target, options)` | Many-to-many | ✓ pivot schema |
| `relation.morphTo(options)` | Polymorphic belongs-to | ✓ this schema |
| `relation.morphMany(target, options)` | Polymorphic has-many | ✓ target schema |

> [!TIP] Always use thunks (`() => schema`) for every `target` argument to prevent circular import errors between schema files.
