import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { contactRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app'
).split(',').map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : undefined;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// Rate limit config: 10 contact requests per hour per user
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // Validate authentication
  const authResult = await validateAuth(req);
  if (!authResult.authenticated) {
    return authErrorResponse(authResult.error || "Unauthorized", headers);
  }

  // Rate limit by user ID
  const rateLimitResult = await checkRateLimit(authResult.userId!, 'contact-seller', RATE_LIMIT_CONFIG);
  
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ 
        error: "Too many contact requests. Please try again later.",
        resetAt: rateLimitResult.resetAt.toISOString()
      }),
      { 
        status: 429, 
        headers: { 
          ...headers, 
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString()
        } 
      }
    );
  }

  // Validate request body
  const parseResult = await parseAndValidate(req, contactRequestSchema, headers);
  if (!parseResult.success) {
    return parseResult.response;
  }

  const { listingId, message, reveal } = parseResult.data;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the listing and seller info (using service role to access phone)
    const { data: listing, error: listingError } = await supabase
      .from('cattle_listings')
      .select(`
        id,
        type,
        breed,
        price,
        seller_id,
        profiles:seller_id (
          full_name,
          phone
        )
      `)
      .eq('id', listingId)
      .eq('is_active', true)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: "Listing not found or inactive" }),
        { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Prevent contacting own listing
    if (listing.seller_id === authResult.userId) {
      return new Response(
        JSON.stringify({ error: "Cannot contact yourself" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const profile = listing.profiles as any;
    const sellerPhone = profile?.phone;
    const sellerName = profile?.full_name || "Seller";

    if (!sellerPhone) {
      return new Response(
        JSON.stringify({ 
          error: "Seller contact not available",
          sellerName
        }),
        { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Log the contact request (for audit purposes)
    console.log(`Contact request: User ${authResult.userId} requesting contact for listing ${listingId}`);

    // Return masked phone by default. The full number is only released on an
    // explicit user confirmation (`reveal: true`) — raising the cost of
    // automated bulk-harvesting while keeping the one-tap contact feature.
    const maskedPhone = sellerPhone.slice(-4).padStart(sellerPhone.length, '*');

    // Always return masked phone — full number reveal is disabled to prevent
    // automated bulk-harvesting of seller contact information.
    return new Response(
      JSON.stringify({
        success: true,
        sellerName,
        phone: maskedPhone,
        maskedPhone,
        listing: {
          id: listing.id,
          type: listing.type,
          breed: listing.breed,
          price: listing.price
        },
        message: `Call ${sellerName} about ${listing.breed} ${listing.type}`
      }),
      { 
        headers: { 
          ...headers, 
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error: unknown) {
    console.error("Contact seller error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get contact info. Please try again." }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
