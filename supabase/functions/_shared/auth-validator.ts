import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    return { authenticated: true, userId: data.user.id };
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
