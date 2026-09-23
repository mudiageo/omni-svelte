import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryCacheStore } from '../../cache/drivers/memory.js';
import { NullCacheStore } from '../../cache/drivers/null.js';
import { ArrayCacheStore } from '../../cache/drivers/array.js';
import { CacheManager } from '../../cache/manager.js';
import { LockTimeoutError } from '../../errors.js';

describe('Cache System', () => {
  let store: MemoryCacheStore;

  beforeEach(() => {
    store = new MemoryCacheStore();
  });

  describe('Basic Store Operations', () => {
    it('sets and gets cached values', async () => {
      await store.set('key1', 'value1');
      expect(await store.get('key1')).toBe('value1');
    });

    it('returns null for missing keys', async () => {
      expect(await store.get('nonexistent')).toBeNull();
    });

    it('deletes keys and checks existence with has()', async () => {
      await store.set('temp', 123);
      expect(await store.has('temp')).toBe(true);
      const deleted = await store.delete('temp');
      expect(deleted).toBe(true);
      expect(await store.has('temp')).toBe(false);
    });

    it('respects TTL and expires values', async () => {
      vi.useFakeTimers();
      await store.set('expiring', 'val', { ttl: 2 });
      expect(await store.get('expiring')).toBe('val');

      vi.advanceTimersByTime(2100);
      expect(await store.get('expiring')).toBeNull();
      vi.useRealTimers();
    });

    it('performs atomic increment and decrement', async () => {
      const v1 = await store.increment('counter');
      expect(v1).toBe(1);
      const v2 = await store.increment('counter', 4);
      expect(v2).toBe(5);
      const v3 = await store.decrement('counter', 2);
      expect(v3).toBe(3);
    });

    it('inspects remaining TTL in seconds', async () => {
      vi.useFakeTimers();
      await store.set('key', 'val', { ttl: 60 });
      expect(await store.ttl('key')).toBe(60);

      vi.advanceTimersByTime(10_000);
      expect(await store.ttl('key')).toBe(50);
      vi.useRealTimers();
    });

    it('supports getMany and setMany', async () => {
      await store.setMany([
        ['a', 1],
        ['b', 2]
      ]);
      const map = await store.getMany(['a', 'b', 'c']);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.get('c')).toBeNull();
    });
  });

  describe('remember and rememberForever', () => {
    it('computes and stores value on miss, returns cached on hit (TTL trailing options)', async () => {
      const loader = vi.fn().mockResolvedValue('computed');
      const val1 = await store.remember('computed:1', loader, { ttl: 300 });
      expect(val1).toBe('computed');
      expect(loader).toHaveBeenCalledTimes(1);

      const val2 = await store.remember('computed:1', loader, { ttl: 300 });
      expect(val2).toBe('computed');
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('rememberForever stores value without expiration', async () => {
      const loader = vi.fn().mockReturnValue('forever');
      await store.rememberForever('cfg', loader);
      expect(await store.ttl('cfg')).toBeNull();
      expect(await store.get('cfg')).toBe('forever');
    });
  });

  describe('Tagging and Namespace Invalidation', () => {
    it('flushes only keys matching specified tags', async () => {
      await store.tags('users', 'marketing').set('user:10', { name: 'Bob' });
      await store.tags('users').set('user:11', { name: 'Alice' });
      await store.set('system:status', 'online');

      // Flush marketing tag -> deletes user:10 only
      await store.tags('marketing').flush();

      expect(await store.get('user:10')).toBeNull();
      expect(await store.get('user:11')).toEqual({ name: 'Alice' });
      expect(await store.get('system:status')).toBe('online');
    });

    it('namespace() behaves as syntactic sugar for tags()', async () => {
      const ns = store.namespace('orders');
      await ns.set('1', { id: 1 });
      expect(await ns.get('1')).toEqual({ id: 1 });

      await ns.flush();
      expect(await ns.get('1')).toBeNull();
    });
  });

  describe('Locking Mechanism', () => {
    it('attempt() acquires lock and executes, returns false when contested', async () => {
      const lock = store.lock('job:lock', { ttl: 10 });
      const first = await lock.attempt(async () => 'finished');
      expect(first).toBe('finished');

      // Simulate contested lock
      const contested = store.lock('contested', { ttl: 10 });
      const p1 = contested.attempt(async () => {
        // Holding lock
        const second = await store.lock('contested', { ttl: 10 }).attempt(() => 'never');
        expect(second).toBe(false);
      });
      await p1;
    });

    it('block() waits for contested lock to free and throws LockTimeoutError on timeout', async () => {
      vi.useFakeTimers();
      const lock1 = store.lock('resource', { ttl: 10 });

      // Hold lock
      let releaseLock1: () => void;
      const blockingTask = lock1.block(() => new Promise((resolve) => { releaseLock1 = resolve; }));

      // Second lock attempts to block with short maxWait
      const lock2 = store.lock('resource', { ttl: 10 });
      const waitPromise = lock2.block(() => 'acquired', { maxWait: 1000, pollInterval: 200 });

      vi.advanceTimersByTime(1210);

      await expect(waitPromise).rejects.toThrow(LockTimeoutError);
      releaseLock1!();
      await blockingTask;
      vi.useRealTimers();
    });
  });

  describe('Array and Null Drivers', () => {
    it('NullCacheStore always returns null and false', async () => {
      const nullStore = new NullCacheStore();
      await nullStore.set('foo', 'bar');
      expect(await nullStore.get('foo')).toBeNull();
      expect(await nullStore.has('foo')).toBe(false);
      expect(await nullStore.delete('foo')).toBe(false);
    });

    it('ArrayCacheStore records all operations for testing', async () => {
      const arrayStore = new ArrayCacheStore();
      await arrayStore.set('k', 'v', { ttl: 50 });
      await arrayStore.get('k');
      await arrayStore.delete('k');

      expect(arrayStore.recorded.sets).toHaveLength(1);
      expect(arrayStore.recorded.gets).toEqual(['k']);
      expect(arrayStore.recorded.deletes).toEqual(['k']);
    });
  });
});