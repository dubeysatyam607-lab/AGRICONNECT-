import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";

const ALLOWED_ORIGINS = resolveAllowedOrigins();
;

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'GET, POST, OPTIONS');
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
    const photos = (data.photos || []).map((p: { id?: number; src?: Record<string, string>; alt?: string | null; photographer?: string | null }) => ({
      id: p?.id ?? 0,
      alt: p?.alt ?? "",
      photographer: p?.photographer ?? "",
      src: {
        original: p?.src?.original ?? "",
        large2x: p?.src?.large2x ?? "",
        large: p?.src?.large ?? "",
        medium: p?.src?.medium ?? "",
        small: p?.src?.small ?? "",
        portrait: p?.src?.portrait ?? "",
        landscape: p?.src?.landscape ?? "",
        tiny: p?.src?.tiny ?? "",
      },
    }));

    const validPhotos: typeof photos = [];
    for (const photo of photos) {
      const probeUrl = photo.src.medium || photo.src.large || photo.src.original;
      if (!probeUrl) continue;
      try {
        const probe = await fetch(probeUrl, { method: "HEAD" });
        if (!probe.ok) continue;
        const contentType = probe.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) continue;
        validPhotos.push(photo);
      } catch {
        // skip unverifiable
      }
    }

    return new Response(JSON.stringify({ photos: validPhotos }), {
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
