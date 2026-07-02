---
title: Raw Drizzle
description: Escape hatch to the underlying Drizzle ORM instance for complex queries.
section: Database
order: 7
---

# Raw Drizzle

The generated Model API covers most use cases. When you need complex joins, custom SQL, or Drizzle features the Model abstraction doesn't expose, use `$db` directly.

## Importing

```ts
import { db }    from '$db';          // Drizzle database instance
import { posts, users, comments } from '$schema'; // all Drizzle tables
```

## Complex joins

```ts
import { db } from '$db';
import { posts, users, comments } from '$schema';
import { eq, and, count, sql, desc, gt } from 'drizzle-orm';

const results = await db
  .select({
    postId:       posts.id,
    title:        posts.title,
    authorName:   users.name,
    commentCount: count(comments.id).as('comment_count')
  })
  .from(posts)
  .innerJoin(users, eq(posts.userId, users.id))
  .leftJoin(comments, eq(comments.postId, posts.id))
  .where(eq(posts.published, true))
  .groupBy(posts.id, users.name)
  .orderBy(desc(sql`comment_count`))
  .limit(10);
```

## Transactions

```ts
import { db } from '$db';
import { posts, tags, postTags } from '$schema';

const result = await db.transaction(async (tx) => {
  const [post] = await tx
    .insert(posts)
    .values({ title, content, userId })
    .returning();

  if (tagIds.length) {
    await tx.insert(postTags).values(
      tagIds.map(tagId => ({ postId: post.id, tagId }))
    );
  }

  return post;
});
```

## Batch inserts

```ts
await db.insert(users).values([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob',   email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' }
]);
```

## Upsert (insert or update)

```ts
await db
  .insert(posts)
  .values({ slug, title, content, userId })
  .onConflictDoUpdate({
    target: posts.slug,
    set:    { title, content, updatedAt: new Date() }
  });
```

## Raw SQL

```ts
import { sql } from 'drizzle-orm';

const result = await db.execute(
  sql`SELECT id, title, ts_rank(search_vector, plainto_tsquery(${query})) AS rank
      FROM posts
      WHERE search_vector @@ plainto_tsquery(${query})
      ORDER BY rank DESC
      LIMIT 10`
);
```

## Accessing from Model

You can also call `Posts.drizzle()` to get the same `db` instance scoped to the model's table:

```ts
const db = Posts.drizzle();
// db is the same Drizzle instance from $db
```
