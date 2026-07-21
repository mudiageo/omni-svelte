---
title: Relationships
description: Define and query hasMany, belongsTo, hasOne, and belongsToMany relationships between OmniSvelte models.
section: Database
order: 4
---

# Relationships

OmniSvelte supports four relationship types, all defined in your schema options and resolved via `.with()` eager loading.

## Defining relationships

```ts
// src/lib/posts.schema.ts
defineSchema('posts', fields, {
  relationships: {
    author:   { type: 'belongsTo',    model: 'users',    foreignKey: 'userId' },
    comments: { type: 'hasMany',      model: 'comments', foreignKey: 'postId' },
    tags:     { type: 'belongsToMany', through: 'postTags', model: 'tags',
                foreignKey: 'postId', relatedKey: 'tagId' }
  }
});
```

## Relationship types

### `hasMany`

One post has many comments:

```ts
relationships: {
  comments: {
    type:       'hasMany',
    model:      'comments',
    foreignKey: 'postId'   // column on `comments` table
  }
}
```

### `belongsTo`

A comment belongs to one post:

```ts
relationships: {
  post: {
    type:       'belongsTo',
    model:      'posts',
    foreignKey: 'postId'   // column on THIS model's table
  }
}
```

### `hasOne`

A user has one profile:

```ts
relationships: {
  profile: {
    type:       'hasOne',
    model:      'profiles',
    foreignKey: 'userId'
  }
}
```

### `belongsToMany`

Posts and tags through a pivot table:

```ts
relationships: {
  tags: {
    type:        'belongsToMany',
    model:       'tags',
    through:     'postTags',     // pivot table name
    foreignKey:  'postId',
    relatedKey:  'tagId'
  }
}
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
