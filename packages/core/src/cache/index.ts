import { MemoryCacheStore } from './drivers/memory.js';
import type { CacheStore, CacheOptions, LockOptions, TaggedCache, CacheDriverFactory, CacheConfig } from './types.js';

export * from './types.js';
export * from './drivers/memory.js';

class PrefixWrapperStore implements CacheStore {
  constructor(private store: CacheStore, private prefix: string) {}

  private p(key: string) { return this.prefix + key; }
  private pArr(keys: string[]) { return keys.map(k => this.p(k)); }

  get<T>(key: string) { return this.store.get<T>(this.p(key)); }
  set<T>(key: string, value: T, options?: CacheOptions) { return this.store.set(this.p(key), value, options); }
  delete(key: string) { return this.store.delete(this.p(key)); }
  has(key: string) { return this.store.has(this.p(key)); }
  increment(key: string, by?: number) { return this.store.increment(this.p(key), by); }
  decrement(key: string, by?: number) { return this.store.decrement(this.p(key), by); }
  ttl(key: string) { return this.store.ttl(this.p(key)); }
  
  async getMany<T>(keys: string[]) {
    const prefixedMap = await this.store.getMany<T>(this.pArr(keys));
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = prefixedMap[this.p(key)];
    }
    return result;
  }
  
  setMany<T>(entries: [string, T][], options?: CacheOptions) {
    const prefixedEntries = entries.map(([k, v]) => [this.p(k), v] as [string, T]);
    return this.store.setMany(prefixedEntries, options);
  }
  
  tags(...tags: string[]) {
    // We pass the raw tags to the underlying store, but wrap the returned TaggedCache
    const tagged = this.store.tags(...tags);
    return {
      get: <T>(key: string) => tagged.get<T>(this.p(key)),
      set: <T>(key: string, value: T, options?: CacheOptions) => tagged.set(this.p(key), value, options),
      delete: (key: string) => tagged.delete(this.p(key)),
      has: (key: string) => tagged.has(this.p(key)),
      flush: () => tagged.flush()
    };
  }
  
  lock(key: string, options?: LockOptions) { return this.store.lock(this.p(key), options); }
  clear() { return this.store.clear(); }
}

/**
 * The core Cache Manager that orchestrates multiple cache stores and drivers.
 * Provides a unified API for caching across the application.
 */
export class CacheManager implements CacheStore {
  private config?: CacheConfig;
  private resolvedStores = new Map<string, CacheStore>();
  private drivers = new Map<string, CacheDriverFactory>();

  /**
   * Configure the Cache Manager with stores and a default store name.
   */
  configure(config: CacheConfig) {
    this.config = config;
    this.resolvedStores.clear();
  }

  /**
   * Register a custom cache driver factory.
   */
  extend(driverName: string, factory: CacheDriverFactory) {
    this.drivers.set(driverName, factory);
  }

  /**
   * Retrieve a specific configured cache store by name.
   * If no name is provided, returns the default store.
   */
  store(name?: string): CacheStore {
    const storeName = name || this.config?.default || 'default';
    
    if (this.resolvedStores.has(storeName)) {
      return this.resolvedStores.get(storeName)!;
    }

    const storeConfig = this.config?.stores?.[storeName];
    if (!storeConfig && storeName !== 'default') {
      throw new Error(`Cache store [${storeName}] is not configured.`);
    }

    // Fallback for default if no config provided yet
    const actualConfig = storeConfig || { driver: 'memory' };
    
    let driverFactory: CacheDriverFactory;
    if (typeof actualConfig.driver === 'string') {
      driverFactory = this.drivers.get(actualConfig.driver)!;
      if (!driverFactory) {
        throw new Error(`Cache driver [${actualConfig.driver}] is not supported or registered.`);
      }
    } else {
      driverFactory = actualConfig.driver;
    }

    let storeInstance = driverFactory(actualConfig);
    
    // Apply prefix wrapping if requested by the store config
    if (actualConfig.prefix) {
      storeInstance = new PrefixWrapperStore(storeInstance, actualConfig.prefix);
    }

    this.resolvedStores.set(storeName, storeInstance);
    return storeInstance;
  }

  // Delegate Core CacheStore Methods to the Default Store
  async get<T>(key: string) { return this.store().get<T>(key); }
  async set<T>(key: string, value: T, options?: CacheOptions) { 
    // If no TTL provided, fallback to default TTL in config
    const storeConfig = this.config?.stores?.[this.config?.default || 'default'];
    const ttl = options?.ttl !== undefined ? options.ttl : (storeConfig?.ttl ?? null);
    return this.store().set(key, value, { ...options, ttl }); 
  }
  async delete(key: string) { return this.store().delete(key); }
  async has(key: string) { return this.store().has(key); }
  async increment(key: string, by?: number) { return this.store().increment(key, by); }
  async decrement(key: string, by?: number) { return this.store().decrement(key, by); }
  async ttl(key: string) { return this.store().ttl(key); }
  async getMany<T>(keys: string[]) { return this.store().getMany<T>(keys); }
  async setMany<T>(entries: [string, T][], options?: CacheOptions) { return this.store().setMany(entries, options); }
  tags(...tags: string[]) { return this.store().tags(...tags); }
  lock(key: string, options?: LockOptions) { return this.store().lock(key, options); }
  async clear() { return this.store().clear(); }

  /**
   * Syntactic sugar for .tags(name).
   * Isolates cache operations to a specific namespace.
   */
  namespace(name: string): TaggedCache {
    return this.tags(name);
  }

  /**
   * Retrieve an item from the cache, or execute the given callback and store the result
   * if the item does not exist.
   */
  async remember<T>(key: string, callback: () => T | Promise<T>, options?: CacheOptions): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await callback();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Retrieve an item from the cache, or execute the given callback and store the result
   * indefinitely if the item does not exist.
   */
  async rememberForever<T>(key: string, callback: () => T | Promise<T>): Promise<T> {
    return this.remember(key, callback, { ttl: null });
  }
}

/**
 * The global CacheManager instance.
 */
export const cache = new CacheManager();

cache.extend('memory', () => new MemoryCacheStore());

/**
 * Helper to define a typed custom cache driver factory.
 */
export function defineCacheDriver<TConfig>(factory: CacheDriverFactory<TConfig>): CacheDriverFactory<TConfig> {
  return factory;
}