import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, parseWindow, rateLimit } from '../../runtime/auth/rate-limit.js';
import { cache } from '../../cache/index.js';
import { RateLimitError } from '../../errors.js';
import type { RequestEvent } from '@sveltejs/kit';
import { MemoryCacheStore } from '../../cache/drivers/memory.js';

function createMockEvent(ip: string, user?: any): RequestEvent {
  return {
    getClientAddress: () => ip,
    locals: { user },
    request: new Request('http://localhost/test')
  } as unknown as RequestEvent;
}

describe('Rate Limiting', () => {
  beforeEach(async () => {
    cache.configure({ default: 'main', stores: { main: { driver: 'memory' } } });
    await cache.clear();
    vi.useRealTimers();
  });

  describe('parseWindow', () => {
    it('parses valid window strings into seconds', () => {
      expect(parseWindow('30s')).toBe(30);
      expect(parseWindow('1m')).toBe(60);
      expect(parseWindow('5m')).toBe(300);
      expect(parseWindow('1h')).toBe(3600);
      expect(parseWindow('1d')).toBe(86400);
      expect(parseWindow(45)).toBe(45);
    });

    it('throws on invalid window strings', () => {
      expect(() => parseWindow('10x')).toThrow(/Invalid rate limit window/);
      expect(() => parseWindow('invalid')).toThrow(/Invalid rate limit window/);
    });
  });

  describe('checkRateLimit', () => {
    it('permits requests within allowed limit', async () => {
      const event = createMockEvent('192.168.1.1');
      const config = { window: '1m', max: 3 };

      const r1 = await checkRateLimit(event, config);
      expect(r1.remaining).toBe(2);

      const r2 = await checkRateLimit(event, config);
      expect(r2.remaining).toBe(1);

      const r3 = await checkRateLimit(event, config);
      expect(r3.remaining).toBe(0);
    });

    it('throws RateLimitError carrying retryAfter, limit, and window when limit is exceeded', async () => {
      const event = createMockEvent('192.168.1.2');
      const config = { window: '1m', max: 2 };

      await checkRateLimit(event, config);
      await checkRateLimit(event, config);

      await expect(checkRateLimit(event, config)).rejects.toThrow(RateLimitError);

      try {
        await checkRateLimit(event, config);
      } catch (err: any) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect(err.limit).toBe(2);
        expect(err.window).toBe('1m');
        expect(err.retryAfter).toBeGreaterThan(0);
        expect(err.retryAfter).toBeLessThanOrEqual(60);
      }
    });

    it('isolates different keys so distinct clients do not affect each other', async () => {
      const eventA = createMockEvent('10.0.0.1');
      const eventB = createMockEvent('10.0.0.2');
      const config = { window: '1m', max: 1 };

      await checkRateLimit(eventA, config);
      await expect(checkRateLimit(eventA, config)).rejects.toThrow(RateLimitError);

      const resB = await checkRateLimit(eventB, config);
      expect(resB.remaining).toBe(0);
    });

    it('resets allowed request count after window elapses', async () => {
      vi.useFakeTimers();
      const event = createMockEvent('192.168.1.5');
      const config = { window: '1m', max: 1 };

      await checkRateLimit(event, config);
      await expect(checkRateLimit(event, config)).rejects.toThrow(RateLimitError);

      vi.advanceTimersByTime(61_000);

      const result = await checkRateLimit(event, config);
      expect(result.remaining).toBe(0);
      vi.useRealTimers();
    });

    it('supports custom keyBy extractor', async () => {
      const authEvent = createMockEvent('192.168.1.100', { id: 'usr_xyz' });
      const config = {
        window: '1m',
        max: 2,
        keyBy: (e: any) => e.locals.user?.id ?? e.getClientAddress()
      };

      await checkRateLimit(authEvent, config);
      const res = await checkRateLimit(authEvent, config);
      expect(res.remaining).toBe(0);
    });
  });

  describe('rateLimit function wrapper', () => {
    it('wraps handler and blocks execution when rate limit is exceeded', async () => {
      const mockEvent = createMockEvent('192.168.1.50');
      const rawHandler = vi.fn().mockResolvedValue({ success: true });

      const protectedHandler = rateLimit(
        { window: '1m', max: 2 },
        rawHandler
      );

      const res1 = await protectedHandler({}, mockEvent);
      expect(res1).toEqual({ success: true });
      expect(rawHandler).toHaveBeenCalledTimes(1);

      const res2 = await protectedHandler({}, mockEvent);
      expect(res2).toEqual({ success: true });
      expect(rawHandler).toHaveBeenCalledTimes(2);

      await expect(protectedHandler({}, mockEvent)).rejects.toThrow(RateLimitError);
      expect(rawHandler).toHaveBeenCalledTimes(2);
    });
  });
});
