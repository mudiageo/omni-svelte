/**
 * Omni Cache - Caching layer
 * 
 * Provides a unified caching API with support for multiple backends
 * (in-memory, Redis, filesystem, etc.)
 */

// Types
export interface CacheConfig {
    driver: 'memory' | 'redis' | 'filesystem';
    prefix?: string;
    ttl?: number; // Default TTL in seconds
    redis?: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    filesystem?: {
        path: string;
    };
}

export interface CacheEntry<T = any> {
    value: T;
    expiresAt: number | null; // Unix timestamp or null for no expiry
}

// In-memory cache store
const memoryStore = new Map<string, CacheEntry>();

let cacheConfig: CacheConfig = {
    driver: 'memory',
    prefix: 'omni:',
    ttl: 3600, // 1 hour default
};

/**
 * Configure the cache system
 */
export function configureCache(config: CacheConfig): void {
    cacheConfig = { ...cacheConfig, ...config };
}

function prefixKey(key: string): string {
    return `${cacheConfig.prefix || ''}${key}`;
}

/**
 * Get a value from cache
 */
export async function get<T = any>(key: string): Promise<T | null> {
    const prefixed = prefixKey(key);

    if (cacheConfig.driver === 'memory') {
        const entry = memoryStore.get(prefixed);
        if (!entry) return null;

        // Check expiry
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            memoryStore.delete(prefixed);
            return null;
        }

        return entry.value as T;
    }

    // TODO: Implement Redis/filesystem drivers
    console.warn(`🗄️ [Cache] Driver '${cacheConfig.driver}' not yet implemented.`);
    return null;
}

/**
 * Set a value in cache
 */
export async function set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const prefixed = prefixKey(key);
    const seconds = ttl ?? cacheConfig.ttl ?? 3600;

    if (cacheConfig.driver === 'memory') {
        memoryStore.set(prefixed, {
            value,
            expiresAt: seconds > 0 ? Date.now() + seconds * 1000 : null,
        });
        return;
    }

    console.warn(`🗄️ [Cache] Driver '${cacheConfig.driver}' not yet implemented.`);
}

/**
 * Remove a value from cache
 */
export async function forget(key: string): Promise<boolean> {
    const prefixed = prefixKey(key);

    if (cacheConfig.driver === 'memory') {
        return memoryStore.delete(prefixed);
    }

    console.warn(`🗄️ [Cache] Driver '${cacheConfig.driver}' not yet implemented.`);
    return false;
}

/**
 * Check if a key exists in cache
 */
export async function has(key: string): Promise<boolean> {
    const value = await get(key);
    return value !== null;
}

/**
 * Get a value from cache, or set it if it doesn't exist
 */
export async function remember<T = any>(
    key: string,
    ttl: number,
    callback: () => T | Promise<T>
): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== null) return cached;

    const value = await callback();
    await set(key, value, ttl);
    return value;
}

/**
 * Clear all cache entries
 */
export async function flush(): Promise<void> {
    if (cacheConfig.driver === 'memory') {
        memoryStore.clear();
        return;
    }

    console.warn(`🗄️ [Cache] Driver '${cacheConfig.driver}' not yet implemented.`);
}
