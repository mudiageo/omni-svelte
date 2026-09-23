// import { type CacheStore } from '../types.js'
import { LockTimeoutError } from '../../errors.js'
export interface CacheOptions {
  ttl?: number; // Time-to-live in seconds
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


export class MemoryCacheStore implements CacheStore {
  cache = new Map<string, { value: any; expiresAt: number | null }>();
  
  tagToKeys = new Map<string, Set<string>>()
  keyToTags = new Map<string, Set<string>>()

  activeLocks = new Map<string, { token: string; expiresAt: number }>()

  async get<T>(key: string): Promise<T | null> {
    const record = this.cache.get(key)
      
    if (!record) return null

    if(record.expiresAt && Date.now() > record.expiresAt) {
      
      // if expired, cleanup
      await this.delete(key)
      
      return null
    }

    return record.value as T
  }

  async set<T>(key: string, value: T, options: CacheOptions ){

    const expiresAt = typeof options?.ttl === 'number' ? Date.now() + (options.ttl * 1000) : null
    
    const record = { value, expiresAt }
    
    this.cache.set(key, record)
  }
  
  async delete(key: string): Promise<boolean> {
    
    const isDeleted = this.cache.delete(key);
    
    // Clean up tag indexes to prevent memory leaks
    const tags = this.keyToTags.get(key);
    if (tags) {
      for (const tag of tags) {
        this.tagToKeys.get(tag)?.delete(key);
      }
      this.keyToTags.delete(key);
    }
    return isDeleted
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key)
  }

  async increment(key: string, by: number = 1): Promise<number> {
    
    const current = await this.get(key); //handles ttl eviction automatically 

    const newValue = typeof current === 'number' ? current + by : by
    
    const existingRecord = this.cache.get(key)
    
    const expiresAt = existingRecord ?
    existingRecord.expiresAt : null;
    
    this.cache.set(key, { value: newValue, expiresAt });
    

    return newValue
    
  }

  async decrement(key: string, by?: number): Promise<number> {
    return this.increment(key, -by)
  }

  async ttl(key: string): Promise<number | null> {
    const record = this.cache.get(key)
    if (!record) return null;
    
    if (record.expiresAt !== null && Date.now() > record.expiresAt) {
        await this.delete(key);
        return null; // already expired
      }

    return (record.expiresAt - Date.now() ) / 1000

    
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
    

    return {
      get: (key) => this.get(key),
      has: (key) => this.has(key),
      delete: (key) => this.delete(key),
      set: async (key, value, options) => {
        await this.set(key, value, options)
        
        for (const tag of tags) {
          
          // cross-link the tags and keys
          if(!this.tagToKeys.has(tag)) this.tagToKeys.set(tag, new Set())
          this.tagToKeys.get(tag)!.add(key)
          
          if(!this.keyToTags.has(key)) this.keyToTags.set(key, new Set())
          this.keyToTags.get(key)!.add(tag)

          
        }
      },
      flush: async () => {

        const keysToDelete = new Set<string>()

        for (const tag of tags) {
          
          const keys = this.tagToKeys.get(tag);
  
          if (keys) {
            for (const key of keys) keysToDelete.add(key)
          }
  
        }
        
        for (const key of keysToDelete) await this.delete(key)
        
      },
    }
  }

  lock(key: string, options?: LockOptions): CacheLock {

    const ttlMs = (options?.ttl ?? 30) * 1000 // default ttl 30 secs

    const acquire = () => {
      const currentLock = this.activeLocks.get(key)

      // if lock exists and hasnt expired we can't acquire it
      if (currentLock && currentLock.expiresAt > Date.now()) return false
      
      const token = crypto.randomUUID()

      this.activeLocks.set(key, {token, expiresAt: Date.now() + ttlMs})

      return token
      
    }

    const release = (token) => {
      if (this.activeLocks.get(key)?.token === token)  this.activeLocks.delete(key)
    }
    
    return {
      attempt: async (fn) => {
        const token = acquire()

        if (!token) return false

        try {
          return await fn()
        } finally  {
          release(token)
        }
        
      },
      block: async (fn, options) => {
        const maxWait = options?.maxWait ?? 10000
        const pollInterval = options?.pollInterval ?? 250
        const start = Date.now()

        let token: string | false = false;
        
        while (!(token = acquire())) {
          if (Date.now() - start > maxWait ) throw new LockTimeoutError(key, maxWait)

          await new Promise(resolve => setTimeout(resolve, pollInterval))
        }     

        try {
          return await fn()
        } finally  {
          release(token)
        }
        
      },
      release: async () => this.activeLocks.delete(key),
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.tagToKeys.clear();
    this.keyToTags.clear();
    this.activeLocks.clear();
  }
  
}