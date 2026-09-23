/**
 * Options for setting a cache entry.
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds.
   * If null, the cache entry will be stored indefinitely.
   */
  ttl?: number | null;
}

/**
 * Options for acquiring a cache lock.
 */
export interface LockOptions {
  /**
   * The maximum time (in seconds) that the lock should be held before it automatically expires.
   * Default: 30 seconds.
   */
  ttl?: number;
}

/**
 * Options for blocking locks (waiting for a lock to become available).
 */
export interface BlockLockOptions {
  /**
   * Maximum wait duration in milliseconds before throwing a LockTimeoutError.
   * Default: 10000ms.
   */
  maxWait?: number;
  /**
   * Polling retry interval in milliseconds while waiting to acquire the lock.
   * Default: 250ms.
   */
  pollInterval?: number;
}

/**
 * The standard interface that all Cache Drivers must implement.
 */
export interface CacheStore {
  /**
   * Retrieve an item from the cache.
   * Returns null if the item is missing or has expired.
   */
  get<T = unknown>(key: string): Promise<T | null>;
  
  /**
   * Store an item in the cache.
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Remove an item from the cache.
   * Returns true if the item was deleted, false if it did not exist.
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Determine if an item exists in the cache and has not expired.
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Increment the value of an item in the cache.
   * If the item does not exist, it will be initialized to the given value.
   */
  increment(key: string, by?: number): Promise<number>;
  
  /**
   * Decrement the value of an item in the cache.
   * If the item does not exist, it will be initialized to negative the given value.
   */
  decrement(key: string, by?: number): Promise<number>;
  
  /**
   * Get the remaining TTL (time-to-live) in seconds for a cache item.
   * Returns null if the item does not exist or has no expiration.
   */
  ttl(key: string): Promise<number | null>;
  
  /**
   * Retrieve multiple items from the cache in a single operation.
   */
  getMany<T = unknown>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Store multiple items in the cache in a single operation.
   */
  setMany<T = unknown>(entries: [string, T][], options?: CacheOptions): Promise<void>;
  
  /**
   * Begin building a tagged cache operation.
   * Tagged operations allow invalidating groups of related cache entries simultaneously.
   */
  tags(...tags: string[]): TaggedCache;
  
  /**
   * Get a lock instance for the given key.
   */
  lock(key: string, options?: LockOptions): CacheLock;
  
  /**
   * Remove all items from this cache store.
   */
  clear(): Promise<void>;
}

/**
 * Represents a cached store scoped to specific tags.
 */
export interface TaggedCache extends Pick<CacheStore, 'get' | 'set' | 'delete' | 'has'> {
  /**
   * Remove all cache entries associated with the tags.
   */
  flush(): Promise<void>;
}

/**
 * A distributed locking mechanism to prevent race conditions.
 */
export interface CacheLock {
  /**
   * Attempt to acquire the lock and execute the callback.
   * If the lock is already held by another process, it will wait up to maxWait.
   * Throws LockTimeoutError if the lock cannot be acquired in time.
   */
  block<T>(fn: () => Promise<T> | T, options?: BlockLockOptions): Promise<T>;
  
  /**
   * Attempt to acquire the lock without waiting.
   * Returns the result of the callback if acquired, or false if already locked.
   */
  attempt<T>(fn: () => Promise<T> | T): Promise<T | false>;
  
  /**
   * Forcefully release the lock, regardless of who holds it.
   */
  release(): Promise<boolean>;
}

/**
 * Factory function signature for creating custom cache drivers.
 */
export type CacheDriverFactory<TConfig = any> = (config: TConfig) => CacheStore;

/**
 * Global configuration object for the cache system.
 */
export interface CacheConfig {
  /**
   * The name of the default store to use.
   */
  default: string;
  /**
   * Configuration blocks for each available store.
   */
  stores: Record<string, { driver: string | CacheDriverFactory; [key: string]: any }>;
}