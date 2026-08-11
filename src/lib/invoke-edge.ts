import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke a Supabase edge function with a hard timeout.
 *
 * Root-cause fix for infinite loading states: unguarded `functions.invoke`
 * calls never settle when a gateway hangs, leaving spinners forever. Every
 * interactive edge call should go through this helper.
 */

const DEFAULT_TIMEOUT_MS = 12000;

export class EdgeCallTimeoutError extends Error {
  constructor(functionName: string) {
    super(`Timed out calling ${functionName}`);
    this.name = "EdgeCallTimeoutError";
  }
}

export interface EdgeCallResult<T> {
  data: T | null;
  error: string | null;
  timedOut: boolean;
}

export async function invokeEdgeWithTimeout<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<EdgeCallResult<T>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
      signal: controller.signal,
    } as never);
    if (error) {
      // `error` carries the edge function's JSON payload on non-2xx responses.
      const payload = (error as { message?: string; context?: unknown }).context as
        | { error?: string }
        | undefined;
      return { data: null, error: payload?.error || (error as { message?: string }).message || "Request failed", timedOut: false };
    }
    return { data, error: null, timedOut: false };
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    return {
      data: null,
      error: isTimeout
        ? "The request took too long. Please check your connection and try again."
        : err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      timedOut: isTimeout,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Friendly, non-technical error copy for common failure classes. */
export function friendlyEdgeError(timedOut: boolean, hasNetwork = false): string {
  if (timedOut) return "The server is taking too long to respond. Please try again.";
  if (!hasNetwork) return "You appear to be offline. Check your connection and try again.";
  return "Something went wrong on our side. Please try again in a moment.";
}

/**
 * POST JSON directly to an edge function endpoint with a hard timeout.
 * Used by marketplace components that call the function URL directly.
 */
export async function postEdgeJson<T = Record<string, unknown>>(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error((json.error as string) || "Request failed");
    }
    return json as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}
