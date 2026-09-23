import { LockTimeoutError } from '../../errors.js';
import type { CacheStore, CacheOptions, TaggedCache, LockOptions, CacheLock } from '../types.js';

export class MemoryCacheStore implements CacheStore {
  private cache = new Map<string, { value: any; expiresAt: number | null }>();
  private tagToKeys = new Map<string, Set<string>>();
  private keyToTags = new Map<string, Set<string>>();
  private activeLocks = new Map<string, { token: string; expiresAt: number }>();
  
  private sweepInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Background sweep to prevent memory leaks from abandoned expired keys
    this.sweepInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.cache.entries()) {
        if (record.expiresAt !== null && now > record.expiresAt) {
          this.delete(key).catch(() => {});
        }
      }
    }, 60000); // every minute
    // Don't keep the Node process alive just for this interval
    if (this.sweepInterval.unref) this.sweepInterval.unref();
  }

  async get<T>(key: string): Promise<T | null> {
    const record = this.cache.get(key);
    if (!record) return null;

    if (record.expiresAt && Date.now() > record.expiresAt) {
      await this.delete(key);
      return null;
    }
    return record.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const expiresAt = typeof options?.ttl === 'number' ? Date.now() + (options.ttl * 1000) : null;
    this.cache.set(key, { value, expiresAt });
  }
  
  async delete(key: string): Promise<boolean> {
    const isDeleted = this.cache.delete(key);
    
    // Clean up tag indexes to prevent memory leaks
    const tags = this.keyToTags.get(key);
    if (tags) {
      for (const tag of tags) {
        this.tagToKeys.get(tag)?.delete(key);
        if (this.tagToKeys.get(tag)?.size === 0) {
          this.tagToKeys.delete(tag);
        }
      }
      this.keyToTags.delete(key);
    }
    return isDeleted;
  }

  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = await this.get(key);
    const newValue = typeof current === 'number' ? current + by : by;
    const existingRecord = this.cache.get(key);
    
    const expiresAt = existingRecord ? existingRecord.expiresAt : null;
    this.cache.set(key, { value: newValue, expiresAt });
    
    return newValue;
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    return this.increment(key, -by);
  }

  async ttl(key: string): Promise<number | null> {
    const record = this.cache.get(key);
    if (!record) return null;
    
    if (record.expiresAt !== null && Date.now() > record.expiresAt) {
      await this.delete(key);
      return null;
    }

    return record.expiresAt ? Math.max(0, (record.expiresAt - Date.now()) / 1000) : null;
  }

  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    return result;
  }

  async setMany<T>(entries: [string, T][], options?: CacheOptions): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

  tags(...tags: string[]): TaggedCache {
    return {
      get: (key) => this.get(key),
      has: (key) => this.has(key),
      delete: (key) => this.delete(key),
      set: async (key, value, options) => {
        await this.set(key, value, options);
        for (const tag of tags) {
          if (!this.tagToKeys.has(tag)) this.tagToKeys.set(tag, new Set());
          this.tagToKeys.get(tag)!.add(key);
          
          if (!this.keyToTags.has(key)) this.keyToTags.set(key, new Set());
          this.keyToTags.get(key)!.add(tag);
        }
      },
      flush: async () => {
        const keysToDelete = new Set<string>();
        for (const tag of tags) {
          const keys = this.tagToKeys.get(tag);
          if (keys) {
            for (const key of keys) keysToDelete.add(key);
          }
        }
        for (const key of keysToDelete) {
          await this.delete(key);
        }
      },
    };
  }

  lock(key: string, options?: LockOptions): CacheLock {
    const ttlMs = (options?.ttl ?? 30) * 1000;

    const acquire = () => {
      const currentLock = this.activeLocks.get(key);
      if (currentLock && currentLock.expiresAt > Date.now()) return false;
      
      const token = crypto.randomUUID();
      this.activeLocks.set(key, { token, expiresAt: Date.now() + ttlMs });
      return token;
    };

    const release = (token: string) => {
      if (this.activeLocks.get(key)?.token === token) {
        this.activeLocks.delete(key);
      }
    };
    
    return {
      attempt: async <T>(fn: () => Promise<T> | T): Promise<T | false> => {
        const token = acquire();
        if (!token) return false;
        try {
          return await fn();
        } finally {
          release(token);
        }
      },
      block: async <T>(fn: () => Promise<T> | T, blockOpts?: import('../types.js').BlockLockOptions): Promise<T> => {
        const maxWait = blockOpts?.maxWait ?? 10000;
        const pollInterval = blockOpts?.pollInterval ?? 250;
        const start = Date.now();

        let token: string | false = false;
        while (!(token = acquire())) {
          if (Date.now() - start > maxWait) {
            throw new LockTimeoutError(key, maxWait);
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }     

        try {
          return await fn();
        } finally {
          release(token);
        }
      },
      release: async () => {
        return this.activeLocks.delete(key);
      },
    };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.tagToKeys.clear();
    this.keyToTags.clear();
    this.activeLocks.clear();
  }
  
  // Method to clean up the interval in tests
  destroy() {
    clearInterval(this.sweepInterval);
  }
}