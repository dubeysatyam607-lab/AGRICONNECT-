import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'POST, OPTIONS');
}

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

const json = (body: unknown, status = 200, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
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

async function createRazorpayOrder(amountInr: number, userId: string, plan: string): Promise<{ id: string; amount: number }> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) throw new Error("Razorpay not configured");
  const basic = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      receipt: `ff-${userId.slice(0, 8)}-${plan}-${Date.now()}`,
      notes: { app: "AgriConnect", userId, purpose: "founding_farmer", plan },
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${await res.text()}`);
  const order = await res.json();
  return { id: order.id, amount: order.amount };
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");
  const cors = getCORSHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  // Webhook handler (no auth required, verified by signature)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const action = body?.action;

      // ── Webhook: Razorpay payment.captured ──
      if (action === "webhook") {
        const signature = req.headers.get("x-razorpay-signature");
        if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
          return json({ error: "Invalid webhook" }, 400, cors);
        }
        const rawBody = body.rawBody || JSON.stringify(body);
        const expected = await hmacHex(rawBody, RAZORPAY_WEBHOOK_SECRET);
        if (!timingSafeEqualHex(expected, signature)) {
          return json({ error: "Invalid signature" }, 400, cors);
        }
        // Webhook processed — acknowledge
        return json({ ok: true }, 200, cors);
      }

      // ── check-eligibility (public, no auth) ──
      if (action === "check-eligibility") {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );
        const { data, error } = await supabase.rpc("get_founding_farmer_config");
        if (error) return json({ error: error.message }, 500, cors);
        return json({ config: data }, 200, cors);
      }

      // ── All other actions require auth ──
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401, cors);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return json({ error: "Unauthorized" }, 401, cors);

      // ── create-subscription ──
      if (action === "create-subscription") {
        const plan = body.plan;
        if (plan !== "plus" && plan !== "pro") {
          return json({ error: "Invalid plan. Must be 'plus' or 'pro'" }, 400, cors);
        }

        // Claim slot (server-authoritative price)
        const { data: claimResult, error: claimError } = await supabase.rpc("claim_founding_farmer_slot", {
          p_user_id: user.id,
          p_plan: plan,
        });
        if (claimError) return json({ error: claimError.message }, 500, cors);
        if (!claimResult?.ok) return json({ error: claimResult?.error || "Slot claim failed" }, 422, cors);

        const price = claimResult.price as number;
        const ffNumber = claimResult.founding_farmer_number as number;

        // Create Razorpay order with server-authoritative amount
        try {
          const order = await createRazorpayOrder(price, user.id, plan);
          return json({
            orderId: order.id,
            amount: order.amount / 100,
            key: RAZORPAY_KEY_ID,
            foundingFarmerNumber: ffNumber,
            plan,
            price,
          }, 200, cors);
        } catch (err) {
          // Rollback slot on order creation failure
          console.error("Razorpay order creation failed:", err);
          return json({ error: "Failed to create payment order. Please try again." }, 502, cors);
        }
      }

      // ── verify-payment ──
      if (action === "verify-payment") {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, founding_farmer_number } = body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return json({ error: "Missing verification fields" }, 400, cors);
        }
        if (!RAZORPAY_KEY_SECRET) {
          return json({ error: "Razorpay not configured" }, 503, cors);
        }

        // HMAC verification
        const expected = await hmacHex(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET);
        if (!timingSafeEqualHex(expected, razorpay_signature)) {
          return json({ error: "Invalid payment signature" }, 400, cors);
        }

        // Fetch order from Razorpay to get server-authoritative amount
        const basic = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
          headers: { Authorization: `Basic ${basic}` },
        });
        if (!orderRes.ok) return json({ error: "Could not verify order" }, 502, cors);
        const order = await orderRes.json();

        // Verify order belongs to this user
        const orderUserId = order?.notes?.userId ?? "";
        if (orderUserId !== user.id) {
          return json({ error: "Order does not belong to user" }, 403, cors);
        }

        // Get server-authoritative price from config (not from request)
        const { data: config } = await supabase.rpc("get_founding_farmer_config");
        const serverPrice = plan === "plus" ? config?.plus_price : config?.pro_price;
        const normalPrice = plan === "plus" ? 49 : 99;

        // Verify amount matches
        const amountPaid = Number(order.amount_paid ?? order.amount ?? 0) / 100;
        if (Math.abs(amountPaid - serverPrice) > 1) {
          return json({ error: "Payment amount mismatch" }, 400, cors);
        }

        // Activate subscription (service_role RPC — privileged, payment-verified)
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        const { data: activateResult, error: activateError } = await adminClient.rpc("activate_founding_farmer", {
          p_user_id: user.id,
          p_plan: plan,
          p_price: serverPrice,
          p_founding_farmer_number: founding_farmer_number,
          p_payment_id: razorpay_payment_id,
          p_normal_price: normalPrice,
        });
        if (activateError) return json({ error: activateError.message }, 500, cors);
        if (!activateResult?.ok) return json({ error: activateResult?.error || "Activation failed" }, 500, cors);

        return json({
          ok: true,
          subscription_id: activateResult.subscription_id,
          founding_farmer_number,
          plan,
          price: serverPrice,
          expires_at: activateResult.expires_at,
        }, 200, cors);
      }

      return json({ error: "Unknown action" }, 400, cors);
    } catch (err: unknown) {
      console.error("Founding Farmer function error:", err);
      const message = err instanceof Error ? err.message : "Internal error";
      return json({ error: message }, 500, cors);
    }
  }

  return json({ error: "Method not allowed" }, 405, cors);
});
