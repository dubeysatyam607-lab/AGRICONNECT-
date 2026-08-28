import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app"
)
  .split(",")
  .map((o) => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let query = url.searchParams.get("query") || "agriculture farming";
    let perPage = parseInt(url.searchParams.get("per_page") || url.searchParams.get("perPage") || "5", 10);

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.query) query = body.query;
        if (body.per_page) perPage = body.per_page;
      } catch {
        // use query params
      }
    }

    const apiKey = Deno.env.get("PEXELS_API_KEY") || Deno.env.get("VITE_PEXELS_API_KEY");

    if (!apiKey) {
      // Return empty photos array gracefully so client falls back to curated verified photos
      return new Response(JSON.stringify({ photos: [], source: "fallback_no_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const pexelsRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(perPage, 15)}&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!pexelsRes.ok) {
      return new Response(JSON.stringify({ photos: [], error: "Pexels upstream error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const data = await pexelsRes.json();
    return new Response(JSON.stringify({ photos: data.photos || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ photos: [], error: err?.message || "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
