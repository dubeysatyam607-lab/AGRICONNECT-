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

// Official AGMARKNET CURRENT daily mandi price resource on data.gov.in.
// NOTE: the second resource previously configured here ("Variety-wise Daily
// Market Prices Data of Commodity", 35985678-0d79-46b4-9ed6-6f13308a1d24) was
// removed: it is an ~81.7M-record historical feed whose fields are capitalised
// (Commodity/Modal_Price/...) so every record mapped to null while still being
// paginated up to 400 pages per request — the root cause of slow responses,
// exhausted data.gov.in rate limits, and "Uttar Pradesh / other states missing".
const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const PAGE_LIMIT = 250;
const FETCH_TIMEOUT_MS = 12000;
const STALE_AFTER_DAYS = 10; // serve from DB when the newest arrival_date is older than this
const SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000; // don't hammer data.gov.in more than once per 30min

interface AgmarknetRecord {
  [key: string]: unknown;
}

/** Reads a field tolerating both lowercase and capitalized AGMARKNET keys. */
function getField(r: AgmarknetRecord, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null) return String(v).trim();
  }
  return "";
}

function toNum(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalizes an AGMARKNET commodity string into a clean base name.
 *  - "Black Gram(Urd Beans)(Whole)"      -> "Black Gram"
 *  - "Black Gram(Urd Beans)(Whole)Black Gram" -> "Black Gram"  (trailing dup)
 *  - "Cumin Seed(Jeera)Seed"             -> "Cumin Seed"
 *  - "Rice(IR-64)"                       -> "Rice"
 * Removes parenthetical qualifiers and any repeated trailing base tokens.
 */
export function normalizeCommodity(raw: string): string {
  let s = (raw || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const parts = s.split(" ");
  // Largest cut first: an exact repeated base ("Black Gram Black Gram")
  // outranks a single trailing repeated word ("Cumin Seed Seed").
  for (let cut = parts.length - 1; cut >= 1; cut--) {
    const head = parts.slice(0, parts.length - cut).join(" ").toLowerCase();
    const tail = parts.slice(parts.length - cut).join(" ").toLowerCase();
    if (tail === head || head.endsWith(" " + tail) || (tail.length > 2 && head.includes(tail))) {
      s = parts.slice(0, parts.length - cut).join(" ");
      break;
    }
  }
  return s;
}

function lookupKey(r: {
  state?: string; district?: string; market?: string; commodity?: string;
  variety?: string; arrivalDate?: string;
}): string {
  return [r.state, r.district, r.market, r.commodity, r.variety, r.arrivalDate]
    .map((v) => String(v ?? "").trim().toLowerCase())
    .join("||");
}

interface MappedRecord {
  id: string;
  originalCommodity: string;
  commodity: string;
  displayCommodity: string;
  imageSearchCommodity: string;
  variety?: string;
  market: string;
  district: string;
  state: string;
  price: number;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  arrivalDate: string;
  unit: string;
}

function mapRecord(record: AgmarknetRecord): MappedRecord | null {
  const originalCommodity = getField(record, ["commodity", "Commodity"]);
  const commodity = normalizeCommodity(originalCommodity);
  const market = getField(record, ["market", "Market"]);
  const state = getField(record, ["state", "State"]);
  const district = getField(record, ["district", "District"]);
  const variety = getField(record, ["variety", "Variety"]);
  const arrivalDate = getField(record, ["arrival_date", "Arrival_Date", "Arrival Date"]);

  const modalPrice = toNum(record.modal_price ?? record.Modal_Price ?? record["modalPrice"]);
  const minPrice = toNum(record.min_price ?? record.Min_Price ?? record["minPrice"]);
  const maxPrice = toNum(record.max_price ?? record.Max_Price ?? record["maxPrice"]);

  if (!commodity || modalPrice <= 0) return null;

  return {
    id: lookupKey({ state, district, market, commodity, variety, arrivalDate }),
    originalCommodity,
    commodity,
    displayCommodity: commodity,
    imageSearchCommodity: commodity,
    variety: variety || undefined,
    market: market || district || "Mandi",
    state,
    district,
    price: Math.round(modalPrice),
    modalPrice: Math.round(modalPrice),
    minPrice: Math.round(minPrice),
    maxPrice: Math.round(maxPrice),
    arrivalDate: arrivalDate || "",
    unit: "Quintal",
  };
}

async function fetchLiveSnapshot(
  apiKey: string,
  opts: { state?: string; maxPages: number },
): Promise<{ records: MappedRecord[]; total: number; error?: string; rateLimited: boolean }> {
  const records: MappedRecord[] = [];
  const seen = new Map<string, MappedRecord>();
  let offset = 0;
  let total = 0;
  let rateLimited = false;
  const stateFilter = opts.state ? `&filters[state]=${encodeURIComponent(opts.state)}` : "";

  for (let page = 0; page < opts.maxPages; page++) {
    const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=${PAGE_LIMIT}&offset=${offset}${stateFilter}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "AgriConnect-Mandi/1.0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      // data.gov.in can be slow on cold pages; give it one more chance.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      try {
        response = await fetch(url, {
          headers: { "Accept": "application/json", "User-Agent": "AgriConnect-Mandi/1.0" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch (err2) {
        const msg = err2 instanceof Error ? err2.message : String(err2);
        return { records: Array.from(seen.values()), total, rateLimited, error: `Fetch failed on page ${page + 1}: ${msg}` };
      }
    }

    if (response.status === 429 || response.status === 401) {
      // Never fabricate data. If we already collected records, stop cleanly and
      // let the caller persist what we have; otherwise report the limit clearly.
      rateLimited = true;
      return { records: Array.from(seen.values()), total, rateLimited, error: `data.gov.in HTTP ${response.status} on page ${page + 1}` };
    }
    if (!response.ok) {
      if (seen.size > 0) break;
      return { records: Array.from(seen.values()), total, rateLimited, error: `data.gov.in HTTP ${response.status} on page ${page + 1}` };
    }

    let data: { records?: AgmarknetRecord[]; total?: number };
    try {
      data = await response.json();
    } catch {
      return { records: Array.from(seen.values()), total, rateLimited, error: "Invalid JSON from data.gov.in" };
    }

    const pageRecords = Array.isArray(data.records) ? data.records : [];
    total = Number(data.total) || 0;
    for (const record of pageRecords) {
      const mapped = mapRecord(record);
      if (!mapped) continue;
      const existing = seen.get(mapped.id);
      if (!existing || existing.price < mapped.price) seen.set(mapped.id, mapped);
    }

    if (pageRecords.length < PAGE_LIMIT) break;
    if (total > 0 && offset + pageRecords.length >= total) break;
    offset += PAGE_LIMIT;
  }

  return { records: Array.from(seen.values()), total, rateLimited };
}

async function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return null;
  return createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
}

async function persist(rows: MappedRecord[], log: Record<string, unknown>): Promise<void> {
  const admin = await getAdminClient();
  if (!admin) return;

  const insertable = rows.map((r) => ({
    lookup_key: r.id,
    resource_id: RESOURCE_ID,
    state: r.state,
    district: r.district || null,
    market: r.market,
    commodity: r.displayCommodity,
    variety: r.variety || null,
    arrival_date: r.arrivalDate || null,
    min_price: r.minPrice || null,
    max_price: r.maxPrice || null,
    modal_price: r.modalPrice,
    unit: "Quintal",
    updated_at: new Date().toISOString(),
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
      resource_id: (log.resource_id as string) ?? RESOURCE_ID,
      records_fetched: (log.records_fetched as number) ?? 0,
      records_upserted: recordsUpserted,
      error_message: log.error_message ? String(log.error_message) : errorMessage,
      started_at: new Date(log.started_at as string).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    });
  } catch {
    // best effort only
  }
}

interface DbRow {
  lookup_key?: string;
  state?: string | null;
  district?: string | null;
  market?: string | null;
  commodity?: string | null;
  variety?: string | null;
  arrival_date?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  modal_price?: number | null;
}

function rowToPrice(r: DbRow): MappedRecord | null {
  const originalCommodity = String(r.commodity ?? "").trim();
  const commodity = normalizeCommodity(originalCommodity);
  const state = String(r.state ?? "").trim();
  const district = String(r.district ?? "").trim();
  const market = String(r.market ?? "").trim();
  const variety = String(r.variety ?? "").trim();
  const arrivalDate = String(r.arrival_date ?? "").trim();
  const modalPrice = Number(r.modal_price ?? 0);
  if (!commodity || modalPrice <= 0) return null;

  return {
    id: lookupKey({ state, district, market, commodity, variety, arrivalDate }),
    originalCommodity,
    commodity,
    displayCommodity: commodity,
    imageSearchCommodity: commodity,
    variety: variety || undefined,
    market: market || district || "Mandi",
    state,
    district,
    price: Math.round(modalPrice),
    modalPrice: Math.round(modalPrice),
    minPrice: Math.round(Number(r.min_price ?? 0)),
    maxPrice: Math.round(Number(r.max_price ?? 0)),
    arrivalDate,
    unit: "Quintal",
  };
}

function dedupe(prices: MappedRecord[]): MappedRecord[] {
  const seen = new Map<string, MappedRecord>();
  for (const p of prices) {
    const key = [p.state, p.district, p.market, p.commodity, p.variety, p.arrivalDate]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .join("||");
    const existing = seen.get(key);
    if (!existing || existing.price < p.price) seen.set(key, p);
  }
  return Array.from(seen.values());
}

async function queryDb(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  opts: { state?: string; district?: string; market?: string; commodity?: string; search?: string },
): Promise<{ rows: DbRow[]; latestDate: string; syncedAt: string | null; lastSyncError: string | null }> {
  if (!admin) return { rows: [], latestDate: "", syncedAt: null, lastSyncError: null };

  let query = admin.from("mandi_price_records").select("state,district,market,commodity,variety,arrival_date,min_price,max_price,modal_price");
  if (opts.state) query = query.eq("state", opts.state);
  if (opts.district) query = query.eq("district", opts.district);
  if (opts.market) query = query.eq("market", opts.market);
  if (opts.commodity) query = query.eq("commodity", opts.commodity);
  // Fetch the latest synced day first so a stale-but-recent snapshot is the default.
  query = query.order("arrival_date", { ascending: false });

  // This project's PostgREST caps any single query at 1000 rows, so walk the
  // snapshot in pages to assemble the full persisted dataset.
  const PAGE = 1000;
  const rows: DbRow[] = [];
  let fetchError: string | null = null;
  for (let from = 0; from < 8000; from += PAGE) {
    const { data, error } = await query.range(from, from + PAGE - 1).limit(PAGE);
    if (error) {
      fetchError = error.message;
      break;
    }
    const pageRows = (data as DbRow[]) || [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE) break;
  }
  if (fetchError) return { rows: [], latestDate: "", syncedAt: null, lastSyncError: fetchError };
  let latestDate = "";
  for (const r of rows) {
    const d = r.arrival_date ? String(r.arrival_date).slice(0, 10) : "";
    if (d && d > latestDate) latestDate = d;
  }

  let syncedAt: string | null = null;
  let lastSyncError: string | null = null;
  try {
    const { data: logData } = await admin
      .from("mandi_sync_log")
      .select("finished_at,error_message,status")
      .order("started_at", { ascending: false })
      .limit(1);
    const latest = (logData as { finished_at?: string; error_message?: string | null; status?: string }[] | null)?.[0];
    syncedAt = latest?.finished_at || null;
    const rawErr = latest?.error_message;
    lastSyncError =
      latest?.status === "error"
        ? typeof rawErr === "string" && rawErr !== "[object Object]"
          ? rawErr.slice(0, 300)
          : "last sync failed"
        : null;
  } catch {
    // best effort
  }

  return { rows, latestDate, syncedAt, lastSyncError };
}

function metaFrom(prices: MappedRecord[]): Record<string, string[]> {
  const states = new Set<string>();
  const districts = new Set<string>();
  const markets = new Set<string>();
  const commodities = new Set<string>();
  for (const p of prices) {
    if (p.state) states.add(p.state);
    if (p.district) districts.add(p.district);
    if (p.market) markets.add(p.market);
    if (p.commodity) commodities.add(p.commodity);
  }
  return {
    availableStates: Array.from(states).sort(),
    availableDistricts: Array.from(districts).sort(),
    availableMarkets: Array.from(markets).sort(),
    availableCommodities: Array.from(commodities).sort((a, b) => a.localeCompare(b)),
  };
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
  if (!parseResult.success) return parseResult.response;

  const { state, district, commodity, searchQuery, market, sync, includeMeta, limit, offset } = parseResult.data;
  const search = (searchQuery || "").trim().toLowerCase();
  const startedAt = new Date();

  try {
    const apiKey = Deno.env.get('GOVT_DATA_API_KEY');
    const admin = await getAdminClient();

    // True only when we hold a key AND have DB access (service role configured).
    const backendReady = Boolean(apiKey && admin);
    if (!backendReady) {
      return new Response(
        JSON.stringify({
          error: "Mandi service is not configured. Please try again later.",
          prices: [],
        }),
        { status: 503, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // ---- Optional live sync path (manual refresh / cold-start bootstrap) ----
    // Syncs are scoped to a requested state: that fetch is cheap (≈7 pages) and
    // stays inside the worker's compute/time budget. A bare whole-India sync is
    // intentionally not attempted from the request hot path (it exceeds the edge
    // worker budget); those callers fall through to the persisted snapshot below.
    if (sync && state) {
      const syncResult = await fetchLiveSnapshot(apiKey as string, { state, maxPages: 24 });
      const rows = dedupe(syncResult.records);
      const persistPromise = persist(rows, {
        resource_id: RESOURCE_ID,
        records_fetched: syncResult.records.length,
        started_at: startedAt.toISOString(),
        error_message: syncResult.error ?? null,
      });
      await Promise.race([persistPromise, new Promise((r) => setTimeout(r, 8000))]);

      if (syncResult.rateLimited && rows.length === 0) {
        return new Response(
          JSON.stringify({
            error: syncResult.error || "data.gov.in is rate-limited right now.",
            prices: [],
            rateLimited: true,
            syncError: syncResult.error ?? null,
            resourceErrors: syncResult.error ? { [RESOURCE_ID.slice(0, 8)]: syncResult.error } : undefined,
          }),
          {
            status: 503,
            headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" },
          }
        );
      }

      const body = {
        prices: rows.map((p) => ({ ...p })),
        source: "data.gov.in",
        servedFrom: "live",
        lastUpdated: rows.reduce((acc, p) => (p.arrivalDate && p.arrivalDate > acc ? p.arrivalDate : acc), "") || startedAt.toISOString().split("T")[0],
        total: rows.length,
        truncated: syncResult.rateLimited,
        rateLimited: syncResult.rateLimited,
        syncError: syncResult.error ?? null,
        resourceErrors: syncResult.error ? { [RESOURCE_ID.slice(0, 8)]: syncResult.error } : undefined,
      };
      return new Response(JSON.stringify(body), {
        headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" },
      });
    }

    // ---- DB-first: serve the last genuinely-synced government snapshot ----
    const { rows: dbRows, latestDate, syncedAt, lastSyncError } = await queryDb(admin, { state, district, market, commodity });

    let mapped = dbRows.map(rowToPrice).filter((p): p is MappedRecord => p !== null);

    if (search) {
      mapped = mapped.filter((p) =>
        p.commodity.toLowerCase().includes(search) ||
        p.originalCommodity.toLowerCase().includes(search) ||
        (p.market || "").toLowerCase().includes(search) ||
        (p.state || "").toLowerCase().includes(search) ||
        (p.district || "").toLowerCase().includes(search) ||
        (p.variety || "").toLowerCase().includes(search)
      );
    }

    mapped = dedupe(mapped);

    // Determine staleness purely from the arrival date, never from web clock gaps.
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const stale = latestDate ? latestDate < todayISO : true;

    if (mapped.length === 0) {
      // Nothing synced yet for this filter. Try a bounded live fetch scoped to
      // the requested state; if the API is rate-limited, surface the honest
      // empty error instead of inventing data.
      const live = await fetchLiveSnapshot(apiKey as string, { state, maxPages: state ? 12 : 30 });
      if (live.records.length > 0) {
        const rows = dedupe(live.records);
        const persistPromise = persist(rows, {
          resource_id: RESOURCE_ID,
          records_fetched: live.records.length,
          started_at: startedAt.toISOString(),
          error_message: live.error ?? null,
        });
        await Promise.race([persistPromise, new Promise((r) => setTimeout(r, 5000))]);
        return new Response(
          JSON.stringify({
            prices: rows.map((p) => ({ ...p })),
            servedFrom: "live",
            lastUpdated: rows.reduce((acc, p) => (p.arrivalDate && p.arrivalDate > acc ? p.arrivalDate : acc), "") || startedAt.toISOString().split("T")[0],
            total: rows.length,
            truncated: live.rateLimited,
            rateLimited: live.rateLimited,
          }),
          { headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          error: "No Government mandi records found for this selection.",
          prices: [],
          resourceErrors: live.error ? { [RESOURCE_ID.slice(0, 8)]: live.error } : undefined,
          rateLimited: live.rateLimited,
        }),
        {
          status: live.rateLimited ? 503 : 404,
          headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" },
        }
      );
    }

    // Server-side pagination over the (already filtered) snapshot.
    const start = offset ?? 0;
    const pageSize = limit ?? 5000;
    const page = mapped.slice(start, start + pageSize);
    const meta = includeMeta ? metaFrom(mapped) : {};

    const responseBody = {
      prices: page.map((p) => ({ ...p })),
      source: "data.gov.in",
      servedFrom: "database",
      lastUpdated: latestDate || startedAt.toISOString().split("T")[0],
      syncedAt,
      stale: stale && !lastSyncError,
      lastSyncError: lastSyncError || undefined,
      total: mapped.length,
      truncated: start + page.length < mapped.length,
      ...meta,
    };

    return new Response(JSON.stringify(responseBody), {
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