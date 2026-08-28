import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

// Get allowed origins from environment
const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'POST, OPTIONS');
}

interface PushNotificationRequest {
  userId?: string;
  type: "price_alert" | "weather_alert";
  title: string;
  body: string;
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization' }),
        { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.slice(7);
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    webpush.setVapidDetails(
      "mailto:hello.agriconnect@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Trusted internal callers (cron workers like price-alert-worker) present
    // the service-role key and target an explicit userId instead of a client JWT.
    const isInternal = serviceRoleKey !== undefined && token === serviceRoleKey;

    const body: PushNotificationRequest = await req.json();
    const { userId, type, title, body: messageBody, data }: PushNotificationRequest = body;

    // Only the authenticated user's own subscriptions may be targeted. For
    // internal calls the caller (e.g. price-alert-worker) supplies the userId.
    let targetUserId: string;
    if (isInternal) {
      if (!body.userId) {
        return new Response(
          JSON.stringify({ error: 'Internal call requires userId' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = body.userId;
    } else {
      // Verify authentication token (client JWT -> real user)
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token' }),
          { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = user.id;
    }
    
    // Rate limiting (per user, persisted via rate_limits table)
    const rateLimit = await checkRateLimit(targetUserId, "send-push", {
      maxRequests: 500,
      windowMs: 24 * 60 * 60 * 1000, // 500 notifications per day
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limited: Too many notifications today' }),
        {
          status: 429,
          headers: {
            ...headers,
            ...getRateLimitHeaders(rateLimit),
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Build query to get subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .eq("user_id", targetUserId);
    
    // Filter by alert type preference
    if (type === "price_alert") {
      query = query.eq("price_alerts", true);
    } else if (type === "weather_alert") {
      query = query.eq("weather_alerts", true);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...headers } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: messageBody,
      icon: "/apple-touch-icon.png",
      badge: "/agriconnect-icon-64.png",
      data: { ...data, type },
      tag: type,
      requireInteraction: type === "weather_alert",
    });

    const sendPushNotification = async (sub: { user_id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 86400, contentEncoding: "aes128gcm" }
        );
        return { success: true, userId: sub.user_id };
      } catch (err: any) {
        // 404/410 means the subscription is gone (browser unsubscribed or
        // push service dropped it). Prune it so we don't keep failing forever.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint).catch(() => {});
        }
        console.error(`Failed to send to ${sub.user_id}:`, err?.message || err);
        return { success: false, userId: sub.user_id, error: err?.message || "unknown error" };
      }
    };

    const results = await Promise.all(subscriptions.map(sendPushNotification));
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        message: "Notifications processed", 
        sent: successCount,
        total: subscriptions.length,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...headers } }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...headers } }
    );
  }
};

serve(handler);
