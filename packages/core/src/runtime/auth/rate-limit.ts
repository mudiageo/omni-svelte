import type { RequestEvent } from '@sveltejs/kit';
import { cache } from '../../cache/index.js';
import { RateLimitError } from '../../errors.js';

export interface RateLimitConfig {
  /**
   * The duration of the rate limit window (e.g. '30s', '1m', '1h', '1d' or seconds).
   */
  window: string | number;
  /**
   * Maximum allowed requests in the window.
   */
  max: number;
  /**
   * Optional custom extractor for the rate limit key.
   * Defaults to event.getClientAddress().
   */
  keyBy?: (event: RequestEvent) => string;
}

/**
 * Parses a human-readable duration string into seconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days).
 */
export function parseWindow(window: string | number): number {
  if (typeof window === 'number') return window;

  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid rate limit window format: ${window}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: throw new Error(`Invalid rate limit window format: ${window}`);
  }
}

/**
 * Perform a fixed-window rate limit check using the cache.
 */
export async function checkRateLimit(event: RequestEvent, config: RateLimitConfig): Promise<{ remaining: number }> {
  const windowSeconds = parseWindow(config.window);
  const keyBase = config.keyBy ? config.keyBy(event) : event.getClientAddress();
  
  // Use fixed-window counter mapped to the nearest window interval
  // e.g. Math.floor(Date.now() / (windowSeconds * 1000))
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const cacheKey = `rate_limit:${keyBase}:${windowId}`;

  // Check if we need to initialize
  const exists = await cache.has(cacheKey);

  let currentCount: number;
  if (!exists) {
    // Set initial count with TTL to avoid orphans
    await cache.set(cacheKey, 1, { ttl: windowSeconds });
    currentCount = 1;
  } else {
    currentCount = await cache.increment(cacheKey, 1);
  }

  if (currentCount > config.max) {
    // Determine how much time is left in the current window
    const ttl = await cache.ttl(cacheKey);
    const retryAfter = ttl !== null && ttl > 0 ? Math.ceil(ttl) : windowSeconds;

    throw new RateLimitError(retryAfter, config.max, String(config.window));
  }

  return { remaining: config.max - currentCount };
}

/**
 * Wrap a SvelteKit form or remote function handler with a rate limit.
 */
export function rateLimit<TArgs extends any[], TReturn>(
  config: RateLimitConfig,
  handler: (data: any, event: RequestEvent) => TReturn | Promise<TReturn>
) {
  return async (data: any, event: RequestEvent): Promise<TReturn> => {
    await checkRateLimit(event, config);
    return handler(data, event);
  };
}
