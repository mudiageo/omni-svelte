---
title: Schema Options
description: Table-level options for defineSchema — timestamps, soft deletes, indexes, realtime, fillable, and hidden.
section: Schema
order: 4
---

# Schema Options

The third argument to `defineSchema` controls table-level behaviour.

```ts
defineSchema('posts', fields, {
  // Auto-add createdAt / updatedAt timestamp columns
  timestamps: true,

  // Soft deletes — adds deletedAt column, filters queries automatically
  softDeletes: false,

  // Indexes — string = single column, array = composite
  indexes: ['slug', ['userId', 'published']],

  // Mass-assignable fields (default: 'auto' = all non-PK, non-timestamp)
  fillable: 'auto',

  // Fields hidden from .toJSON() (default: 'auto' = password fields)
  hidden: 'auto',

  // Real-time push events
  realtime: {
    enabled: true,
    events: ['created', 'updated', 'deleted'],
    channels: (record) => [`posts`, `users.${record.userId}`]
  }
});
```

## `timestamps`

When `true`, OmniSvelte adds `createdAt` and `updatedAt` columns and keeps `updatedAt` current automatically.

## `softDeletes`

When `true`, adds a `deletedAt` nullable timestamp. `Posts.query()` automatically filters out soft-deleted rows; use `.withTrashed()` to include them.

## `indexes`

```ts
indexes: [
  'slug',                    // single-column index on `slug`
  ['userId', 'published'],   // composite index
]
```

## `realtime`

Requires the realtime feature (planned). When enabled, OmniSvelte broadcasts WebSocket events on model changes to the specified channels.

## `hidden`

Fields excluded from `.toJSON()` and client-side serialization:

```ts
hidden: ['password', 'internalNotes']
// or
hidden: 'auto'  // automatically hides fields of type field.password()
```
