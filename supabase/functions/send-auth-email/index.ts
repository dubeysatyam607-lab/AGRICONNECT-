import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import nodemailer from "npm:nodemailer@6.9.14";
import { Resend } from "https://esm.sh/resend@2.0.0";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Auth Hook: send_email
//
// Wires into Supabase Auth (Dashboard → Authentication → Hooks → send_email) so
// every OTP / magic-link / recovery email is sent by US with the REAL one-time
// code — never a fake/sandbox value. A branded welcome email follows right after.
//
// Provider: EMAIL_PROVIDER
//   "gmail" (default) – Gmail SMTP with an app password. Works for ANY recipient
//                       with no domain verification. Good until you own a domain.
//   "resend"          – Resend. Requires a verified sending domain; plain gmail
//                       addresses are rejected by Resend.
//
// Secrets required:
//   EMAIL_PROVIDER          – "gmail" or "resend" (default "gmail")
//   EMAIL_HOST              – gmail: smtp.gmail.com
//   EMAIL_PORT              – gmail: 465
//   EMAIL_USER              – the gmail address
//   EMAIL_PASS              – a 16-char Gmail APP PASSWORD (not the login password)
//   EMAIL_FROM              – display name, e.g. "AgriConnect <hello.agriconnect@gmail.com>"
//   RESEND_API_KEY          – only needed when EMAIL_PROVIDER=resend
//   SEND_EMAIL_HOOK_SECRETS – the `v1,whsec_...` secret shown in the dashboard when
//                             you enable the hook. Proves only Supabase Auth calls us.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_PROVIDER = (Deno.env.get("EMAIL_PROVIDER") || "gmail").toLowerCase();
const SEND_EMAIL_HOOK_SECRETS = Deno.env.get("SEND_EMAIL_HOOK_SECRETS");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "AgriConnect <hello.agriconnect@gmail.com>";
const APP_URL = Deno.env.get("APP_URL") || "https://agriconnect.in";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(message: EmailMessage): Promise<void> {
  if (EMAIL_PROVIDER === "resend") {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
    });
    return;
  }

  // Default: Gmail SMTP via nodemailer. No domain verification needed.
  const hostname = Deno.env.get("EMAIL_HOST") || "smtp.gmail.com";
  const port = Number(Deno.env.get("EMAIL_PORT") || 465);
  const username = Deno.env.get("EMAIL_USER");
  const password = Deno.env.get("EMAIL_PASS");
  if (!username || !password) {
    throw new Error("EMAIL_USER / EMAIL_PASS not configured");
  }

  const transporter = nodemailer.createTransport({
    host: hostname,
    port,
    secure: port === 465,
    auth: { user: username, pass: password },
  });
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } finally {
    transporter.close();
  }
}

