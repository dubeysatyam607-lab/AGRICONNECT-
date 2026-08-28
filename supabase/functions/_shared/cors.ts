// Shared CORS configuration for all AgriConnect edge functions.
//
// Production domains are ALWAYS allowed regardless of the ALLOWED_ORIGINS
// secret so that a stale/misconfigured secret can never silently break a live
// feature (see the weather outage where the secret excluded the production
// origin and every browser request was CORS-blocked). The env secret, when
// present, merely ADDS extra origins (dev tools / preview environments).

const SAFE_DEFAULT_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8000",
  "https://agriconnect-navy-six.vercel.app",
  "https://agriconnect-navy-six-*.vercel.app",
];

/** Resolve the effective allowlist: safe defaults unioned with the optional secret. */
export function resolveAllowedOrigins(): string[] {
  const fromEnv = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...SAFE_DEFAULT_ORIGINS, ...fromEnv]));
}

/** True when the request origin is in the (possibly wildcard) allowlist. */
export function isOriginAllowed(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.some((o) => {
    if (o.includes("*")) {
      return origin.startsWith(o.replace(/\*/g, ""));
    }
    return o === origin;
  });
}

/** CORS headers for a request. Reflects the origin when allowed; never emits it otherwise. */
export function getCorsHeaders(origin: string | null, methods = "GET, POST, OPTIONS"): Record<string, string> {
  const allowed = isOriginAllowed(origin, resolveAllowedOrigins());
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, x-razorpay-signature, content-type",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Max-Age": "86400",
  };
  if (allowed && origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}