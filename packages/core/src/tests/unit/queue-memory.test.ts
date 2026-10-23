import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineJob } from '../../queue/job.js';
import { QueueManager } from '../../queue/manager.js';
import { MemoryQueueStore } from '../../queue/drivers/memory.js';
import { z } from 'zod';
import { JobMaxAttemptsError, JobTimeoutError, ValidationError } from '../../errors.js';

describe('Queue Memory Driver & defineJob', () => {
  let queue: QueueManager;

  beforeEach(() => {
    queue = new QueueManager();
    queue.configure({
      default: 'main',
      connections: {
        main: { driver: 'memory' }
      },
      queues: {
        default: { concurrency: 1 },
      }
    });
    vi.useRealTimers();
  });

  describe('defineJob', () => {
    it('validates payload with Zod schema', async () => {
      const myJob = defineJob({
        name: 'test.job',
        schema: z.object({ email: z.string().email() }),
        handle: async ({ data }) => {
          return `Sent to ${data.email}`;
        }
      });

      // Need to attach the global queue manager to the job for tests
      // or the job relies on a globally exported queue instance
      myJob.__setQueueManager(queue);

      await expect(myJob.dispatch({ email: 'invalid' } as any)).rejects.toThrow(ValidationError);

      const result = await myJob.dispatch({ email: 'test@example.com' });
      expect(result).toBe('Sent to test@example.com');
    });

    it('executes job hooks (completed)', async () => {
      const onCompleted = vi.fn();
      
      const hookJob = defineJob({
        name: 'hook.job',
        schema: z.object({ x: z.number() }),
        handle: async ({ data }) => data.x * 2,
        completed: onCompleted
      });
      hookJob.__setQueueManager(queue);

      await hookJob.dispatch({ x: 5 });
      
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { x: 5 },
          result: 10
        })
      );
    });
  });

  describe('Memory Driver execution', () => {
    it('handles retries and backoff for failing jobs', async () => {
      vi.useFakeTimers();
      let attempts = 0;
      const onFailed = vi.fn();

      const failJob = defineJob({
        name: 'fail.job',
        schema: z.any(),
        attempts: 3,
        backoff: { type: 'fixed', delay: '10s' },
        handle: async () => {
          attempts++;
          throw new Error('Random failure');
        },
        failed: onFailed
      });
      failJob.__setQueueManager(queue);

      const dispatchPromise = failJob.dispatch({});
      
      // Fast forward time for retries
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(11000); // Past the 10s backoff
      }

      await expect(dispatchPromise).rejects.toThrow(JobMaxAttemptsError);
      
      expect(attempts).toBe(3); // 1 initial + 2 retries = 3 attempts total
      expect(onFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 3,
          error: expect.any(Error)
        })
      );

      vi.useRealTimers();
    });

    it('respects job timeouts', async () => {
      vi.useFakeTimers();
      const timeoutJob = defineJob({
        name: 'timeout.job',
        schema: z.any(),
        timeout: '1s',
        handle: async () => {
          // Await a promise that resolves after 5s
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      });
      timeoutJob.__setQueueManager(queue);

      const dispatchPromise = timeoutJob.dispatch({});
      
      await vi.advanceTimersByTimeAsync(1500); // Advance past 1s timeout

      await expect(dispatchPromise).rejects.toThrow(JobTimeoutError);
      vi.useRealTimers();
    });
  });
});
