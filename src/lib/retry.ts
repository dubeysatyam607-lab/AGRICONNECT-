// src/lib/retry.ts
/**
 * Generic retry utility with exponential backoff.
 *
 * Usage:
 *   const data = await retry(() => fetch(url).then(r => r.json()), { retries: 3, delay: 300 });
 */
export interface RetryOptions {
  /** Number of attempts (including the first one). */
  retries?: number;
  /** Base delay in ms before the first retry. Subsequent retries double the delay. */
  delay?: number;
  /** Optional predicate to determine if an error is retry‑able. */
  shouldRetry?: (error: any) => boolean;
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, delay = 500, shouldRetry } = options;
  let attempt = 0;
  let wait = delay;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const retryable = shouldRetry ? shouldRetry(err) : true;
      if (!retryable || attempt > retries) {
        throw err;
      }
      // Wait before next attempt
      await new Promise((res) => setTimeout(res, wait));
      wait *= 2; // exponential backoff
    }
  }
}
