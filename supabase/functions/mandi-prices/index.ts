import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { mandiPricesRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'GET, POST, OPTIONS');
}

const RATE_LIMIT_CONFIG = { maxRequests: 30, windowMs: 60 * 1000 };

// Official AGMARKNET daily mandi price resources on data.gov.in.
const RESOURCE_IDS = [
  "9ef84268-d588-465a-a308-a864a43d0070",
  "35985678-0d79-46b4-9ed6-6f13308a1d24",
];

const PAGE_LIMIT = 250;
const MAX_PAGES = 400;
const MAX_UNSCOPED_RECORDS = 10000;
const FETCH_TIMEOUT_MS = 20000;

interface AgmarknetRecord {
  commodity?: string;
  variety?: string;
  market?: string;
  state?: string;
  district?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
  [key: string]: unknown;
}

function lookupKey(r: {
  state?: string; district?: string; market?: string; commodity?: string;
  variety?: string; arrival_date?: string;
}): string {
  return [r.state, r.district, r.market, r.commodity, r.variety, r.arrival_date]
    .map((v) => String(v ?? "").trim().toLowerCase())
    .join("||");
}

function toNum(v: string | number | undefined): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function fetchResourcePages(
  resourceId: string,
  apiKey: string,
  params: { state?: string; district?: string; commodity?: string; market?: string },
): Promise<{ records: AgmarknetRecord[]; total: number; error?: string }> {
  const records: AgmarknetRecord[] = [];
  let offset = 0;
  let total = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    let url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=${PAGE_LIMIT}&offset=${offset}`;
    if (params.state) url += `&filters[state]=${encodeURIComponent(params.state)}`;
    if (params.district) url += `&filters[district]=${encodeURIComponent(params.district)}`;
    if (params.commodity) url += `&filters[commodity]=${encodeURIComponent(params.commodity)}`;
    if (params.market) url += `&filters[market]=${encodeURIComponent(params.market)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "AgriConnect-Mandi/1.0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      // data.gov.in can be slow on cold pages; give it one more chance.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        response = await fetch(url, {
          headers: { "Accept": "application/json", "User-Agent": "AgriConnect-Mandi/1.0" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch (err2) {
        return { records, total, error: `Fetch failed on page ${page + 1}: ${err2 instanceof Error ? err2.message : String(err2)}` };
      }
    }

    if (!response.ok) {
      if (records.length > 0) return { records, total };
      return { records, total, error: `data.gov.in HTTP ${response.status} on page ${page + 1}` };
    }

    let data: { records?: AgmarknetRecord[]; total?: number };
    try {
      data = await response.json();
    } catch {
      return { records, total, error: "Invalid JSON from data.gov.in" };
    }

    const pageRecords = Array.isArray(data.records) ? data.records : [];
    total = Number(data.total) || 0;
    records.push(...pageRecords);

    if (pageRecords.length < PAGE_LIMIT) break;
    if (total > 0 && offset + pageRecords.length >= total) break;
    offset += PAGE_LIMIT;
  }

  return { records, total };
}

function mapRecord(record: AgmarknetRecord) {
  const commodity = (record.commodity || "").trim();
  const market = (record.market || "").trim();
  const state = (record.state || "").trim();
  const district = (record.district || "").trim();
  const variety = (record.variety || "").trim();
  const arrivalDate = (record.arrival_date || "").trim();

  const modalPrice = toNum(record.modal_price);
  const minPrice = toNum(record.min_price);
  const maxPrice = toNum(record.max_price);

  if (!commodity || modalPrice <= 0) return null;

  return {
    id: lookupKey({ state, district, market, commodity, variety, arrival_date: arrivalDate }),
    crop: commodity,
    commodity,
    variety: variety || undefined,
    market: market || district || "Mandi",
    state,
    district,
    price: Math.round(modalPrice),
    modalPrice: Math.round(modalPrice),
    minPrice: Math.round(minPrice),
    maxPrice: Math.round(maxPrice),
    arrivalDate: arrivalDate || null,
    unit: "Quintal",
  };
}

