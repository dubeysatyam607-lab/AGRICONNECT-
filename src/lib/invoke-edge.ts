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
  /** Optional stable machine-readable error code returned by edge functions. */
  code?: string | null;
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
      let payloadError: string | undefined;
      let payloadCode: string | undefined;

      const contextObj = (error as { context?: unknown }).context;
      if (contextObj && typeof contextObj === "object") {
        if ("json" in contextObj && typeof (contextObj as any).json === "function") {
          try {
            const res = (contextObj as Response).clone ? (contextObj as Response).clone() : (contextObj as Response);
            const json = await res.json().catch(() => null);
            if (json && typeof json === "object") {
              payloadError = json.error || json.message;
              payloadCode = json.code;
            }
          } catch {
            // fallback if json reading fails
          }
        } else {
          payloadError = (contextObj as { error?: string; message?: string }).error || (contextObj as { message?: string }).message;
          payloadCode = (contextObj as { code?: string }).code;
        }
      }

      const rawMsg = payloadError || (error as { message?: string }).message || "Request failed";
      const code = payloadCode ?? null;

      // Detect common Supabase proxy & AI key errors and translate to actionable messages.
      const lower = rawMsg.toLowerCase();
      if (lower.includes("function") && (lower.includes("not found") || lower.includes("not deployed"))) {
        return { data: null, error: "This feature is not yet deployed. Please deploy the edge functions first.", code: "deploy", timedOut: false };
      }
      if (lower.includes("api_key_invalid") || lower.includes("api key not valid") || lower.includes("invalid_argument")) {
        return { data: null, error: "The configured Gemini AI key is invalid or expired. Please update GEMINI_API_KEY in .env with a valid Google AI Studio key.", code: "config", timedOut: false };
      }
      if (lower.includes("temporary issue") || lower.includes("hit a temporary")) {
        return { data: null, error: "AI service is not responding. Make sure edge functions are deployed and AI keys are configured.", code: "config", timedOut: false };
      }
      if (lower.includes("status 401") || lower.includes("unauthorized")) {
        return { data: null, error: "Session expired. Please sign in again.", code: "session", timedOut: false };
      }
      if (lower.includes("status 503") || lower.includes("status 500") || lower.includes("no ai provider") || lower.includes("not configured")) {
        return { data: null, error: rawMsg !== (error as { message?: string }).message ? rawMsg : "AI provider key is not configured or invalid. Please check GEMINI_API_KEY in .env or Supabase secrets.", code: code || "config", timedOut: false };
      }

      return { data: null, error: rawMsg, code, timedOut: false };
    }
    return { data, error: null, code: null, timedOut: false };
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    return {
      data: null,
      error: isTimeout
        ? "The request took too long. Please check your connection and try again."
        : err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      code: isTimeout ? "timeout" : "api",
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
 *
 * Attaches the current session's bearer token so functions deployed with
 * `verify_jwt = true` (the secure default) are called as the authenticated
 * user instead of anonymously. Without it those functions reject valid
 * requests, and privileged ones would fail open if misconfigured.
 */
export async function postEdgeJson<T = Record<string, unknown>>(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
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
