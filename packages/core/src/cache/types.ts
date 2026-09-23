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