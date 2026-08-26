import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Get allowed origins from environment
const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app'
).split(',').map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : undefined;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

interface NotificationEmailRequest {
  to: string;
  type: "price_alert" | "weather_alert";
  data: {
    commodity?: string;
    currentPrice?: number;
    targetPrice?: number;
    alertType?: string;
    weatherCondition?: string;
    location?: string;
    message?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // ✅ AUTHENTICATION CHECK ADDED
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization' }),
        { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.slice(7);
    
    // Verify token with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
    
    // ✅ RATE LIMITING (per user, persisted via rate_limits table)
    const rateLimit = await checkRateLimit(user.id, "notification-email", {
      maxRequests: 100,
      windowMs: 24 * 60 * 60 * 1000, // 100 emails per day
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limited: Too many emails today' }),
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

    const { type, data }: NotificationEmailRequest = await req.json();

    // Only allow sending to the authenticated user's own verified email
    const recipient = user.email;
    if (!recipient) {
      return new Response(
        JSON.stringify({ error: 'No verified email on account' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    let subject: string;
    let html: string;

    if (type === "price_alert") {
      subject = `📈 Price Alert: ${esc(data.commodity || '')}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🌾 Bharat Krishi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Price Alert Notification</p>
            </div>
            <div style="padding: 30px;">
              <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #166534; margin: 0 0 10px; font-size: 20px;">${esc(data.commodity || '')} Price ${esc(data.alertType || '') === 'above' ? 'Rose Above' : 'Fell Below'} Target</h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Commodity</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${esc(data.commodity || '')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Price</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #16a34a;">₹${esc(String(data.currentPrice || ''))}/quintal</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Your Target</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">₹${esc(String(data.targetPrice || ''))}/quintal</td>
                </tr>
              </table>
              <div style="margin-top: 25px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px;">Check the latest prices and plan your sale accordingly!</p>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 AgriConnect. Empowering Indian Farmers.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `⛈️ Weather Alert: ${esc(data.location || '')}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #0ea5e9, #38bdf8); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🌾 Bharat Krishi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Weather Alert Notification</p>
            </div>
            <div style="padding: 30px;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #92400e; margin: 0 0 10px; font-size: 20px;">⚠️ Weather Warning</h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Location</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${esc(data.location || '')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Condition</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #f59e0b;">${esc(data.weatherCondition || '')}</td>
                </tr>
              </table>
              <div style="background: #fef9c3; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="color: #713f12; margin: 0; font-size: 14px;">${esc(data.message || '')}</p>
              </div>
              <div style="margin-top: 25px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px;">Protect your crops and livestock accordingly!</p>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 AgriConnect. Empowering Indian Farmers.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("EMAIL_FROM") || "AgriConnect <hello.agriconnect@gmail.com>",
      to: [recipient],
      subject,
      html,
    });

    console.log("Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...headers } }
    );
  }
};

serve(handler);
