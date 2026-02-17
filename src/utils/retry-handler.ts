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
    const status = (error.response as { status: number }).status;
    return status >= 500 || status === 429;
  }

  return false;
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry Handler class
 * Manages retry logic with exponential backoff
 */
export class RetryHandler {
  /**
   * Executes a function with retry logic
   * @param fn Function to execute
   * @param options Retry options
   * @returns Result with value or RetryExhaustedError
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<Result<T, RetryExhaustedError>> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const baseDelay = options?.baseDelay ?? 1000;
    const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        return { ok: true, value: result };
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or if error is not retryable
        if (attempt === maxAttempts || !shouldRetry(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delayMs = baseDelay * Math.pow(2, attempt - 1);

        // Wait before retrying
        await delay(delayMs);
      }
    }

    return {
      ok: false,
      error: {
        attempts: maxAttempts,
        lastError,
      },
    };
  }
}

/**
 * Standalone retry function (for backward compatibility)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<Result<T, RetryExhaustedError>> {
  const handler = new RetryHandler();
  return handler.withRetry(fn, options);
}
