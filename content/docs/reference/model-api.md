---
title: Model API Reference
description: Complete static and instance method reference for the generated Model class.
section: Reference
order: 3
---

# Model API Reference

## Static methods

| Method       | Signature                         | Returns           |
| ------------ | --------------------------------- | ----------------- |
| `find`       | `(id) → Promise<Row\|null>`       | One row or null   |
| `findOrFail` | `(id) → Promise<Row>`             | One row or throws |
| `firstWhere` | `(col, val) → Promise<Row\|null>` | First match       |
| `findMany`   | `(opts?) → Promise<Row[]>`        | Array of rows     |
| `count`      | `(opts?) → Promise<number>`       | Integer count     |
| `exists`     | `(opts?) → Promise<boolean>`      | Boolean           |
| `create`     | `(data) → Promise<Row>`           | Created row       |
| `query`      | `() → QueryBuilder`               | Fluent builder    |
| `with`       | `(relations[]) → RelationLoader`  | Eager loader      |
| `drizzle`    | `() → DrizzleDB`                  | Raw Drizzle       |

## QueryBuilder methods

| Method                       | Description                  |
| ---------------------------- | ---------------------------- |
| `.where(col, val)`           | `col = val`                  |
| `.whereLike(col, pat)`       | `col LIKE pat`               |
| `.whereIn(col, vals[])`      | `col IN (...)`               |
| `.whereNotNull(col)`         | `col IS NOT NULL`            |
| `.whereBetween(col, [a, b])` | `col BETWEEN a AND b`        |
| `.orWhere(col, val)`         | `OR col = val`               |
| `.whereHas(rel, fn?)`        | EXISTS subquery on relation  |
| `.withCount(rel)`            | Adds `<rel>Count` to result  |
| `.select(cols[])`            | SELECT specific columns      |
| `.with(rels[])`              | Eager load relations         |
| `.orderBy(col, dir)`         | ORDER BY                     |
| `.limit(n)`                  | LIMIT                        |
| `.offset(n)`                 | OFFSET                       |
| `.get()`                     | Terminate → `Row[]`          |
| `.first()`                   | Terminate → `Row\|null`      |
| `.firstOrFail()`             | Terminate → `Row`            |
| `.count()`                   | Terminate → `number`         |
| `.paginate(page, per)`       | Terminate → `{ data, meta }` |

## Instance methods

| Method          | Description                      |
| --------------- | -------------------------------- |
| `.update(data)` | UPDATE and return self           |
| `.delete()`     | DELETE                           |
| `.toJSON()`     | Plain object (respects `hidden`) |

## Package exports

```ts
import { Model, createModel } from 'omni-svelte/database';
import { Factory, Faker } from 'omni-svelte/database';
import { defineSchema, field } from 'omni-svelte/schema';
import { omniSvelte } from 'omni-svelte/vite';
import type { OmniPlugin } from 'omni-svelte/plugins';
```
