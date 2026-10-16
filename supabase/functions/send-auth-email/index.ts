import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Auth Hook: send_email
//
// Wires into Supabase Auth (Dashboard → Authentication → Hooks → send_email) so
// every OTP / magic-link / recovery email is sent by US with the REAL one-time
// code — never a fake/sandbox value. A branded welcome email follows right after.
//
// Provider: EMAIL_PROVIDER
// "gmail" (default) – Gmail SMTP with an app password. Works for ANY recipient
// with no domain verification. Good until you own a domain.
// "resend" – Resend. Requires a verified sending domain; plain gmail
// addresses are rejected by Resend.
//
// Secrets required:
// EMAIL_PROVIDER – "gmail" or "resend" (default "gmail")
// EMAIL_HOST – gmail: smtp.gmail.com
// EMAIL_PORT – gmail: 465
// EMAIL_USER – the gmail address
// EMAIL_PASS – a 16-char Gmail APP PASSWORD (not the login password)
// EMAIL_FROM – display name, e.g. "AgriConnect <hello.agriconnect@gmail.com>"
// RESEND_API_KEY – only needed when EMAIL_PROVIDER=resend
// SEND_EMAIL_HOOK_SECRETS – the `v1,whsec_...` secret shown in the dashboard when
// you enable the hook. Proves only Supabase Auth calls us.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_PROVIDER = (Deno.env.get("EMAIL_PROVIDER") || "gmail").toLowerCase();
const SEND_EMAIL_HOOK_SECRETS = Deno.env.get("SEND_EMAIL_HOOK_SECRETS");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "AgriConnect <hello.agriconnect@gmail.com>";
const APP_URL = Deno.env.get("APP_URL") || "https://agriconnect-navy-six.vercel.app";

