/**
 * Vercel Cron → Supabase agri-sync-worker bridge.
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` (configured in
 * Vercel Project > Cron Secrets). This endpoint verifies it, then POSTs to the
 * Supabase edge function using SUPABASE_SERVICE_ROLE_KEY (never exposed to the
 * browser). Missing configuration is intentionally noisy.
 */

const MAX_RUN_MS = 115 * 1000; // stay well inside Vercel maxDuration (1200 ms buffer)

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const expected = process.env.CRON_SECRET;
  const supplied = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();

  if (!expected) {
    return res.status(500).json({
      error: "CRON_SECRET env var is not configured on Vercel. Add it and set the same value in Supabase.",
      code: "CRON_SECRET_MISSING",
    });
  }
  if (!supplied || supplied !== expected) {
    return res.status(401).json({ error: "Unauthorized", code: "CRON_UNAUTHORIZED" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured on Vercel.",
      code: "SUPABASE_ENV_MISSING",
    });
  }

  const startedAt = Date.now();
  try {
    const res2 = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/agri-sync-worker`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ jobs: ["scheme", "news", "msp"] }),
      },
      MAX_RUN_MS
    );

    const body = await res2.json().catch(() => null);
    if (!res2.ok) {
      return res.status(502).json({
        error: "Sync worker failed",
        detail: body,
        code: "SYNC_WORKER_ERROR",
      });
    }

    return res.status(200).json({
      ok: true,
      ...body,
      durationMs: Date.now() - startedAt,
      triggeredBy: "vercel-cron",
    });
  } catch (err) {
    return res.status(504).json({
      error: "Sync worker timed out or errored",
      message: err?.message || String(err),
      code: "SYNC_TIMEOUT",
    });
  }
}