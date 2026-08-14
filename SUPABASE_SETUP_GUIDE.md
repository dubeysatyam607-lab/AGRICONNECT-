# AgriConnect - Supabase Edge Functions Configuration Guide

## 🔑 Required Environment Variables (Set in Supabase Dashboard)

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Environment Variables**

### 1. AI Provider Keys (At least ONE required for Kisan Chat & Crop Scan)

| Variable | Value | Source |
|----------|-------|--------|
| `GEMINI_API_KEY` | `your_gemini_key_here` | https://makersuite.google.com/app/apikey (Recommended) |
| `OPENAI_API_KEY` | `sk-your_openai_key_here` | https://platform.openai.com/api-keys (Alternative) |
| `LOVABLE_API_KEY` | `your_lovable_key_here` | Legacy Lovable gateway |

**Priority order:** Gemini → OpenAI → Lovable

### 2. Email (for OTP/Auth emails via `send-auth-email`)

| Variable | Value | Source |
|----------|-------|--------|
| `EMAIL_PROVIDER` | `gmail` or `resend` | Default: gmail |
| `EMAIL_HOST` | `smtp.gmail.com` | Gmail SMTP |
| `EMAIL_PORT` | `465` | SSL port |
| `EMAIL_USER` | `your_email@gmail.com` | Your Gmail address |
| `EMAIL_PASS` | `your_16_char_app_password` | **Gmail App Password** (not login password!) |
| `EMAIL_FROM` | `AgriConnect <your_email@gmail.com>` | Display name |

**OR use Resend (requires verified domain):**
| Variable | Value | Source |
|----------|-------|--------|
| `EMAIL_PROVIDER` | `resend` | |
| `RESEND_API_KEY` | `re_your_resend_key_here` | https://resend.com/api-keys |
| `EMAIL_FROM` | `AgriConnect <hello@yourdomain.com>` | Must be verified in Resend |

### 3. Hook Secret (Required for `send-auth-email`)

| Variable | Value | Source |
|----------|-------|--------|
| `SEND_EMAIL_HOOK_SECRETS` | `v1,whsec_xxxxxxxxxxxxxxxxxxxx` | **Supabase Dashboard → Authentication → Hooks → send_email → Copy Secret** |

### 4. Voice/TTS (for voice output in Kisan Chat)

| Variable | Value | Source |
|----------|-------|--------|
| `ELEVEN_LABS_API_KEY` | `sk_your_key_here` | https://elevenlabs.io/app/keys |
| `ELEVEN_LABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | Default voice (Rachel) |

### 5. CORS & App URL

| Variable | Value |
|----------|-------|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:8000,https://agriconnect.in,https://www.agriconnect.in` |
| `APP_URL` | `https://agriconnect.in` |

---

## 🚀 Deploy All Edge Functions

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref yrebxnpilkfeaofykvhq

# Deploy all functions
supabase functions deploy

# Or deploy individually:
supabase functions deploy send-auth-email
supabase functions deploy kisan-chat
supabase functions deploy crop-doctor
supabase functions deploy mandi-prices
supabase functions deploy weather
supabase functions deploy nearby-services
supabase functions deploy scheme-finder
supabase functions deploy send-push-notification
supabase functions deploy send-notification-email
supabase functions deploy tractor-hire
supabase functions deploy wallet
supabase functions deploy agri-market
supabase functions deploy agri-news
supabase functions deploy contact-seller
supabase functions deploy price-alert-worker
```

---

## ⏰ Set Up Price Alert Worker Cron

The price alert worker needs to be called periodically (every 15-30 min).

### Option A: pg_cron (Supabase Database)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule price alert check every 30 minutes
SELECT cron.schedule(
  'price-alert-worker',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yrebxnpilkfeaofykvhq.supabase.co/functions/v1/price-alert-worker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Option B: External Cron (GitHub Actions, Cron-job.org, etc.)

```bash
# Add to crontab or GitHub Actions workflow
*/30 * * * * curl -X POST "https://yrebxnpilkfeaofykvhq.supabase.co/functions/v1/price-alert-worker" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Get Service Role Key:** Supabase Dashboard → Project Settings → API → `service_role` key

---

## 📧 Enable Auth Email Hook

1. Go to **Supabase Dashboard → Authentication → Hooks**
2. Find **`send_email`** hook
3. Enable it
4. Set **Hook URL**: `https://yrebxnpilkfeaofykvhq.supabase.co/functions/v1/send-auth-email`
5. Copy the **Secret** (format: `v1,whsec_xxx`)
6. Add to Edge Function env vars as `SEND_EMAIL_HOOK_SECRETS`