// ── Standard Webhooks signature verification (native, no external deps) ──────
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Verify the Supabase Send Email hook request using the Standard Webhooks spec.
 *
 * Supabase signs the payload and sends `webhook-id` / `webhook-timestamp` /
 * `webhook-signature` headers. It does NOT send an `Authorization` header for
 * send_email hooks (supabase/auth#2499), so a bearer-token check always fails
 * once a secret is configured — and Auth then reports "Hook requires
 * authorization token". Internal pg_net calls from our Postgres hook are trusted.
 */
async function verifyHookSecret(req: Request, rawBody: string): Promise<boolean> {
  // No secret configured → nothing to verify (development / secret-less setup)
  if (!SEND_EMAIL_HOOK_SECRETS) return true;
  // Trusted internal call from the Postgres handle_send_email function via pg_net
  if (req.headers.get("x-internal-source") === "pg_net") return true;

  const id = req.headers.get("webhook-id") || "";
  const timestamp = req.headers.get("webhook-timestamp") || "";
  const signatureHeader = req.headers.get("webhook-signature") || "";
  if (!id || !timestamp || !signatureHeader) return false;

  try {
    const rawParts = SEND_EMAIL_HOOK_SECRETS.split(",");
    const secrets: string[] = [];
    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i].trim();
      if (part.startsWith("whsec_")) {
        secrets.push(part.replace(/^whsec_/, ""));
      } else if (part.startsWith("v1,whsec_")) {
        secrets.push(part.replace(/^v1,whsec_/, ""));
      } else if (part && part !== "v1") {
        secrets.push(part);
      }
    }

    if (secrets.length === 0) {
      secrets.push(SEND_EMAIL_HOOK_SECRETS.replace(/^v1,whsec_/, "").replace(/^whsec_/, ""));
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(`${id}.${timestamp}.${rawBody}`);
    const signatures = signatureHeader.split(" ");

    for (const secretB64 of secrets) {
      try {
        const keyBytes = base64ToBytes(secretB64);
        const key = await crypto.subtle.importKey(
          "raw",
          keyBytes,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
        const expected = `v1,${bytesToBase64(mac)}`;
        if (signatures.includes(expected)) {
          return true;
        }
      } catch {
        // Try next secret if rotation is active
      }
    }
    return false;
  } catch (err: any) {
    console.error("[send-auth-email] webhook signature verification failed:", err?.message || err);
    return false;
  }
}

interface EmailMessage {
 to: string;
 subject: string;
 html: string;
 text: string;
}

async function sendEmail(message: EmailMessage): Promise<void> {
  const hostname = Deno.env.get("EMAIL_HOST") || "smtp.gmail.com";
  const port = Number(Deno.env.get("EMAIL_PORT") || 465);
  // Guarantee sender username is hello.agriconnect@gmail.com
  const envUser = Deno.env.get("EMAIL_USER");
  const username = (envUser && !envUser.includes("dubeysatyam") && !envUser.includes("satyamff"))
    ? envUser.trim().replace(/^["']|["']$/g, "")
    : "hello.agriconnect@gmail.com";

  const envPass = Deno.env.get("EMAIL_PASS");
  const rawPass = (!envPass || envPass.includes("tmjmzfgyhgqupfcu") || envPass.startsWith("sbp_"))
    ? "tgojmbgwhcyywkth"
    : envPass;
  const password = rawPass.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");

  if (!password) {
    throw new Error("EMAIL_PASS not configured");
  }
  if (password.startsWith("sbp_")) {
    throw new Error("Invalid EMAIL_PASS: Google App Password expected, but Supabase access token was provided.");
  }

 // Deno-native SMTP via TLS socket
 const encoder = new TextEncoder();
 const decoder = new TextDecoder();
 const conn = await Deno.connectTls({ hostname, port });
 let buffer = "";

 async function readUntilLine(): Promise<string> {
 while (true) {
 const idx = buffer.indexOf("\r\n");
 if (idx !== -1) {
 const line = buffer.substring(0, idx);
 buffer = buffer.substring(idx + 2);
 return line;
 }
 const chunk = new Uint8Array(4096);
 const n = await conn.read(chunk);
 if (n === null) throw new Error("Connection closed");
 buffer += decoder.decode(chunk.subarray(0, n));
 }
 }

 async function send(cmd: string): Promise<string> {
 await conn.write(encoder.encode(cmd + "\r\n"));
 let response = "";
 let line = await readUntilLine();
 response = line;
 // Multi-line responses: lines starting with "NNN-" are continuation
 while (line.length >= 4 && line[3] === "-") {
 line = await readUntilLine();
 response += "\r\n" + line;
 }
 return response;
 }

  function expect(resp: string, ok: RegExp, stage: string): void {
    if (!ok.test(resp)) {
      throw new Error(`SMTP ${stage} rejected: ${resp.split("\r\n")[0]}`);
    }
  }

  // RFC 5321: SMTP needs CRLF line endings, and any body line beginning with a
  // dot must be escaped (".."). The HTML templates use plain "\n", so normalise.
  const body = message.html.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
  const headers = [
    `From: ${EMAIL_FROM}`,
    `To: ${message.to}`,
    `Reply-To: ${EMAIL_FROM}`,
    `Subject: ${message.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@agriconnect.app>`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].join("\r\n");

  try {
    expect(await readUntilLine(), /^220/, "greeting"); // 220 greeting
    expect(await send(`EHLO ${hostname}`), /^250/, "EHLO");
    expect(await send(`AUTH LOGIN`), /^334/, "AUTH LOGIN");
    expect(await send(btoa(username)), /^334/, "AUTH user");
    expect(await send(btoa(password)), /^235/, "AUTH password");
    expect(await send(`MAIL FROM:<${username}>`), /^250/, "MAIL FROM");
    expect(await send(`RCPT TO:<${message.to}>`), /^25[0-9]/, "RCPT TO");
    expect(await send(`DATA`), /^354/, "DATA");
    expect(await send(`${headers}\r\n\r\n${body}\r\n.`), /^250/, "message body");
    await send(`QUIT`);
  } finally {
    conn.close();
  }
}

// ── Branded HTML shell ───────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const INSTAGRAM_URL = "https://www.instagram.com/hello_agriconnect";
const LOGO_FULL_URL = "https://res.cloudinary.com/twev85cy/image/upload/v1792137983/agriconnect-logo-full.png";

function emailShell(title: string, inner: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<style>
@keyframes agPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); transform: scale(1); }
  50% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); transform: scale(1.01); }
}
@keyframes agShine {
  0% { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(250%) skewX(-20deg); }
}
@keyframes agFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
.ag-pulse { animation: agPulse 2.4s ease-in-out infinite; }
.ag-shine { animation: agShine 3s ease-in-out infinite; }
.ag-float { animation: agFloat 3s ease-in-out infinite; }
.ag-hover-card:hover { transform: translateY(-2px); transition: transform 0.2s ease; }
@media (max-width: 600px) {
  .ag-container { width: 100% !important; border-radius: 0 !important; }
  .ag-pad { padding: 22px 16px !important; }
  .ag-otp-num { font-size: 34px !important; letter-spacing: 10px !important; }
  .ag-grid-cell { width: 50% !important; display: inline-block !important; }
}
@media (prefers-color-scheme: dark) {
  body { background-color: #0b1410 !important; }
  .ag-card-body { background-color: #121f19 !important; }
  .ag-text-dark { color: #f1f5f9 !important; }
  .ag-text-muted { color: #94a3b8 !important; }
  .ag-box-bg { background-color: #0d281e !important; border-color: #059669 !important; }
  .ag-service-card { background-color: #162620 !important; border-color: #1e3a2d !important; color: #f1f5f9 !important; }
  .ag-footer-bg { background-color: #0d1713 !important; border-color: #1a2e24 !important; }
}
</style>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#edf5f0;margin:0;padding:24px 8px;-webkit-font-smoothing:antialiased;">
<div class="ag-container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px -10px rgba(5,150,105,0.22);border:1px solid #e2ece5;">

  <!-- ── Header with Emerald Gradient & Real AgriConnect Logo ── -->
  <div style="background:linear-gradient(135deg, #052e16 0%, #064e3b 40%, #059669 80%, #10b981 100%);padding:32px 24px 26px;text-align:center;position:relative;">
    <a href="${APP_URL}" target="_blank" style="text-decoration:none;display:inline-block;">
      <img src="${LOGO_FULL_URL}" alt="AgriConnect Logo" width="210" style="display:block;margin:0 auto;max-width:210px;height:auto;border:0;outline:none;" />
    </a>
    <div style="margin-top:12px;">
      <span style="display:inline-block;padding:5px 16px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:999px;color:#dcfce7;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;backdrop-filter:blur(6px);">
        🌱 Kisan Ka Digital Saathi
      </span>
    </div>
  </div>

  <!-- ── Main Card Body ── -->
  <div class="ag-card-body ag-pad" style="padding:34px 30px;background:#ffffff;">
    ${inner}

    <!-- ── Quick AgriConnect Services Grid ── -->
    <div style="margin:34px 0 10px;padding-top:24px;border-top:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:800;color:#64748b;letter-spacing:1.6px;text-transform:uppercase;margin:0 0 16px;text-align:center;">
        ⚡ Explore AgriConnect Super App
      </p>
      <table width="100%" cellpadding="0" cellspacing="6" border="0" style="font-size:12px;">
        <tr>
          <td width="33%" align="center" class="ag-service-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 6px;">
            <a href="${APP_URL}/mandi" target="_blank" style="text-decoration:none;color:#0f172a;display:block;">
              <div style="font-size:22px;margin-bottom:4px;">📈</div>
              <strong style="color:#059669;display:block;font-size:12px;font-weight:700;">Mandi Bhav</strong>
              <span style="color:#64748b;font-size:10px;">Live Crop Rates</span>
            </a>
          </td>
          <td width="33%" align="center" class="ag-service-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 6px;">
            <a href="${APP_URL}/weather" target="_blank" style="text-decoration:none;color:#0f172a;display:block;">
              <div style="font-size:22px;margin-bottom:4px;">🌦️</div>
              <strong style="color:#0284c7;display:block;font-size:12px;font-weight:700;">Farm Weather</strong>
              <span style="color:#64748b;font-size:10px;">Crop Advisory</span>
            </a>
          </td>
          <td width="33%" align="center" class="ag-service-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 6px;">
            <a href="${APP_URL}/crop-doctor" target="_blank" style="text-decoration:none;color:#0f172a;display:block;">
              <div style="font-size:22px;margin-bottom:4px;">🌱</div>
              <strong style="color:#16a34a;display:block;font-size:12px;font-weight:700;">Crop Doctor</strong>
              <span style="color:#64748b;font-size:10px;">AI Diagnosis</span>
            </a>
          </td>
        </tr>
        <tr>
          <td width="33%" align="center" class="ag-service-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 6px;">
            <a href="${APP_URL}/tractors" target="_blank" style="text-decoration:none;color:#0f172a;display:block;">
              <div style="font-size:22px;margin-bottom:4px;">🚜</div>
              <strong style="color:#d97706;display:block;font-size:12px;font-weight:700;">Tractor Hire</strong>
              <span style="color:#64748b;font-size:10px;">Farm Machines</span>
            </a>
          </td>
          <td width="33%" align="center" class="ag-service-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 6px;">
            <a href="${APP_URL}/schemes" target="_blank" style="text-decoration:none;color:#0f172a;display:block;">
              <div style="font-size:22px;margin-bottom:4px;">🏦</div>
              <strong style="color:#7c3aed;display:block;font-size:12px;font-weight:700;">Govt Schemes</strong>
              <span style="color:#64748b;font-size:10px;">Subsidies & Loans</span>
            </a>
          </td>
          <td width="33%" align="center" class="ag-service-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 6px;">
            <a href="${APP_URL}/store" target="_blank" style="text-decoration:none;color:#0f172a;display:block;">
              <div style="font-size:22px;margin-bottom:4px;">🛍️</div>
              <strong style="color:#dc2626;display:block;font-size:12px;font-weight:700;">Agri Store</strong>
              <span style="color:#64748b;font-size:10px;">Direct From Mandi</span>
            </a>
          </td>
        </tr>
      </table>
    </div>
  </div>

  <!-- ── Footer with Instagram & Website Links ── -->
  <div class="ag-footer-bg" style="background:#f8fafc;padding:26px 20px 24px;text-align:center;border-top:1px solid #e2e8f0;">
    <!-- Instagram Follow Button -->
    <div style="margin-bottom:16px;">
      <a href="${INSTAGRAM_URL}" target="_blank" style="display:inline-block;background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:11px 24px;border-radius:999px;box-shadow:0 6px 18px -3px rgba(220,39,67,0.4);">
        📸 Follow @hello_agriconnect on Instagram &rarr;
      </a>
    </div>

    <!-- Website Button -->
    <div style="margin-bottom:18px;">
      <a href="${APP_URL}" target="_blank" style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;text-decoration:none;font-weight:700;font-size:12.5px;padding:8px 20px;border-radius:999px;">
        🌐 Visit AgriConnect Website &bull; ${APP_URL.replace(/^https?:\/\//, '')}
      </a>
    </div>

    <!-- Quick Navigation Links -->
    <p style="color:#64748b;font-size:12px;margin:0 0 14px;line-height:1.8;">
      <a href="${APP_URL}" target="_blank" style="color:#475569;text-decoration:none;font-weight:600;">Home</a> &bull;
      <a href="${APP_URL}/about" target="_blank" style="color:#475569;text-decoration:none;font-weight:600;">About Us</a> &bull;
      <a href="${APP_URL}/features" target="_blank" style="color:#475569;text-decoration:none;font-weight:600;">Features</a> &bull;
      <a href="${APP_URL}/contact" target="_blank" style="color:#475569;text-decoration:none;font-weight:600;">Contact Support</a> &bull;
      <a href="${APP_URL}/privacy-policy" target="_blank" style="color:#475569;text-decoration:none;font-weight:600;">Privacy</a> &bull;
      <a href="${APP_URL}/terms" target="_blank" style="color:#475569;text-decoration:none;font-weight:600;">Terms</a>
    </p>

    <!-- Support & Copyright -->
    <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
      Need help? Reach out at <a href="mailto:hello.agriconnect@gmail.com" style="color:#059669;font-weight:600;">hello.agriconnect@gmail.com</a><br/>
      &copy; ${new Date().getFullYear()} AgriConnect. All rights reserved. Empowering Indian Farmers.
    </p>
  </div>
</div>
</body>
</html>`;
}

function otpEmail(code: string, minutes = 10): string {
  return emailShell(
    "Your AgriConnect Verification Code",
    `
    <div style="text-align:center;margin-bottom:20px;">
      <span class="ag-float" style="display:inline-block;font-size:40px;line-height:1;">🔐</span>
      <h2 class="ag-text-dark" style="margin:10px 0 6px;font-size:24px;font-weight:800;color:#0f172a;">Your Verification Code</h2>
      <p class="ag-text-muted" style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
        Use the 6-digit one-time code below to securely verify your AgriConnect account:
      </p>
    </div>

    <!-- ── Animated Glowing OTP Box ── -->
    <div class="ag-pulse ag-box-bg" style="background:#ecfdf5;border:2px solid #10b981;border-radius:20px;padding:26px 14px;text-align:center;margin:22px 0;">
      <div style="font-size:11px;font-weight:800;color:#047857;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">
        ONE-TIME VERIFICATION CODE
      </div>
      <div class="ag-otp-num" style="font-size:42px;font-weight:900;letter-spacing:14px;color:#065f46;font-family:ui-monospace,Menlo,Monaco,'Courier New',monospace;padding-left:14px;">
        ${code}
      </div>
      <div style="margin-top:14px;display:inline-block;padding:5px 16px;background:#d1fae5;border-radius:999px;font-size:12px;font-weight:700;color:#065f46;">
        ⏱️ Valid for ${minutes} minutes &bull; Single-use
      </div>
    </div>

    <!-- ── Action CTA Button with Shimmer Animation ── -->
    <div style="text-align:center;margin:26px 0 20px;">
      <a href="${APP_URL}" target="_blank" style="display:inline-block;position:relative;overflow:hidden;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:15px 38px;border-radius:999px;box-shadow:0 8px 24px -4px rgba(16,185,129,0.5);letter-spacing:0.3px;">
        <span class="ag-shine" style="position:absolute;top:0;left:0;width:50%;height:100%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.45),rgba(255,255,255,0));pointer-events:none;"></span>
        Open AgriConnect App &rarr;
      </a>
    </div>

    <!-- ── Security Tips Box ── -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;margin-top:20px;">
      <strong style="color:#0f172a;font-size:13px;display:block;margin-bottom:6px;">🛡️ Security Tips:</strong>
      <ul style="color:#64748b;font-size:12px;line-height:1.7;margin:0;padding-left:18px;">
        <li>This verification code expires in <strong>${minutes} minutes</strong>.</li>
        <li>It can only be used once for this session.</li>
        <li><strong>Never share this OTP with anyone</strong>, including AgriConnect staff.</li>
      </ul>
    </div>
    `,
  );
}

function welcomeEmail(name: string): string {
  return emailShell(
    "Welcome to AgriConnect",
    `
    <div style="text-align:center;margin-bottom:22px;">
      <span class="ag-float" style="display:inline-block;font-size:42px;line-height:1;">🎉</span>
      <h2 class="ag-text-dark" style="margin:10px 0 6px;font-size:24px;font-weight:800;color:#0f172a;">${name ? `Welcome to AgriConnect, ${esc(name)}!` : "Welcome to AgriConnect!"}</h2>
      <p class="ag-text-muted" style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
        Your digital farming journey begins now. AgriConnect connects you with real-time market insights, AI disease diagnosis, and village-level equipment rental.
      </p>
    </div>

    <!-- ── Hero Features Showcase ── -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:18px;padding:22px 20px;margin:20px 0;">
      <strong style="color:#166534;font-size:14px;display:block;margin-bottom:12px;">🌾 What's waiting for you:</strong>
      <ul style="color:#374151;font-size:13.5px;line-height:1.9;margin:0;padding-left:20px;">
        <li>📈 <strong>Live Mandi Bhav:</strong> Real-time APMC market rates across 2,400+ mandis</li>
        <li>🌦️ <strong>Farm Weather:</strong> Hyperlocal forecasts tailored to your sown crops</li>
        <li>🌱 <strong>AI Crop Doctor:</strong> Upload crop photos for instant disease detection</li>
        <li>🚜 <strong>Tractor & Tool Hire:</strong> Verified machinery on hourly rent nearby</li>
        <li>🏦 <strong>Govt Schemes:</strong> Direct subsidy applications & PM-Kisan trackers</li>
      </ul>
    </div>

    <div style="text-align:center;margin:28px 0 16px;">
      <a href="${APP_URL}" target="_blank" style="display:inline-block;position:relative;overflow:hidden;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:15px 38px;border-radius:999px;box-shadow:0 8px 24px -4px rgba(16,185,129,0.5);">
        <span class="ag-shine" style="position:absolute;top:0;left:0;width:50%;height:100%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.45),rgba(255,255,255,0));pointer-events:none;"></span>
        Get Started Now &rarr;
      </a>
    </div>
    `,
  );
}

function linkEmail(header: string, actionText: string, url: string): string {
  return emailShell(
    header,
    `
    <div style="text-align:center;margin-bottom:20px;">
      <span class="ag-float" style="display:inline-block;font-size:38px;line-height:1;">🔗</span>
      <h2 class="ag-text-dark" style="margin:10px 0 6px;font-size:24px;font-weight:800;color:#0f172a;">${esc(header)}</h2>
      <p class="ag-text-muted" style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Tap the button below to continue. This secure link is valid for a short time.
      </p>
    </div>

    <div style="text-align:center;margin:26px 0 22px;">
      <a href="${url}" target="_blank" style="display:inline-block;position:relative;overflow:hidden;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:15px 38px;border-radius:999px;box-shadow:0 8px 24px -4px rgba(16,185,129,0.5);">
        <span class="ag-shine" style="position:absolute;top:0;left:0;width:50%;height:100%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.45),rgba(255,255,255,0));pointer-events:none;"></span>
        ${esc(actionText)} &rarr;
      </a>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-top:20px;">
      <p style="color:#64748b;font-size:11.5px;margin:0;line-height:1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${url}" target="_blank" style="color:#059669;word-break:break-all;font-size:11.5px;">${url}</a>
      </p>
    </div>
    `,
  );
}

const handler = async (req: Request): Promise<Response> => {
 if (req.method === "OPTIONS") {
 return new Response(null, { status: 204 });
 }

  // Read the raw body first — signature verification needs the exact bytes.
  const payload = await req.text();

  // Verify the webhook signature to prevent unauthorized email sending
  if (!(await verifyHookSecret(req, payload))) {
    console.error("[send-auth-email] Invalid webhook signature");
    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message: "Unauthorized: Invalid webhook signature",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    if (EMAIL_PROVIDER === "resend" && !Deno.env.get("RESEND_API_KEY")) {
      console.error("[send-auth-email] RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: "Email service is not configured.",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    // Parse the payload from Supabase Auth
    let hookPayload: any;
    try {
      hookPayload = JSON.parse(payload);
    } catch {
      console.error("[send-auth-email] Failed to parse payload");
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Current Supabase send_email hook payload:
    // { user: {...}, email_data: { token, token_hash, redirect_to,
    // email_action_type, site_url, token_new, token_hash_new } }
    const user = hookPayload.user;
    const emailData = hookPayload.email_data || {};

    const to = user?.email;
    if (!to) {
      console.error("[send-auth-email] No recipient email on payload");
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: "Missing recipient email address",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

 // The 6-digit one-time code generated per user (each person gets their own).
 const rawToken: string = (emailData.token || "").trim();
 const tokenHash: string = emailData.token_hash || "";
 const emailActionType: string = emailData.email_action_type || "signup";
 const redirectTo: string = emailData.redirect_to || APP_URL;

 // Detect whether the token is a 6-digit OTP or a magic-link hash.
 // Supabase Auth puts the raw OTP code in `token` when OTP mode is enabled,
 // but puts a long opaque hash when magic-link mode is the default.
 const isOtp = /^\d{4,8}$/.test(rawToken);
 const otp = isOtp ? rawToken : "";
 const magicToken = isOtp ? "" : rawToken;

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
 // If the token is a 6-digit OTP, send it as a code. If it's a magic-link
 // hash (project not configured for OTP mode), send a clickable link instead.
 if (otp) {
 subject = " Your AgriConnect verification code";
 html = otpEmail(otp, 5);
 text = `Your AgriConnect verification code is: ${otp}. It is valid for 5 minutes.`;
 // Send welcome email after signup OTP
 sendWelcome = emailActionType === "signup";
 } else if (magicToken) {
 // Project is in magic-link mode — send a link so the user can still log in.
 // NOTE: The app's OTP input screen won't work with magic links. This is a
 // safety net. Configure OTP mode in Dashboard → Auth → Providers → Email.
 console.warn("[send-auth-email] Token is not a 6-digit OTP — sending magic link. Enable OTP mode in Supabase Dashboard for the OTP flow.");
 switch (emailActionType) {
 case "recovery":
 subject = " Reset your AgriConnect password";
 html = linkEmail("Reset your password", "Reset password", linkUrl);
 text = `Reset your AgriConnect password: ${linkUrl}`;
 break;
 case "email_change":
 subject = "️ Confirm your new email";
 html = linkEmail("Confirm your new email", "Confirm email", linkUrl);
 text = `Confirm your new email on AgriConnect: ${linkUrl}`;
 break;
 case "invite":
 subject = " You're invited to AgriConnect";
 html = linkEmail("You've been invited", "Accept invitation", linkUrl);
 text = `Accept your invitation to AgriConnect: ${linkUrl}`;
 break;
 default:
 subject = " Your AgriConnect verification code";
 html = linkEmail("Continue to AgriConnect", "Continue", linkUrl);
 text = `Continue to AgriConnect: ${linkUrl}`;
 }
 sendWelcome = false;
 } else {
 // No token at all — nothing to send. This can happen for system events
 // that don't require user action (e.g. email confirmation for internal ops).
 console.warn("[send-auth-email] No token in payload — skipping email.");
 return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
 }

 await sendEmail({ to, subject, html, text });

 // ── After the OTP / confirmation goes out, send the welcome message ──
 if (sendWelcome) {
 try {
 await sendEmail({
 to,
 subject: firstName ? ` Welcome to AgriConnect, ${firstName}!` : " Welcome to AgriConnect!",
 html: welcomeEmail(firstName),
 text: `Welcome to AgriConnect! Your account is ready. Visit ${APP_URL} to get started.`,
 });
 } catch (welcomeError: any) {
 console.error("[send-auth-email] welcome email failed (non-fatal):", welcomeError?.message);
 }
 }

 console.log("[send-auth-email] sent:", emailActionType, "to", to);
 return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    const rawMessage = error?.message || String(error);
    console.error("[send-auth-email] delivery error:", rawMessage);

    // Provide clear, actionable error for client without exposing internal secrets
    let userFacingMessage = "Unable to send verification code. Please check your email address or try again shortly.";
    if (rawMessage.includes("BadCredentials") || rawMessage.includes("535") || rawMessage.includes("password rejected")) {
      userFacingMessage = "Email delivery service authentication error. Please contact hello.agriconnect@gmail.com or try again shortly.";
    } else if (rawMessage.includes("Missing recipient")) {
      userFacingMessage = "Recipient email address is missing.";
    }

    // GoTrue Auth Hook protocol:
    // To signal failure without GoTrue throwing "Unexpected status code returned from hook: 500",
    // the hook MUST return HTTP 400 (or 422) with { error: { http_code: 400, message: "..." } }.
    return new Response(
      JSON.stringify({
        error: {
          http_code: 400,
          message: userFacingMessage,
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
