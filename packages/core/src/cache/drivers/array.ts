import type { CacheStore, TaggedCache, CacheLock, LockOptions, CacheOptions, BlockLockOptions } from '../types.js';

export class ArrayCacheStore implements CacheStore {
  public recorded = {
    gets: [] as string[],
    sets: [] as { key: string; value: any; options?: CacheOptions }[],
    deletes: [] as string[],
    flushes: [] as string[][], // arrays of tags
  };

  private storage = new Map<string, any>();

  async get<T>(key: string) {
    this.recorded.gets.push(key);
    return (this.storage.get(key) as T) ?? null;
  }
  
  async set<T>(key: string, value: T, options?: CacheOptions) {
    this.recorded.sets.push({ key, value, options });
    this.storage.set(key, value);
  }
  
  async delete(key: string) {
    this.recorded.deletes.push(key);
    return this.storage.delete(key);
  }
  
  async has(key: string) {
    return this.storage.has(key);
  }
  
  async increment(key: string, by = 1) {
    const val = (this.storage.get(key) || 0) + by;
    this.storage.set(key, val);
    return val;
  }
  
  async decrement(key: string, by = 1) {
    return this.increment(key, -by);
  }
  
  async ttl() { return null; }
  
  async getMany<T>(keys: string[]) {
    const res: Record<string, T | null> = {};
    for (const k of keys) {
      this.recorded.gets.push(k);
      res[k] = (this.storage.get(k) as T) ?? null;
    }
    return res;
  }
  
  async setMany<T>(entries: [string, T][], options?: CacheOptions) {
    for (const [k, v] of entries) {
      await this.set(k, v, options);
    }
  }
  
  tags(...tags: string[]): TaggedCache {
    return {
      get: this.get.bind(this),
      set: this.set.bind(this),
      delete: this.delete.bind(this),
      has: this.has.bind(this),
      flush: async () => {
        this.recorded.flushes.push(tags);
      }
    };
  }
  
  lock(): CacheLock {
    return {
      attempt: async <T>(fn: () => Promise<T>|T) => await fn(),
      block: async <T>(fn: () => Promise<T>|T) => await fn(),
      release: async () => true
    };
  }
  
  async clear() {
    this.storage.clear();
    this.recorded = { gets: [], sets: [], deletes: [], flushes: [] };
  }
}