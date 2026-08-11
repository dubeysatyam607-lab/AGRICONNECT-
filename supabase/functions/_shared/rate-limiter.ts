import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Atomic, fail-closed rate limiter.
 *
 * Delegates the read+increment to the `rate_limit_check` RPC which does a
 * single `INSERT ... ON CONFLICT DO UPDATE`, so concurrent requests can never
 * both see an empty table and slip through. Any unexpected error returns
 * `allowed: false` — a broken limiter must not silently disable rate limiting.
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return { allowed: false, remaining: 0, resetAt: new Date(Date.now() + config.windowMs) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.rpc('rate_limit_check', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_ms: config.windowMs,
    });

    if (error) throw error;
    if (!data) throw new Error('Empty rate limit response');

    return {
      allowed: data.allowed === true,
      remaining: Number(data.remaining) || 0,
      resetAt: new Date(data.reset_at),
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail closed so an outage cannot enable abuse.
    return { allowed: false, remaining: 0, resetAt: new Date(Date.now() + config.windowMs) };
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}
