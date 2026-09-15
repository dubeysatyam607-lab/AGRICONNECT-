/**
 * agri-data — public read API + admin management for the Live Agriculture
 * Information System.
 *
 * Public actions (verify_jwt=true but readable by anon JWT or authenticated):
 *   content   — typed listing with optional filters + fuzzy query
 *   search    — cross-type keyword search (EN / HI / Hinglish tolerant)
 *   freshness — has-data / last-fetched summary per content type
 *
 * Admin-only actions (app_metadata.role === 'admin'):
 *   report    — source health + sync log report for the Admin Data Center
 *   sync      — trigger the sync engine now (agri-sync-worker)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { agriDataRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, "POST, OPTIONS");
}

const READ_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };
const ADMIN_RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 1000 };

type ContentType = "schemes" | "news" | "msp" | "insurance" | "loans";
const TYPE_TABLE: Record<ContentType, string> = {
  schemes: "schemes",
  news: "agri_news",
  msp: "msp_prices",
  insurance: "insurance_products",
  loans: "loan_products",
};

function like(value: string | undefined): string {
  const v = (value || "").trim().replace(/[%_]/g, " ");
  return `%${v}%`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = getCORSHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const parseResult = await parseAndValidate(req, agriDataRequestSchema, headers);
  if (!parseResult.success) return parseResult.response;
  const { action, type, q, filters, limit = 25, offset = 0, jobs } = parseResult.data;

  const adminActions = action === "report" || action === "sync";
  if (adminActions) {
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) return authErrorResponse("Authentication required", headers); 
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("authorization") || "" } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || (user.app_metadata as { role?: string })?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
  }

  const authResult = await validateAuth(req);
  const isAuthed = authResult.authenticated;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateId = isAuthed && authResult.userId ? authResult.userId : `guest:${ip}`;
  const rateConfig = adminActions ? ADMIN_RATE_LIMIT : READ_RATE_LIMIT;
  const rate = await checkRateLimit(rateId, "agri-data", rateConfig);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
      status: 429,
      headers: { ...headers, ...getRateLimitHeaders(rate), "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const client = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const send = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...headers, ...getRateLimitHeaders(rate), "Content-Type": "application/json" } });
  const sendErr = (message: string, status = 400) => send({ error: message }, status);

  try {
    if (action === "content") {
      if (!type) return sendErr("'type' is required for action 'content'");
      const table = TYPE_TABLE[type as ContentType];
      const f = filters || {};
      let query: ReturnType<typeof client.from> = client.from(table).select("*", { count: "exact" });

      if (q && q.trim().length >= 2) {
        if (type === "schemes") {
          query = query.or(`name.ilike.${like(q)},description.ilike.${like(q)},benefits.ilike.${like(q)},ministry.ilike.${like(q)}`);
        } else if (type === "news") {
          query = query.or(`title.ilike.${like(q)},summary.ilike.${like(q)}`);
        } else if (type === "msp") {
          query = query.or(`crop.ilike.${like(q)}`);
        } else {
          query = query.or(`scheme_name.ilike.${like(q)},crop.ilike.${like(q)}`);
        }
      }
      if (f.category) query = query.eq("category", f.category);
      if (f.level) query = query.eq("level", f.level);
      if (f.state) query = query.eq("state", f.state);
      if (f.season) query = query.eq("season", f.season);
      if (f.year) query = query.eq("marketing_year", f.year);
      if (f.crop) query = query.eq("crop", f.crop);
      if (f.loanType) query = query.eq("loan_type", f.loanType);
      if (f.status) query = query.eq("status", f.status);

      const orderCol =
        type === "news" ? "published_at" :
        type === "msp" ? "marketing_year" :
        type === "schemes" ? "last_verified_at" :
        "updated_at";
      query = query.order(orderCol, { ascending: type === "msp", nullsFirst: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return send({ type, rows: data, count: count ?? data?.length ?? 0, limit, offset });
    }

    if (action === "search") {
      const term = (q || "").trim();
      if (term.length < 2) return send({ term, total: 0, schemes: [], news: [], msp: [], insurance: [], loans: [] });

      const [schemes, news, msp, insurance, loans] = await Promise.all([
        client.from("schemes").select("*").or(`name.ilike.${like(term)},description.ilike.${like(term)},benefits.ilike.${like(term)},ministry.ilike.${like(term)}`).limit(10),
        client.from("agri_news").select("*").or(`title.ilike.${like(term)},summary.ilike.${like(term)}`).order("published_at", { ascending: false, nullsFirst: false }).limit(10),
        client.from("msp_prices").select("*").or(`crop.ilike.${like(term)}`).limit(10),
        client.from("insurance_products").select("*").or(`scheme_name.ilike.${like(term)},crop.ilike.${like(term)}`).limit(10),
        client.from("loan_products").select("*").or(`scheme_name.ilike.${like(term)},product_name.ilike.${like(term)}`).limit(10),
      ]);
      if (schemes.error) throw schemes.error;
      if (news.error) throw news.error;
      if (msp.error) throw msp.error;
      if (insurance.error) throw insurance.error;
      if (loans.error) throw loans.error;
      const total = (schemes.data?.length ?? 0) + (news.data?.length ?? 0) + (msp.data?.length ?? 0) + (insurance.data?.length ?? 0) + (loans.data?.length ?? 0);
      return send({ term, total, schemes: schemes.data, news: news.data, msp: msp.data, insurance: insurance.data, loans: loans.data });
    }

    if (action === "freshness") {
      const results: Record<string, unknown> = {};
      for (const t of (Object.keys(TYPE_TABLE) as ContentType[])) {
        const { count, error } = await client.from(TYPE_TABLE[t]).select("id", { count: "exact", head: true });
        if (error) throw error;
        const last = await client.from(TYPE_TABLE[t]).select("last_verified_at, fetched_at, last_verified_at").order("fetched_at", { ascending: false }).limit(1);
        results[t] = {
          hasData: (count ?? 0) > 0,
          count: count ?? 0,
          lastFetchedAt: last.data?.[0]?.fetched_at ?? null,
          lastVerifiedAt: last.data?.[0]?.last_verified_at ?? null,
        };
      }
      const log = await client.from("data_sync_logs").select("*").order("started_at", { ascending: false }).limit(1);
      return send({ tables: results, latestSync: log.data?.[0] ?? null, now: new Date().toISOString() });
    }

    if (action === "report") {
      const [sources, logs] = await Promise.all([
        client.from("data_sources").select("*").order("category", { ascending: true }),
        client.from("data_sync_logs").select("*").order("started_at", { ascending: false }).limit(50),
      ]);
      if (sources.error) throw sources.error;
      if (logs.error) throw logs.error;
      return send({ sources: sources.data, syncLogs: logs.data, generatedAt: new Date().toISOString() });
    }

    // action === "sync" — trigger the worker with the service role.
    const workerUrl = `${supabaseUrl}/functions/v1/agri-sync-worker`;
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRole}` },
      body: JSON.stringify({ jobs: jobs ?? ["scheme", "news", "msp"] }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sync engine failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    return send({ ok: true, ...data });
  } catch (error) {
    console.error("agri-data error:", error);
    return sendErr(error instanceof Error ? error.message : "Internal error", 500);
  }
});