async function persist(rows: Record<string, unknown>[], log: Record<string, unknown>): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return;

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const insertable = rows.map((r) => ({
    lookup_key: r.id as string,
    state: r.state as string,
    district: (r.district as string) || null,
    market: r.market as string,
    commodity: r.crop as string,
    variety: (r.variety as string) || null,
    arrival_date: (r.arrivalDate as string) || null,
    min_price: (r.minPrice as number) || null,
    max_price: (r.maxPrice as number) || null,
    modal_price: r.modalPrice as number,
  }));

  const startTime = Date.now();
  let status = "success";
  let recordsUpserted = 0;
  let errorMessage: string | null = null;

  try {
    if (insertable.length > 0) {
      const { data, error } = await admin
        .from("mandi_price_records")
        .upsert(insertable, { onConflict: "lookup_key", ignoreDuplicates: false });
      if (error) throw error;
      recordsUpserted = Array.isArray(data) ? data.length : insertable.length;
    }
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  try {
    await admin.from("mandi_sync_log").insert({
      status,
      resource_id: log.resource_id ?? null,
      records_fetched: log.records_fetched ?? 0,
      records_upserted: recordsUpserted,
      error_message: errorMessage,
      started_at: new Date(log.started_at as string).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    });
  } catch {
    // best effort only
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  const rateLimitResult = await checkRateLimit(clientIP, 'mandi-prices', RATE_LIMIT_CONFIG);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...headers,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const parseResult = await parseAndValidate(req, mandiPricesRequestSchema, headers);
  if (!parseResult.success) {
    return parseResult.response;
  }

  const { state, district, commodity, searchQuery, market } = parseResult.data;
  const search = (searchQuery || "").trim().toLowerCase();
  const startedAt = new Date();

  try {
    const apiKey = Deno.env.get('GOVT_DATA_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Mandi service is not configured. Please try again later.",
          prices: [],
        }),
        { status: 503, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const seen = new Map<string, ReturnType<typeof mapRecord>>();
    let totalAvailable = 0;
    let truncated = false;
    const resourceErrors: Record<string, string> = {};
    // Scope-free queries (whole of India) are capped so a single request stays
    // fast; state/district/commodity/market scoped queries paginate fully.
    const scoped = Boolean(state || district || commodity || market);
    const hardCap = scoped ? Number.MAX_SAFE_INTEGER : MAX_UNSCOPED_RECORDS;

    for (const resourceId of RESOURCE_IDS) {
      const { records, total, error } = await fetchResourcePages(resourceId, apiKey, {
        state: state || undefined,
        district: district || undefined,
        commodity: commodity || undefined,
        market: market || undefined,
      });
      if (error) resourceErrors[resourceId.slice(0, 8)] = error;

      for (const record of records) {
        if (seen.size >= hardCap) { truncated = true; break; }
        const mapped = mapRecord(record);
        if (!mapped) continue;
        const existing = seen.get(mapped.id);
        if (!existing || (existing.price ?? 0) < (mapped.price ?? 0)) {
          seen.set(mapped.id, mapped);
        }
      }
      if (truncated) break;
      if (total > totalAvailable) totalAvailable = total;
    }

    if (seen.size === 0) {
      return new Response(
        JSON.stringify({
          error: "Mandi prices are temporarily unavailable. Please try again shortly.",
          prices: [],
          resourceErrors,
        }),
        {
          status: 503,
          headers: {
            ...headers,
            ...getRateLimitHeaders(rateLimitResult),
            "Content-Type": "application/json",
          },
        }
      );
    }

    let prices = Array.from(seen.values()).filter((p): p is NonNullable<typeof p> => p !== null);

    if (state && state.trim()) {
      prices = prices.filter((p) => p.state.toLowerCase() === state.trim().toLowerCase());
    }
    if (district && district.trim()) {
      prices = prices.filter((p) => (p.district || "").toLowerCase() === district.trim().toLowerCase());
    }

    if (search) {
      prices = prices.filter((p) =>
        (p.crop || "").toLowerCase().includes(search) ||
        (p.market || "").toLowerCase().includes(search) ||
        (p.state || "").toLowerCase().includes(search) ||
        (p.district || "").toLowerCase().includes(search) ||
        (p.variety || "").toLowerCase().includes(search)
      );
    }

    const latestDate = prices.reduce((acc, p) => {
      if (p.arrivalDate && (!acc || p.arrivalDate > acc)) return p.arrivalDate;
      return acc;
    }, "" as string);

    // Best-effort persistence to the records/sync tables. Never blocks serving.
    const rows = prices.map((p) => ({ ...p }));
    const persistPromise = persist(rows, {
      resource_id: "9ef84268-d588-465a-a308-a864a43d0070",
      records_fetched: seen.size,
      started_at: startedAt.toISOString(),
    });

    const responseBody = JSON.stringify({
      prices: rows,
      source: "data.gov.in",
      lastUpdated: latestDate || startedAt.toISOString().split("T")[0],
      total: seen.size,
      truncated,
      resourceErrors: Object.keys(resourceErrors).length > 0 ? resourceErrors : undefined,
    });
    await Promise.race([persistPromise, new Promise((r) => setTimeout(r, 5000))]);

    return new Response(responseBody, {
      headers: {
        ...headers,
        ...getRateLimitHeaders(rateLimitResult),
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error("Mandi prices function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch prices";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});