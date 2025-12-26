import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, RetryOptions } from './retry-handler.js';

describe('Retry Handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('Exponential Backoff', () => {
    it('should retry with exponential backoff delays', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Server error');
          error.response = { status: 500 };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);

      // First attempt - immediate
      await vi.runOnlyPendingTimersAsync();

      // Second attempt - 1000ms delay
      await vi.advanceTimersByTimeAsync(1000);

      // Third attempt - 2000ms delay
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use custom base delay', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Server error');
          error.response = { status: 500 };
          throw error;
        }
        return 'success';
      });

      const options: RetryOptions = { baseDelay: 500 };
      const promise = withRetry(fn, options);

      await vi.runOnlyPendingTimersAsync();
      await vi.advanceTimersByTimeAsync(500); // Custom base delay

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('5xx Error Handling', () => {
    it('should retry on 500 Internal Server Error', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error: any = new Error('Server error');
          error.response = { status: 500 };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 Bad Gateway', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error: any = new Error('Bad Gateway');
          error.response = { status: 502 };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error: any = new Error('Service Unavailable');
          error.response = { status: 503 };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 504 Gateway Timeout', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error: any = new Error('Gateway Timeout');
          error.response = { status: 504 };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('4xx Error Handling', () => {
    it('should NOT retry on 400 Bad Request', async () => {
      const fn = vi.fn(async () => {
        const error: any = new Error('Bad Request');
        error.response = { status: 400 };
        throw error;
      });

      const result = await withRetry(fn);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 401 Unauthorized', async () => {
      const fn = vi.fn(async () => {
        const error: any = new Error('Unauthorized');
        error.response = { status: 401 };
        throw error;
      });

      const result = await withRetry(fn);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 404 Not Found', async () => {
      const fn = vi.fn(async () => {
        const error: any = new Error('Not Found');
        error.response = { status: 404 };
        throw error;
      });

      const result = await withRetry(fn);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('429 Rate Limit Handling', () => {
    it('should retry after Retry-After header value (seconds)', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error: any = new Error('Too Many Requests');
          error.response = {
            status: 429,
            headers: { 'retry-after': '5' },
          };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);

      await vi.runOnlyPendingTimersAsync();
      await vi.advanceTimersByTimeAsync(5000); // Retry-After: 5 seconds

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use default delay when Retry-After header is missing', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error: any = new Error('Too Many Requests');
          error.response = { status: 429 };
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(fn);

      await vi.runOnlyPendingTimersAsync();
      await vi.advanceTimersByTimeAsync(1000); // Default base delay

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Max Attempts', () => {
    it('should stop retrying after max attempts (default 3)', async () => {
      const fn = vi.fn(async () => {
        const error: any = new Error('Server error');
        error.response = { status: 500 };
        throw error;
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(3);
      if (!result.ok) {
        expect(result.error.attempts).toBe(3);
        expect(result.error.lastError).toBeDefined();
      }
    });

    it('should respect custom max attempts', async () => {
      const fn = vi.fn(async () => {
        const error: any = new Error('Server error');
        error.response = { status: 500 };
        throw error;
      });

      const options: RetryOptions = { maxAttempts: 5 };
      const promise = withRetry(fn, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should return error details on retry exhaustion', async () => {
      const testError: any = new Error('Persistent error');
      testError.response = { status: 500 };

      const fn = vi.fn(async () => {
        throw testError;
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.attempts).toBe(3);
        expect(result.error.lastError).toBe(testError);
      }
    });
  });

  describe('Custom Retry Logic', () => {
    it('should use custom shouldRetry function', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Custom retryable error');
        }
        return 'success';
      });

      const options: RetryOptions = {
        shouldRetry: (error: unknown) => {
          return error instanceof Error && error.message.includes('retryable');
        },
      };

      const promise = withRetry(fn, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry when custom shouldRetry returns false', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Non-retryable error');
      });

      const options: RetryOptions = {
        shouldRetry: () => false,
      };

      const result = await withRetry(fn, options);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Successful Execution', () => {
    it('should return success on first attempt', async () => {
      const fn = vi.fn(async () => 'immediate success');

      const result = await withRetry(fn);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('immediate success');
      }
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return success after retries', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Temporary error');
          error.response = { status: 503 };
          throw error;
        }
        return 'eventual success';
      });

      const promise = withRetry(fn);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('eventual success');
      }
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
