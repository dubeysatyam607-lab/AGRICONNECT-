import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

// Short-lived in-memory cache for validated auth tokens.
// Reduces Supabase getUser() calls from every request to once per 30 seconds
// per unique token, while maintaining security (tokens are revalidated quickly).
const AUTH_CACHE = new Map<string, { userId: string; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds
const CACHE_MAX_SIZE = 1000; // Prevent unbounded memory growth in serverless

// Periodic cleanup of expired cache entries (every 60 seconds)
let lastCleanup = Date.now();
function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of AUTH_CACHE.entries()) {
    if (entry.expiresAt < now) AUTH_CACHE.delete(key);
  }
  // If still over max size after cleanup, evict oldest entries
  if (AUTH_CACHE.size > CACHE_MAX_SIZE) {
    const entries = Array.from(AUTH_CACHE.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    for (const [key] of toRemove) AUTH_CACHE.delete(key);
  }
}

export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Check cache first (avoids redundant Supabase API calls)
  cleanupCache();
  const cached = AUTH_CACHE.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { authenticated: true, userId: cached.userId };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      // Don't cache failed validations
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    const userId = data.user.id;

    // Cache successful validation
    AUTH_CACHE.set(token, {
      userId,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return { authenticated: true, userId };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

export function authErrorResponse(error: string, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error }),
    { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