---

## 🗄️ Required Database Tables (Run Migrations)

```bash
# Push all migrations
supabase db push

# Or run specific ones:
supabase migration up
```

Key tables needed:
- `price_alerts` (for price alerts)
- `tractor_listings` (for tractor marketplace)
- `cattle_listings` (for cattle marketplace)
- `push_subscriptions` (for push notifications)
- `wallets` + `wallet_transactions` (for wallet)
- `ai_conversations` + `ai_messages` (for chat memory)
- `crop_scans` (for crop doctor history)
- `weather_cache` (for weather caching)

---

## ✅ Verification Checklist

After setup, test each:

| Feature | Test Command | Expected |
|---------|--------------|----------|
| Mandi Prices | `curl -X POST .../mandi-prices -d '{"searchQuery":"wheat"}'` | Real prices from data.gov.in |
| Weather | `curl -X POST .../weather -d '{"latitude":28.6139,"longitude":77.2090}'` | Live weather from Open-Meteo |
| Kisan Chat | `curl -X POST .../kisan-chat -d '{"messages":[{"role":"user","content":"test"}]}'` | AI response (not fallback) |
| Crop Doctor | `curl -X POST .../crop-doctor -H "Authorization: Bearer <token>" -d '{"imageBase64":"..."}'` | Diagnosis JSON |
| Auth Email | Trigger signup in app | OTP email received |
| Push Notif | `curl -X POST .../send-push-notification -H "Authorization: Bearer <token>" -d '{"type":"price_alert","title":"Test","body":"Test"}'` | Push sent |

---

## 🔧 Local Development

```bash
# Copy env files
cp .env.example .env
cp server/.env.example server/.env

# Fill in your real keys in .env files

# Start frontend
npm run dev

# Start backend (in separate terminal)
cd server && npm start

# Test endpoints:
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","password":"password123"}'
```

---

## 📋 Environment Variable Summary

### Root `.env` (Frontend/Client)
```env
VITE_SUPABASE_URL=https://yrebxnpilkfeaofykvhq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_MANDI_API_KEY=your_govt_data_api_key
VITE_OPEN_WEATHER_API_KEY=your_openweather_key
VITE_NEWS_API_KEY=your_newsapi_key
VITE_PEXELS_API_KEY=your_pexels_key
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
VITE_FIREBASE_VAPID_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
VITE_PAYMENT_BACKEND_URL=http://localhost:5000/api
RESEND_API_KEY=re_your_key
EMAIL_FROM=AgriConnect <hello@yourdomain.com>
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=sk-your_openai_key
ELEVEN_LABS_API_KEY=sk_your_elevenlabs_key
ELEVEN_LABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=centralindia
OPEN_WEATHER_API_KEY=your_openweather_key
GOVT_DATA_API_KEY=your_govt_data_api_key
JWT_SECRET=your_long_random_secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,https://agriconnect.in
```

### Server `.env` (Backend API)
```env
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,https://agriconnect.in
JWT_SECRET=your_long_random_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
RESEND_API_KEY=re_your_key
EMAIL_FROM=AgriConnect <hello@yourdomain.com>
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=sk-your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVEN_LABS_API_KEY=your_elevenlabs_key
ELEVEN_LABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
AZURE_REGION=centralindia
AZURE_TTS_KEY=your_azure_key
AZURE_VOICE_NAME=hi-IN-MadhurNeural
OPEN_WEATHER_API_KEY=your_openweather_key
GOVT_DATA_API_KEY=your_govt_data_api_key
NEWS_API_KEY=your_newsapi_key
WHATSAPP_WEBHOOK_TOKEN=your_random_token
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
SUPABASE_URL=https://yrebxnpilkfeaofykvhq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_PUBLIC_KEY=your_vapid_public_key
```

---

## 🎯 Priority Order

1. **GEMINI_API_KEY** - Enables Kisan Chat & Crop Scan (core AI features)
2. **EMAIL credentials** - Enables OTP registration/password reset
3. **SEND_EMAIL_HOOK_SECRETS** - Required for Supabase Auth emails
4. **VAPID keys** - Enables push notifications
5. **ELEVEN_LABS_API_KEY** - Enables voice output
6. **GOVT_DATA_API_KEY** - Already working in your project ✅
7. **Razorpay live keys** - For production payments

---

**Need help?** Check Supabase Edge Function logs: Dashboard → Functions → [function] → Logs