// src/lib/fetchWithRetry.ts

/**
 * Fetch wrapper with exponential backoff retry logic.
 * Retries the request up to `maxAttempts` times.
 * Delay starts at `baseDelayMs` and doubles each retry.
 * Errors are re‑thrown after the final attempt.
 */
export async function fetchWithRetry(
  input: RequestInfo,
  init?: RequestInit,
  maxAttempts: number = 3,
  baseDelayMs: number = 200,
): Promise<Response> {
  let attempt = 0;
  let delay = baseDelayMs;
  while (true) {
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        // treat HTTP errors as failures to retry
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) {
        // re‑throw the original error (or the one we just caught)
        throw err;
      }
      // wait before next attempt
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2; // exponential backoff
    }
  }
}
