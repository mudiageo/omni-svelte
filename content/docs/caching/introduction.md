---
title: Caching
description: High-performance caching and distributed locking for OmniSvelte.
section: Platform APIs
order: 1
---

# Caching

OmniSvelte provides a unified caching and locking layer with pluggable drivers (`memory`, `redis`, `null`, `array`).

## Configuration

Configure stores in your `vite.config.ts` via the `omniSvelte` plugin:

```ts
import { defineConfig } from 'vitest/config';
import { omniSvelte } from 'omni-svelte/vite';

export default defineConfig({
  plugins: [
    omniSvelte({
      // Configure cache stores
      cache: {
        default: 'main',
        stores: {
          main:     { driver: 'memory', ttl: 3600 },
          redis:    { driver: 'redis', url: process.env.REDIS_URL, ttl: 86400, prefix: 'app:' },
          sessions: { driver: 'redis', url: process.env.REDIS_URL, prefix: 'sess:', ttl: 604800 }
        }
      }
    })
  ]
});
```

## Basic Usage

Import the `cache` façade from `$omni/cache`. Because this is a server-only module, Vite will warn you if you attempt to import it from a universal `+page.svelte` file.

```ts
import { cache } from '$omni/cache';

// Get and Set (TTL is always the last argument options object)
await cache.set('user:1', user, { ttl: 300 });
const user = await cache.get<User>('user:1');
await cache.delete('user:1');
await cache.has('user:1');

// Remember (cache aside)
const post = await cache.remember('post:1', () => Post.find(1), { ttl: 600 });
const settings = await cache.rememberForever('settings', () => loadSettings());

// Named Stores
const sessionCache = cache.store('sessions');
await sessionCache.set('token:123', session);
```

## Tagged Invalidation

Group related cache entries using tags (Supported natively by memory and redis drivers):

```ts
// Tag cache entries
await cache.tags('posts', 'user:1').set('post:10', postData);

// Invalidate all entries tagged 'posts'
await cache.tags('posts').flush();

// Namespace helper (syntactic sugar over tags)
const userCache = cache.namespace('user');
await userCache.set('profile', profile);
await userCache.flush();
```

## Distributed Locking

Prevent stampedes and race conditions using locks:

```ts
// Blocking: waits for the lock up to maxWait (default 10s), throws LockTimeoutError if exceeded
await cache.lock('generate:report', { ttl: 30 }).block(async () => {
  return await buildReport();
});

// Non-blocking: attempts lock once, returns false immediately if already held
const ran = await cache.lock('nightly:prune', { ttl: 60 }).attempt(async () => {
  await pruneExpiredRecords();
});
```

## Custom Drivers

You can create your own cache drivers by implementing the `CacheStore` interface and registering them on the global `cache` manager:

```ts
import { cache, defineCacheDriver } from '$omni/cache';

const myCustomDriver = defineCacheDriver((config) => {
  return new CustomCacheStore(config);
});

cache.extend('custom', myCustomDriver);
```
