---
title: Querying
description: The full query builder API available on every OmniSvelte Model class.
section: Database
order: 3
---

# Querying

Every generated Model class exposes a fluent `query()` builder alongside direct static methods for the most common patterns.

## Static shorthand methods

```ts
import { Posts } from '$models/posts.model';

// Find by primary key — returns null if not found
const post = await Posts.find(1);

// Find all with options
const posts = await Posts.findMany({
  where:   { published: true },
  orderBy: { createdAt: 'desc' },
  limit:   20,
  offset:  0
});

// Count
const total = await Posts.count({ where: { published: true } });

// Exists
const exists = await Posts.exists({ where: { slug: 'hello-world' } });

// Find first match or throw
const post = await Posts.findOrFail(1);       // throws 404 if not found
const post = await Posts.firstWhere('slug', 'hello-world'); // first match
```

## Fluent query builder

`Posts.query()` returns a `QueryBuilder` that you chain before calling a terminator:

```ts
const posts = await Posts
  .query()
  .where('published', true)
  .where('userId', userId)
  .whereLike('title', '%svelte%')
  .whereIn('status', ['draft', 'review'])
  .whereNotNull('publishedAt')
  .whereBetween('createdAt', [start, end])
  .orderBy('created_at', 'desc')
  .limit(10)
  .offset(0)
  .get();
```

### Terminators

| Method | Returns |
|---|---|
| `.get()` | `Promise<Row[]>` — all matching rows |
| `.first()` | `Promise<Row \| null>` — first match |
| `.firstOrFail()` | `Promise<Row>` — throws if not found |
| `.count()` | `Promise<number>` |
| `.exists()` | `Promise<boolean>` |
| `.paginate(page, perPage)` | `Promise<{ data, meta }>` |

### Pagination

```ts
const result = await Posts
  .query()
  .where('published', true)
  .orderBy('created_at', 'desc')
  .paginate(1, 15);

// result.data        — array of rows
// result.meta.total  — total count
// result.meta.pages  — total pages
// result.meta.page   — current page
// result.meta.perPage
```

### Selecting specific columns

```ts
const titles = await Posts
  .query()
  .select(['id', 'title', 'slug'])
  .where('published', true)
  .get();
```

### OR conditions

```ts
const posts = await Posts
  .query()
  .where('published', true)
  .orWhere('featured', true)
  .get();
```

## Eager loading relationships

Load related models in a single query using `.with()`:

```ts
const post = await Posts
  .with(['author', 'comments', 'tags'])
  .find(1);

console.log(post.author.name);       // User
console.log(post.comments.length);   // Comment[]
console.log(post.tags.map(t => t.name)); // Tag[]
```

## Raw Drizzle escape hatch

When you need SQL that the query builder can't express:

```ts
import { Posts } from '$models/posts.model';
import { db }    from '$db';
import { posts, users } from '$schema';
import { eq, and, gt, sql } from 'drizzle-orm';

const result = await db
  .select({
    id:         posts.id,
    title:      posts.title,
    authorName: users.name,
    commentCount: sql<number>`count(comments.id)`
  })
  .from(posts)
  .innerJoin(users, eq(posts.userId, users.id))
  .leftJoin(comments, eq(comments.postId, posts.id))
  .where(and(eq(posts.published, true), gt(posts.createdAt, cutoff)))
  .groupBy(posts.id, users.name)
  .orderBy(sql`count(comments.id) desc`)
  .limit(10);
```

See [Raw Drizzle](/docs/database/raw-drizzle) for more.
