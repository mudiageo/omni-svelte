import type { CacheStore, TaggedCache, CacheLock, LockOptions, CacheOptions, BlockLockOptions } from '../types.js';

export class NullCacheStore implements CacheStore {
  async get<T>() { return null; }
  async set() { return; }
  async delete() { return false; }
  async has() { return false; }
  async increment(key: string, by = 1) { return by; }
  async decrement(key: string, by = 1) { return -by; }
  async ttl() { return null; }
  async getMany<T>(keys: string[]) {
    const res: Record<string, T | null> = {};
    for (const k of keys) res[k] = null;
    return res;
  }
  async setMany() { return; }
  tags(): TaggedCache {
    return {
      get: this.get.bind(this),
      set: this.set.bind(this),
      delete: this.delete.bind(this),
      has: this.has.bind(this),
      flush: async () => {}
    };
  }
  lock(): CacheLock {
    return {
      attempt: async <T>(fn: () => Promise<T>|T) => await fn(),
      block: async <T>(fn: () => Promise<T>|T) => await fn(),
      release: async () => true
    };
  }
  async clear() {}
}