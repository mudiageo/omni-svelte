import type { Handle } from '@sveltejs/kit';
import { checkRateLimit } from './rate-limit.js';
import type { OmniConfig } from '../../types.js';
import { RateLimitError } from '../../errors.js';

export function createRateLimitHandle(config: OmniConfig): Handle {
  return async ({ event, resolve }) => {
    if (config.rateLimit) {
      try {
        await checkRateLimit(event, config.rateLimit);
      } catch (err) {
        if (err instanceof RateLimitError) {
          return new Response(
            JSON.stringify({ 
              message: err.message, 
              limit: err.limit, 
              window: err.window 
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(err.retryAfter)
              }
            }
          );
        }
        throw err;
      }
    }
    return resolve(event);
  };
}