// ── Branded HTML shell ───────────────────────────────────────────────────────
function emailShell(title: string, inner: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f5f5;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
        <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">🌾 AgriConnect</h1>
          <p style="color:rgba(255,255,255,.9);margin:6px 0 0;font-size:13px;">${title}</p>
        </div>
        <div style="padding:28px;">${inner}</div>
        <div style="background:#f9fafb;padding:18px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} AgriConnect · Empowering Indian Farmers</p>
          <p style="color:#9ca3af;font-size:11px;margin:6px 0 0;">Didn't ask for this email? You can safely ignore it.</p>
        </div>
      </div>
    </body>
    </html>`;
}

function otpEmail(code: string, minutes = 5): string {
  return emailShell(
    "Your verification code",
    `
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Hi there,</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Your AgriConnect verification code is: <strong>${code}</strong>
      </p>
      <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <p style="font-size:36px;font-weight:800;letter-spacing:8px;color:#15803d;margin:0;">${code}</p>
      </div>
      <ul style="color:#4b5563;font-size:13px;line-height:1.6;margin:0 0 20px;padding-left:20px;">
        <li>This verification code is valid for exactly <strong>${minutes} minutes</strong>.</li>
        <li>It is single-use and can only be verified once.</li>
        <li><strong>Do not share this code with anyone.</strong> AgriConnect employees or systems will never ask you for this code.</li>
      </ul>
    `,
  );
}

function welcomeEmail(name: string): string {
  return emailShell(
    "Welcome to AgriConnect",
    `
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">${name ? `Welcome, ${name}!` : "Welcome!"}</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Your account is ready. We're glad you joined AgriConnect — your daily companion
        for farming. Here's what's waiting for you:
      </p>
      <ul style="color:#4b5563;font-size:14px;line-height:1.8;margin:0 0 20px;padding-left:20px;">
        <li>📈 Live mandi bhav (market prices) for your crops</li>
        <li>🌦️ Crop-aware weather forecasts</li>
        <li>🌱 AI Crop Doctor for plant disease diagnosis</li>
        <li>🏦 Government schemes & subsidies you can claim</li>
        <li>🚜 Tractor & equipment hire in your village</li>
      </ul>
      <a href="${APP_URL}" style="display:inline-block;background:#16a34a;color:white;padding:12px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">Open AgriConnect</a>
      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">Happy farming! 🌾</p>
    `,
  );
}

function linkEmail(header: string, actionText: string, url: string): string {
  return emailShell(
    header,
    `
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">${header}</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Tap the button below to continue. This link is valid for a short time.
      </p>
      <a href="${url}" style="display:inline-block;background:#16a34a;color:white;padding:12px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">${actionText}</a>
      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${url}" style="color:#16a34a;word-break:break-all;">${url}</a>
      </p>
    `,
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    if (EMAIL_PROVIDER === "resend" && !Deno.env.get("RESEND_API_KEY")) {
      console.error("[send-auth-email] RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service is not configured." }), { status: 500 });
    }
    if (!SEND_EMAIL_HOOK_SECRETS) {
      console.error("[send-auth-email] SEND_EMAIL_HOOK_SECRETS is not configured");
      return new Response(JSON.stringify({ error: "Hook secret is not configured." }), { status: 500 });
    }

    // Verify the payload was sent by Supabase Auth (Standard Webhooks signing).
    const payload = await req.text();
    const hookSecret = SEND_EMAIL_HOOK_SECRETS.replace("v1,whsec_", "");
    const wh = new Webhook(hookSecret);
    let hookPayload: any;
    try {
      hookPayload = wh.verify(payload, Object.fromEntries(req.headers));
    } catch (err: any) {
      console.error("[send-auth-email] webhook signature verification failed:", err?.message || err);
      return new Response(
        JSON.stringify({ error: { http_code: 401, message: "Unauthorized: invalid signature" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Current Supabase send_email hook payload:
    //   { user: {...}, email_data: { token, token_hash, redirect_to,
    //     email_action_type, site_url, token_new, token_hash_new } }
    const user = hookPayload.user;
    const emailData = hookPayload.email_data || {};

    const to = user?.email;
    if (!to) {
      console.error("[send-auth-email] No recipient email on payload");
      return new Response(JSON.stringify({ error: "Missing recipient" }), { status: 400 });
    }

    // The 6-digit one-time code generated per user (each person gets their own).
    const otp: string = (emailData.token || "").trim();
    const tokenHash: string = emailData.token_hash || "";
    const emailActionType: string = emailData.email_action_type || "signup";
    const redirectTo: string = emailData.redirect_to || APP_URL;

    // Build a working verification URL from the token hash (NOT the plain token).
    const verifyBase = `https://${Deno.env.get("SUPABASE_URL")?.replace(/^https?:\/\//, "") || "yrebxnpilkfeaofykvhq.supabase.co"}/auth/v1/verify`;
    const linkUrl = tokenHash
      ? `${verifyBase}?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(emailActionType)}&redirect_to=${encodeURIComponent(redirectTo)}`
      : redirectTo;

    const firstName = (user?.user_metadata?.name || user?.user_metadata?.full_name || "").toString().split(" ")[0] || "";

    let subject: string;
    let html: string;
    let text: string;
    let sendWelcome = false;

    // The app uses email OTP for sign-in, signup and password recovery. Always
    // send the code itself (valid 5 minutes) — never a confirmation link.
    if (otp) {
      subject = "🔐 Your AgriConnect verification code";
      html = otpEmail(otp, 5);
      text = `Your AgriConnect verification code is: ${otp}. It is valid for 5 minutes.`;
      sendWelcome = false;
    } else {
      // Fallback (no code in payload — e.g. email_change): send a link.
      switch (emailActionType) {
        case "recovery":
          subject = "🔑 Reset your AgriConnect password";
          html = linkEmail("Reset your password", "Reset password", linkUrl);
          text = `Reset your AgriConnect password: ${linkUrl}`;
          break;
        case "email_change":
          subject = "✉️ Confirm your new email";
          html = linkEmail("Confirm your new email", "Confirm email", linkUrl);
          text = `Confirm your new email on AgriConnect: ${linkUrl}`;
          break;
        case "invite":
          subject = "📨 You're invited to AgriConnect";
          html = linkEmail("You've been invited", "Accept invitation", linkUrl);
          text = `Accept your invitation to AgriConnect: ${linkUrl}`;
          break;
        default:
          subject = "🔐 Your AgriConnect verification code";
          html = linkEmail("Continue to AgriConnect", "Continue", linkUrl);
          text = `Continue to AgriConnect: ${linkUrl}`;
      }
    }

    await sendEmail({ to, subject, html, text });

    // ── After the OTP / confirmation goes out, send the welcome message ──
    if (sendWelcome) {
      try {
        await sendEmail({
          to,
          subject: firstName ? `🎉 Welcome to AgriConnect, ${firstName}!` : "🎉 Welcome to AgriConnect!",
          html: welcomeEmail(firstName),
          text: `Welcome to AgriConnect! Your account is ready. Visit ${APP_URL} to get started.`,
        });
      } catch (welcomeError: any) {
        // The critical OTP email already succeeded — never fail auth because of the welcome.
        console.error("[send-auth-email] welcome email failed (non-fatal):", welcomeError?.message);
      }
    }

    console.log("[send-auth-email] sent:", emailActionType, "to", to);

    // GoTrue expects a 200 with an empty JSON object on success.
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[send-auth-email] error:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || "Failed to send email" }), { status: 500 });
  }
};

serve(handler);
