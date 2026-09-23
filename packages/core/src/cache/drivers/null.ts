// import { type CacheStore } from '../types.js'
export interface CacheOptions {
  ttl?: number; // Time-to-live in seconds
  forever: boolean; //remember indefinitly
}

export interface LockOptions {
  ttl?: number; // Lock validity window in seconds (default 30)
}

export interface BlockLockOptions {
  maxWait?: number; // Maximum wait duration in milliseconds (default 10,000)
  pollInterval?: number; // Polling retry interval in milliseconds (default 250)
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
  ttl(key: string): Promise<number | null>; // Remaining seconds, null if non-expiring/missing
  getMany<T>(keys: string[]): Promise<Map<string, T | null>>;
  setMany<T>(entries: [string, T][], options?: CacheOptions): Promise<void>;
  tags(...tags: string[]): TaggedCache;
  lock(key: string, options?: LockOptions): CacheLock;
  clear(): Promise<void>;
}

export interface TaggedCache extends Pick<CacheStore, 'get' | 'set' | 'delete' | 'has'> {
  flush(): Promise<void>;
}

export interface CacheLock {
  block<T>(fn: () => Promise<T> | T, options?: BlockLockOptions): Promise<T>;
  attempt<T>(fn: () => Promise<T> | T): Promise<T | false>;
  release(): Promise<boolean>;
}


export class NullCacheStore implements CacheStore {
  cache = new Map<string, { value: any; expiresAt: number | null }>();
  tagToKeys = new Map<string, Set<string>>()
  keyToTags = new Map<string, Set<string>>()

  async get<T>(key: string): Promise<T | null> {
      return null
  }

  async set<T>(key: string, value: T, options: CacheOptions ){

  }
  
  async delete(key: string): Promise<boolean> {
    return false
  }

  async has(key: string): Promise<boolean> {
    return false
  }

  async increment(key: string, by: number = 1): Promise<number> {
    return 0    
  }

  async decrement(key: string, by?: number): Promise<number> {
    return 0
  }

  async ttl(key: string): Promise<number | null> {
    const record = this.cache.get(key)

    if(typeof record?.expiresAt === 'number') return null

    
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    for (const key of keys) {
      result.set(key, await this.get(key))
    }

    return result;
    
  }

  async setMany<T>(entries: [string, T][], options?: CacheOptions): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options)
    }
    
  }

  tags(...tags: string[]): TaggedCache {
    
  }

  lock(key: string, options?: LockOptions): CacheLock {
    
  }

  async clear(): Promise<void> {
    
  }
  
}