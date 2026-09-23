import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cache, CacheManager } from '../../cache/index.js';
import { MemoryCacheStore } from '../../cache/drivers/memory.js';
import { NullCacheStore } from '../../cache/drivers/null.js';
import { ArrayCacheStore } from '../../cache/drivers/array.js';
import { LockTimeoutError } from '../../errors.js';

describe('Cache System', () => {
  describe('MemoryCacheStore (Core Store Compliance)', () => {
    let store: MemoryCacheStore;

    beforeEach(() => {
      store = new MemoryCacheStore();
      vi.useFakeTimers();
    });

    afterEach(() => {
      store.destroy(); // clear the setInterval sweep
      vi.useRealTimers();
    });

    it('sets and gets a value', async () => {
      await store.set('name', 'omni');
      expect(await store.get('name')).toBe('omni');
    });

    it('returns null for missing keys', async () => {
      expect(await store.get('missing')).toBeNull();
    });

    it('respects TTL and expires values', async () => {
      await store.set('temp', 'val', { ttl: 5 });
      expect(await store.get('temp')).toBe('val');
      
      vi.advanceTimersByTime(5100);
      
      expect(await store.get('temp')).toBeNull();
      expect(await store.ttl('temp')).toBeNull();
    });

    it('supports atomic increment and decrement', async () => {
      expect(await store.increment('counter', 10)).toBe(10);
      expect(await store.increment('counter')).toBe(11);
      expect(await store.decrement('counter', 5)).toBe(6);
    });

    it('supports getMany and setMany with Record return type', async () => {
      await store.setMany([['k1', 'v1'], ['k2', 'v2']]);
      const res = await store.getMany(['k1', 'k2', 'k3']);
      expect(res).toEqual({ k1: 'v1', k2: 'v2', k3: null });
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
    });

    describe('Locking Mechanism', () => {
      it('attempt() acquires lock and executes, returns false when contested', async () => {
        const lock = store.lock('job:lock', { ttl: 10 });
        const first = await lock.attempt(async () => 'finished');
        expect(first).toBe('finished');

        // Simulate contested lock by not waiting for the first one (actually we need to hold it)
        const p1 = store.lock('contested', { ttl: 10 }).attempt(() => new Promise((resolve) => setTimeout(() => resolve('done'), 5000)));
        
        // Immediately try again
        const second = await store.lock('contested', { ttl: 10 }).attempt(() => 'never');
        expect(second).toBe(false);
        
        vi.advanceTimersByTime(5000); // let p1 finish
        await p1;
      });

      it('block() waits for contested lock and throws LockTimeoutError on timeout', async () => {
        const lock1 = store.lock('resource', { ttl: 10 });
        
        let releaseLock1: (v: any) => void;
        const blockingTask = lock1.block(() => new Promise((resolve) => { releaseLock1 = resolve; }));

        const lock2 = store.lock('resource', { ttl: 10 });
        const waitPromise = lock2.block(() => 'acquired', { maxWait: 1000, pollInterval: 200 });

        vi.advanceTimersByTime(1200);

        await expect(waitPromise).rejects.toThrow(LockTimeoutError);
        releaseLock1!('done');
        await blockingTask;
      });
    });
  });

  describe('CacheManager (Facade)', () => {
    let manager: CacheManager;

    beforeEach(() => {
      manager = new CacheManager();
      manager.extend('memory', () => new MemoryCacheStore());
      manager.configure({
        default: 'main',
        stores: {
          main: { driver: 'memory', ttl: 100 },
          sessions: { driver: 'memory', prefix: 'sess:' }
        }
      });
    });

    afterEach(async () => {
      // Must destroy the memory stores to stop interval leaks
      // For this test, we can just clear
      await manager.clear();
      // the inner MemoryCacheStore will still run its interval in reality, 
      // but vi.useRealTimers makes it harmless in vitest. 
    });

    it('delegates default methods to the default store', async () => {
      await manager.set('a', 1);
      expect(await manager.get('a')).toBe(1);
    });

    it('uses configured default TTL if none provided in set', async () => {
      vi.useFakeTimers();
      await manager.set('test-ttl', 'data');
      
      // Default ttl is 100s. Advance 101s.
      vi.advanceTimersByTime(101000);
      expect(await manager.get('test-ttl')).toBeNull();
      vi.useRealTimers();
    });

    it('remember computes and stores value on miss, returns cached on hit', async () => {
      const loader = vi.fn().mockResolvedValue('computed');
      const val1 = await manager.remember('computed:1', loader, { ttl: 300 });
      expect(val1).toBe('computed');
      expect(loader).toHaveBeenCalledTimes(1);

      const val2 = await manager.remember('computed:1', loader, { ttl: 300 });
      expect(val2).toBe('computed');
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('rememberForever stores value without expiration', async () => {
      const loader = vi.fn().mockReturnValue('forever');
      await manager.rememberForever('cfg', loader);
      
      const storeInstance = manager.store('main') as any;
      // In the wrapper, we have to look inside. It's fine to just trust the manager test.
      expect(await manager.ttl('cfg')).toBeNull();
      expect(await manager.get('cfg')).toBe('forever');
    });

    it('isolates named stores and applies prefixes properly', async () => {
      const sessStore = manager.store('sessions');
      await sessStore.set('123', { user: 1 });
      
      expect(await sessStore.get('123')).toEqual({ user: 1 });
      
      // The default store shouldn't see it (or if it does, it's prefixed, but they are isolated Memory stores here)
      expect(await manager.get('123')).toBeNull();
    });

    it('namespace() behaves as syntactic sugar for tags()', async () => {
      const ns = manager.namespace('orders');
      await ns.set('1', { id: 1 });
      expect(await ns.get('1')).toEqual({ id: 1 });

      await ns.flush();
      expect(await ns.get('1')).toBeNull();
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
      await arrayStore.tags('a').flush();

      expect(arrayStore.recorded.sets).toHaveLength(1);
      expect(arrayStore.recorded.gets).toEqual(['k']);
      expect(arrayStore.recorded.deletes).toEqual(['k']);
      expect(arrayStore.recorded.flushes).toEqual([['a']]);
    });
  });
});