---
title: Lifecycle Hooks
description: Run code automatically before and after model operations — creating, created, updating, updated, deleted.
section: Database
order: 5
---

# Lifecycle Hooks

OmniSvelte models support lifecycle hooks for running logic before and after database operations.

## Available hooks

| Hook | Fires |
|---|---|
| `creating` | Before `INSERT` — can modify data |
| `created` | After `INSERT` |
| `updating` | Before `UPDATE` — can modify data |
| `updated` | After `UPDATE` |
| `deleting` | Before `DELETE` |
| `deleted` | After `DELETE` |

## Defining hooks in a schema

```ts
defineSchema('posts', fields, {
  hooks: {
    creating(data) {
      // Automatically generate slug from title
      if (!data.slug && data.title) {
        data.slug = data.title.toLowerCase().replace(/\s+/g, '-');
      }
      return data;
    },
    created(post) {
      console.log('Post created:', post.id);
    },
    updating(data) {
      data.updatedAt = new Date();
      return data;
    }
  }
});
```

## Hooks in the Model class

You can also override hooks in the generated model file (or a manually created model):

```ts
export class Posts extends Model<typeof posts> {
  static async creating(data: CreatePost) {
    data.slug ??= slugify(data.title);
    return data;
  }

  static async created(post: Post) {
    await sendNotification('New post: ' + post.title);
  }
}
```
