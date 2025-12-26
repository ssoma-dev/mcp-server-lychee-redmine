/**
 * Retry Handler Service
 * Provides exponential backoff retry logic with configurable options
 */

export interface RetryOptions {
  maxAttempts?: number; // default: 3
  baseDelay?: number; // ms, default: 1000
  shouldRetry?: (error: unknown) => boolean;
}

export interface RetryExhaustedError {
  attempts: number;
  lastError: unknown;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Default retry logic: retry on 5xx and 429 errors
 */
function defaultShouldRetry(error: unknown): boolean {
  // Check if error has response property (Axios error)
  if (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    error.response !== undefined &&
    typeof error.response === 'object' &&
    'status' in error.response
  ) {
    const status = error.response.status as number;
    // Retry on 5xx errors and 429 Too Many Requests
    return status >= 500 || status === 429;
  }
  return false;
}

/**
 * Extract Retry-After header value from error response
 */
function getRetryAfterDelay(error: unknown): number | null {
  if (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    error.response !== undefined &&
    typeof error.response === 'object' &&
    'headers' in error.response &&
    error.response.headers !== null &&
    error.response.headers !== undefined &&
    typeof error.response.headers === 'object' &&
    'retry-after' in error.response.headers
  ) {
    const retryAfter = error.response.headers['retry-after'];
    if (typeof retryAfter === 'string') {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
      }
    }
  }
  return null;
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  error: unknown
): number {
  // Check for Retry-After header (429 rate limit)
  const retryAfterDelay = getRetryAfterDelay(error);
  if (retryAfterDelay !== null) {
    return retryAfterDelay;
  }

  // Exponential backoff: baseDelay * 2^(attempt-1)
  // attempt 1: baseDelay * 1 = 1000ms
  // attempt 2: baseDelay * 2 = 2000ms
  // attempt 3: baseDelay * 4 = 4000ms
  return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * Wait for specified duration
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<Result<T, RetryExhaustedError>> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelay = options.baseDelay ?? 1000;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { ok: true, value: result };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error)) {
        // Don't retry, return error immediately
        return {
          ok: false,
          error: { attempts: attempt, lastError: error },
        };
      }

      // Check if we've exhausted attempts
      if (attempt >= maxAttempts) {
        // No more retries, return error
        return {
          ok: false,
          error: { attempts: attempt, lastError: error },
        };
      }

      // Calculate delay and wait before next retry
      const delay = calculateDelay(attempt, baseDelay, error);
      await wait(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    ok: false,
    error: { attempts: maxAttempts, lastError },
  };
}
