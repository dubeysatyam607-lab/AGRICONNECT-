/**
 * agri-sync-worker — scheduled sync engine for the Live Agriculture Information
 * System. Invoked by Vercel cron (via /api/cron/agri-sync), by the admin "Run
 * now" action (via agri-data), or by a pg_cron job. Auth = Service-Role bearer
 * OR an `x-cron-secret` matching CRON_SECRET. verify_jwt=false in config.toml.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { bootstrapSchemes, syncNews, syncMsp } from "./jobs.ts";
import type { SourceHealth, SyncJobResult } from "./types.ts";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, "POST, OPTIONS");
}

const JOB_NAMES = ["scheme", "news", "msp"] as const;
type JobName = (typeof JOB_NAMES)[number];

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

  // Internal-only trigger auth.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("authorization");
  const xCron = req.headers.get("x-cron-secret");
  const authorized =
    (serviceRoleKey && auth === `Bearer ${serviceRoleKey}`) ||
    (cronSecret && xCron === cronSecret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Service role key not configured" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let body: { jobs?: string[] } = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = {};
  }
  const requested = (body.jobs && body.jobs.length ? body.jobs : [...JOB_NAMES]) as JobName[];

  const results: SyncJobResult[] = [];
  const healthUpdates: SourceHealth[] = [];

  for (const job of requested) {
    if (!JOB_NAMES.includes(job)) {
      results.push({ job, found: 0, added: 0, updated: 0, skipped: 0, removed: 0, status: "skipped", error: `Unknown job "${job}"` });
      continue;
    }
    const started = new Date();
    const t0 = Date.now();
    try {
      if (job === "scheme") {
        const { result, health } = await bootstrapSchemes(client);
        results.push(result);
        healthUpdates.push(...health);
      } else if (job === "news") {
        const { result, health } = await syncNews(client);
        results.push(result);
        healthUpdates.push(...health);
      } else {
        const { result, health } = await syncMsp(client);
        results.push(result);
        healthUpdates.push(...health);
      }
    } catch (err) {
      results.push({
        job,
        found: 0,
        added: 0,
        updated: 0,
        skipped: 0,
        removed: 0,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
    const last = results[results.length - 1];
    const { error: logErr } = await client.from("data_sync_logs").insert({
      job_name: job,
      source_name: last.job === job ? job : null,
      started_at: started.toISOString(),
      completed_at: new Date().toISOString(),
      status: last.status,
      records_found: last.found,
      records_added: last.added,
      records_updated: last.updated,
      records_removed: last.removed,
      records_skipped: last.skipped,
      error_message: last.error || null,
      duration_ms: Date.now() - t0,
    });
    if (logErr) console.error("data_sync_logs insert error:", logErr.message);
  }

  // Apply source health updates.
  for (const h of healthUpdates) {
    const existing = await client.from("data_sources").select("id, failure_count, status, records_count").eq("source_name", h.sourceName).maybeSingle();
    if (!existing) continue;
    const failureCount = h.failureCount ? (existing.failure_count || 0) + 1 : 0;
    await client.from("data_sources").update({
      status: h.status,
      failure_count: failureCount,
      records_count: h.recordsCount,
      response_time_ms: h.responseTimeMs,
      last_success: h.lastSuccess,
      last_failure: h.lastFailure,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  }

  return new Response(JSON.stringify({ completed: results }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});