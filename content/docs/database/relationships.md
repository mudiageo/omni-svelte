---
title: Relationships
description: Define and query hasMany, belongsTo, hasOne, and belongsToMany relationships between OmniSvelte models.
section: Database
order: 4
---

# Relationships

OmniSvelte supports fluent relationships defined directly in your schema, powering both auto-generated Drizzle 1.0 relations (`defineRelations`) and ActiveRecord `.with()` eager loading.

## Defining relationships

Relationships can be defined inline using the `relation.*` helpers in your schema definition:

```ts
// src/lib/posts.schema.ts
import { defineSchema, field, relation } from 'omni-svelte/schema';
import { userSchema } from './users.schema';
import { commentSchema } from './comments.schema';

export const postSchema = defineSchema('posts', {
  id: field.serial().primaryKey(),
  title: field.string(255).required(),
  authorId: field.integer().required(),
  
  // Inline relations
  author: relation.belongsTo(() => userSchema, { via: 'authorId' }),
  comments: relation.hasMany(() => commentSchema),
}, {
  timestamps: true
});
```

## Relationship helpers

### `relation.belongsTo`

A record belongs to a parent record (foreign key on this table):

```ts
author: relation.belongsTo(() => userSchema, { via: 'authorId' })
```

*Generated Drizzle:*
```ts
author: r.one.users({
  from: r.posts.authorId,
  to: r.users.id
})
```

### `relation.hasMany`

A record owns many child records (foreign key on target table):

```ts
comments: relation.hasMany(() => commentSchema, { via: 'postId' })
```

*Generated Drizzle:*
```ts
comments: r.many.comments()
```

### `relation.hasOne`

A record has exactly one child record (foreign key on target table):

```ts
profile: relation.hasOne(() => profileSchema, { via: 'userId' })
```

*Generated Drizzle:*
```ts
profile: r.one.profiles({
  from: r.profiles.userId,
  to: r.posts.id
})
```

### `relation.manyToMany`

Records related through a pivot table:

```ts
tags: relation.manyToMany(() => tagSchema, { through: 'postTags' })
```

## Eager loading

Use `.with()` before a terminator to load related models:

```ts
// Single relationship
const post = await Posts.with(['author']).find(1);

// Multiple relationships
const post = await Posts.with(['author', 'comments', 'tags']).find(1);

// Nested (author with their profile)
const post = await Posts
  .with(['author.profile', 'comments.author'])
  .find(1);

// On query builder
const posts = await Posts
  .query()
  .where('published', true)
  .with(['author', 'tags'])
  .limit(10)
  .get();
```

## Accessing related data

```ts
const post = await Posts.with(['author', 'comments', 'tags']).find(1);

console.log(post.author.name);
console.log(post.comments.length);
console.log(post.tags.map(t => t.name));
```

## Querying through relationships

```ts
// Posts where author is verified
const posts = await Posts
  .query()
  .whereHas('author', q => q.where('verified', true))
  .get();

// Count related
const postsWithComments = await Posts
  .query()
  .withCount('comments')
  .get();

console.log(posts[0].commentsCount);
```
