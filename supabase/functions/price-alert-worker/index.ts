import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000,http://localhost:8000,https://agriconnect.in'
).split(',').map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : null;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60 * 1000 };

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers });

  // Internal cron trigger - verify with service role key
  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  const rateLimitResult = await checkRateLimit('cron:price-alerts', 'price-alert-worker', RATE_LIMIT_CONFIG);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429, headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    // Get all active price alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('is_active', true)
      .is('triggered_at', null);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No active alerts", checked: 0 }), {
        headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" }
      });
    }

    // Group alerts by commodity
    const commodities = [...new Set(alerts.map(a => a.commodity))];
    let triggeredCount = 0;

    // Fetch current prices for each commodity
    for (const commodity of commodities) {
      try {
        // Call mandi-prices edge function
        const { data: priceData, error: priceError } = await supabase.functions.invoke('mandi-prices', {
          body: { searchQuery: commodity }
        });

        if (priceError || !priceData?.prices?.length) continue;

        const currentPrice = priceData.prices[0].price;

        // Check each alert for this commodity
        const commodityAlerts = alerts.filter(a => a.commodity === commodity);
        
        for (const alert of commodityAlerts) {
          const shouldTrigger = alert.alert_type === 'above' 
            ? currentPrice >= alert.target_price
            : currentPrice <= alert.target_price;

          if (shouldTrigger) {
            // Mark alert as triggered
            await supabase
              .from('price_alerts')
              .update({ triggered_at: new Date().toISOString(), is_active: false })
              .eq('id', alert.id);

            // Send push notification for this alert's owner
            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: alert.user_id,
                type: 'price_alert',
                title: `Price Alert: ${commodity}`,
                body: `${commodity} price is now ₹${currentPrice.toLocaleString('en-IN')}/qtl (your target: ${alert.alert_type} ₹${alert.target_price.toLocaleString('en-IN')})`,
                data: { commodity, currentPrice, alertId: alert.id }
              }
            });

            triggeredCount++;
          }
        }
      } catch (err) {
        console.error(`Error checking ${commodity}:`, err);
      }
    }

    return new Response(JSON.stringify({ 
      message: "Price alert check completed", 
      checked: alerts.length,
      triggered: triggeredCount
    }), {
      headers: { ...headers, ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Price alert worker error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});