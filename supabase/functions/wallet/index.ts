import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app"
).split(",").map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => {
    if (o.includes("*")) {
      const prefix = o.replace("*", "");
      return origin.startsWith(prefix);
    }
    return o === origin;
  }) ? origin : null;
  return {
    "Access-Control-Allow-Origin": allowed ?? "https://agriconnect-navy-six.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, x-razorpay-signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

const json = (body: unknown, status = 200, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

/** Create a Razorpay order server-side (server-authoritative amount). */
async function createRazorpayOrder(amountInr: number, userId: string): Promise<{ id: string; amount: number }> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay not configured on server");
  }
  const basic = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100), // paise
      currency: "INR",
      receipt: `wallet-${userId.slice(0, 8)}-${Date.now()}`,
      notes: { app: "AgriConnect", userId, purpose: "wallet_add_money" },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay order failed: ${err}`);
  }
  const order = await res.json();
  return { id: order.id, amount: order.amount };
}

/** Verify the Razorpay payment signature (never trust the client). */

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const cors = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  const serviceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── Webhook: Razorpay server → us (no user token, HMAC verified) ────────
  if (url.pathname.endsWith("/webhook")) {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return json({ error: "Webhook not configured" }, 503, cors);
    }
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    const expected = await hmacHex(rawBody, RAZORPAY_WEBHOOK_SECRET);
    if (!timingSafeEqualHex(expected, signature)) {
      return json({ error: "Invalid webhook signature" }, 401, cors);
    }
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid webhook payload" }, 400, cors);
    }
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      const notes = payment?.notes ?? {};
      const userId = notes.userId;
      const amountInr = Number(payment?.amount ?? 0) / 100;
      if (!userId || !amountInr || amountInr <= 0) {
        return json({ error: "Missing payment metadata" }, 400, cors);
      }
      // Idempotent: reference_type+reference_id unique constraint.
      const { data, error } = await serviceRole.rpc("wallet_credit_verified", {
        p_user_id: userId,
        p_amount: amountInr,
        p_reference_type: "razorpay_payment",
        p_reference_id: payment.id,
        p_description: "Add money via Razorpay",
        p_credit_type: "cash",
        p_source: "razorpay",
      });
      if (error) {
        return json({ error: error.message }, 500, cors);
      }
      return json({ ok: true, transaction: data }, 200, cors);
    }
    return json({ ok: true, ignored: event.event }, 200, cors);
  }

  // ── Authenticated user routes ────────────────────────────────────────────
  const auth = await validateAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return authErrorResponse(auth.error ?? "Unauthorized", cors);
  }
  const userId = auth.userId;

  // User-scoped client: runs RPCs with the caller's JWT so auth.uid() resolves
  // to the requesting user inside the SECURITY DEFINER functions. Using the
  // service-role client here would leave auth.uid() NULL and silently break
  // limits + ownership checks.
  const bearerToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    },
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }

  const action = body.action;

  // GET wallet summary (get-or-create)
  if (action === "summary") {
    const { data, error } = await supabase.rpc("wallet_get_summary");
    if (error) return json({ error: error.message }, 500, cors);
    return json({ wallet: data }, 200, cors);
  }

  // Transaction history (paginated + type filter)
  if (action === "transactions") {
    const { data, error } = await supabase.rpc("wallet_transactions_page", {
      p_page: Math.max(1, Number(body.page) || 1),
      p_page_size: Math.min(50, Math.max(1, Number(body.pageSize) || 20)),
      p_type_filter: body.typeFilter ?? "all",
    });
    if (error) return json({ error: error.message }, 500, cors);
    return json({ result: data }, 200, cors);
  }

  // Add money: validate limits, create Razorpay order, hold a pending txn
  if (action === "add-money") {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Invalid amount" }, 400, cors);
    }
    const { data: check, error: checkErr } = await supabase.rpc("wallet_add_money_check", {
      p_amount: amount,
    });
    if (checkErr) return json({ error: checkErr.message }, 500, cors);
    if (!check?.allowed) {
      return json({ error: check?.reason ?? "Amount not allowed", limits: check }, 422, cors);
    }
    try {
      const order = await createRazorpayOrder(amount, userId);
      return json({ orderId: order.id, amount: order.amount / 100, key: RAZORPAY_KEY_ID }, 200, cors);
    } catch (err: any) {
      return json({ error: err.message }, 502, cors);
    }
  }

  // Verify payment after Razorpay checkout closes (server-side HMAC check),
  // then credit the wallet. Reference id makes it idempotent across retries.
  if (action === "verify-payment") {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing verification fields" }, 400, cors);
    }
    if (!RAZORPAY_KEY_SECRET) {
      return json({ error: "Razorpay not configured" }, 503, cors);
    }
    const expected = await hmacHex(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET);
    if (!timingSafeEqualHex(expected, razorpay_signature)) {
      return json({ error: "Invalid signature" }, 400, cors);
    }
    // Amount must come from Razorpay, never from the client: a user could pay
    // ₹100 and claim ₹100000 because the HMAC only covers order|payment ids.
    const basic = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    if (!orderRes.ok) {
      return json({ error: "Could not fetch order" }, 502, cors);
    }
    const order = await orderRes.json();
    // Bind the order to the authenticated user: a valid (order, payment, sig)
    // triple for someone else's order (or an unbound order) must not credit
    // the caller.
    const orderUserId = order?.notes?.userId ?? "";
    if (orderUserId !== userId) {
      return json({ error: "Order does not belong to user" }, 403, cors);
    }
    const amountInr = Number(order.amount_paid ?? order.amount ?? 0) / 100;
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      return json({ error: "Invalid order amount" }, 400, cors);
    }
    // wallet_credit_verified is service_role-only; verify-payment is already
    // server-verified (auth + HMAC + order-to-user binding), so use the
    // service-role client here — the user client would get permission denied.
    const { data, error } = await serviceRole.rpc("wallet_credit_verified", {
      p_user_id: userId,
      p_amount: amountInr,
      p_reference_type: "razorpay_payment",
      p_reference_id: razorpay_payment_id,
      p_description: "Add money via Razorpay",
      p_credit_type: "cash",
      p_source: "razorpay",
    });
    if (error) return json({ error: error.message }, 500, cors);
    return json({ ok: true, transaction: data }, 200, cors);
  }

  // Admin manual adjustment (audited) — requires admin role
  if (action === "admin-adjust") {
    // Verify admin role: check app_metadata for admin role
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401, cors);
    }
    const role = (user.app_metadata as any)?.role;
    if (role !== "admin") {
      return json({ error: "Forbidden: admin access required" }, 403, cors);
    }
    const { data, error } = await supabase.rpc("wallet_admin_adjust", {
      p_user_id: body.userId,
      p_amount: Number(body.amount),
      p_direction: body.direction,
      p_reason: body.reason,
    });
    if (error) return json({ error: error.message }, error.code === "42501" ? 403 : 500, cors);
    return json({ ok: true, transaction: data }, 200, cors);
  }

  // Admin wallet list — requires admin role
  if (action === "admin-list") {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401, cors);
    }
    const role = (user.app_metadata as any)?.role;
    if (role !== "admin") {
      return json({ error: "Forbidden: admin access required" }, 403, cors);
    }
    const { data, error } = await supabase.rpc("admin_wallets_list");
    if (error) return json({ error: error.message }, error.code === "42501" ? 403 : 500, cors);
    return json({ wallets: data }, 200, cors);
  }

  return json({ error: "Unknown action" }, 400, cors);
});
