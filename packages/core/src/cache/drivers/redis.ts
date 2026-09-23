import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { LockTimeoutError } from '../../errors.js';
import type { CacheStore, CacheOptions, TaggedCache, LockOptions, CacheLock } from '../types.js';

export interface RedisCacheConfig extends RedisOptions {
  url?: string;
  prefix?: string;
}

/**
 * Redis driver for OmniSvelte Cache System.
 * Uses ioredis under the hood.
 */
export class RedisCacheStore implements CacheStore {
  private client: Redis;

  constructor(config: RedisCacheConfig) {
    if (config.url) {
      this.client = new Redis(config.url, config);
    } else {
      this.client = new Redis(config);
    }
  }

  private serialize(value: any): string {
    return JSON.stringify({ data: value });
  }

  private deserialize<T>(value: string | null): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value).data as T;
    } catch {
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return this.deserialize<T>(val);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const serialized = this.serialize(value);
    if (typeof options?.ttl === 'number') {
      await this.client.set(key, serialized, 'EX', options.ttl);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    const deleted = await this.client.del(key);
    return deleted > 0;
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists > 0;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    // If the key stores a serialized JSON object, INCRBY won't work natively.
    // However, for pure numbers, we can use INCRBYFLOAT.
    // To support `increment` on missing keys or numeric keys natively:
    // We must use a Lua script to parse the JSON `{ data: 5 }`, increment, and save back.
    // TODO Or we simply store raw numbers if increment is used? 
    // For simplicity, we will just do a GET, increment, SET. 
    // Atomic INCR in Redis on JSON is hard without Lua.
    const script = `
      local current = redis.call('GET', KEYS[1])
      local val = 0
      if current then
        local ok, decoded = pcall(cjson.decode, current)
        if ok and decoded.data then
          val = tonumber(decoded.data) or 0
        end
      end
      val = val + tonumber(ARGV[1])
      redis.call('SET', KEYS[1], cjson.encode({ data = val }))
      return tostring(val)
    `;
    const res = await this.client.eval(script, 1, key, by);
    return parseFloat(res as string);
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    return this.increment(key, -by);
  }

  async ttl(key: string): Promise<number | null> {
    const ms = await this.client.pttl(key);
    if (ms < 0) return null; // -1 means no expiry, -2 means doesn't exist
    return ms / 1000;
  }

  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    if (keys.length === 0) return {};
    const values = await this.client.mget(keys);
    const result: Record<string, T | null> = {};
    keys.forEach((key, index) => {
      result[key] = this.deserialize<T>(values[index]);
    });
    return result;
  }

  async setMany<T>(entries: [string, T][], options?: CacheOptions): Promise<void> {
    if (entries.length === 0) return;
    const pipeline = this.client.pipeline();
    for (const [key, value] of entries) {
      const serialized = this.serialize(value);
      if (typeof options?.ttl === 'number') {
        pipeline.set(key, serialized, 'EX', options.ttl);
      } else {
        pipeline.set(key, serialized);
      }
    }
    await pipeline.exec();
  }

  tags(...tags: string[]): TaggedCache {
    return {
      get: (key) => this.get(key),
      has: (key) => this.has(key),
      delete: (key) => this.delete(key),
      set: async (key, value, options) => {
        await this.set(key, value, options);
        // Track the key in Redis Sets for each tag
        const pipeline = this.client.pipeline();
        for (const tag of tags) {
          pipeline.sadd(`tag:${tag}:keys`, key);
        }
        await pipeline.exec();
      },
      flush: async () => {
        const pipeline = this.client.pipeline();
        for (const tag of tags) {
          const tagSetKey = `tag:${tag}:keys`;
          // Get all keys associated with this tag
          const keys = await this.client.smembers(tagSetKey);
          if (keys.length > 0) {
            pipeline.del(...keys);
          }
          // Delete the tag index itself
          pipeline.del(tagSetKey);
        }
        await pipeline.exec();
      }
    };
  }

  lock(key: string, options?: LockOptions): CacheLock {
    const ttlMs = (options?.ttl ?? 30) * 1000;

    const acquire = async (): Promise<string | false> => {
      const token = crypto.randomUUID();
      const acquired = await this.client.set(key, token, 'PX', ttlMs, 'NX');
      return acquired === 'OK' ? token : false;
    };

    const release = async (token: string): Promise<boolean> => {
      const script = `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          return redis.call('DEL', KEYS[1])
        else
          return 0
        end
      `;
      const res = await this.client.eval(script, 1, key, token);
      return res === 1;
    };

    return {
      attempt: async <T>(fn: () => Promise<T> | T): Promise<T | false> => {
        const token = await acquire();
        if (!token) return false;
        try {
          return await fn();
        } finally {
          await release(token);
        }
      },
      block: async <T>(fn: () => Promise<T> | T, blockOpts?: import('../types.js').BlockLockOptions): Promise<T> => {
        const maxWait = blockOpts?.maxWait ?? 10000;
        const pollInterval = blockOpts?.pollInterval ?? 250;
        const start = Date.now();

        let token: string | false = false;
        while (!(token = await acquire())) {
          if (Date.now() - start > maxWait) {
            throw new LockTimeoutError(key, maxWait);
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        try {
          return await fn();
        } finally {
          await release(token);
        }
      },
      release: async () => {
        // Force release without knowing the token
        const deleted = await this.client.del(key);
        return deleted > 0;
      }
    };
  }

  async clear(): Promise<void> {
    await this.client.flushdb();
  }
}
