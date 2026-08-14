# AgriConnect — Bharat Krishi

An Indian farmer-first web app: live mandi prices, weather + alerts, Kisan Sahayak (AI chat), Crop Doctor, tractor hire, schemes, agri store, farmer community, offline support, and a 12-language UI.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, shadcn-ui
- **Data/Backend**: Supabase (Postgres, Auth, Edge Functions on Deno)
- **State/Data layer**: React Query (TanStack), feature-based datasources with offline fallbacks
- **PWA**: service worker with build-hash-versioned caches + full offline navigation
- **Tests**: Vitest + Testing Library (JSDOM)

## Getting started

```sh
npm install
npm run dev
```

The dev server runs on the port shown by Vite (default `5173`).

## Environment variables

Copy `.env.example` to `.env` and fill in what you need. Every variable is optional except the Supabase pair; the app degrades gracefully (offline mock fallbacks) when integrations are unset.

### Vite (client, `VITE_`-prefixed — exposed to the browser)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (required) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (required) |
| `VITE_MAPBOX_TOKEN` | Mapbox access token for mandi/market maps |
| `VITE_OPEN_WEATHER_API_KEY` | OpenWeatherMap key (client-side direct fetch) |
| `VITE_MANDI_API_KEY` | data.gov.in key (client-side direct APMC feed) |
| `VITE_GA4_ID` / `VITE_GTM_ID` | Google Analytics 4 / Tag Manager IDs (SEO & analytics) |
| `VITE_ENABLE_ANALYTICS` | Force-enable analytics events outside production |

### Supabase Edge Functions (server-side, `Deno.env`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth/JWT validation |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access (never expose to the client) |
| `JWT_SECRET` | Auth token signing secret — **required in production** |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist, enforced by the edge functions |
| `OPEN_WEATHER_API_KEY` | Server-side OpenWeatherMap key (weather function) |
| `GOVT_DATA_API_KEY` | data.gov.in key (mandi-prices function) |
| `LOVABLE_API_KEY` | AI gateway key (kisan-chat, crop-doctor) |
| `RESEND_API_KEY` | Resend key (send-notification-email) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys (send-push-notification) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | SMTP (TTS/notification server) |
| `ELEVEN_LABS_API_KEY` / `ELEVEN_LABS_VOICE_ID` | TTS voice (optional, ElevenLabs) |
| `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` | TTS fallback (optional, Azure) |

## Localization

The UI ships in 12 Indian languages (`en, hi, mr, gu, pa, ta, te, kn, ml, bn, or, as`), stored in `src/i18n/translations.ts`. All locales are complete (92 keys, enforced by `language-context.test.tsx`); selection persists in `localStorage['app-language']` and sets `document.documentElement.lang`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `vite build` **then** injects precache assets into `public/sw.js` via `scripts/build-sw.mjs` |
| `npm run build:dev` | Development-mode build |
| `npm test` | Vitest suite (45 tests across 7 files) |
| `npm run lint` | ESLint (0 errors) |
| `npm run preview` | Serve the production build locally (`vite preview`) |
| `npm run server` | Local TTS server (`server/tts.js`) |

## Edge Functions

All 12 functions live in `supabase/functions/`: `weather`, `mandi-prices`, `kisan-chat`, `crop-doctor`, `nearby-services`, `scheme-finder`, `agri-market`, `tractor-hire`, `contact-seller`, `send-notification-email`, `send-push-notification`, plus `_shared/` helpers (auth-validator, rate-limiter, validators, audit-logger).

Deploy with the Supabase CLI:

```sh
npx supabase functions deploy --project-ref <PROJECT_ID> weather mandi-prices kisan-chat
```

Key security behaviors (verified by the Phase-8 audit):
- Auth: JWT verified server-side via `auth-validator.ts`; mutating paths require a valid token (e.g. `tractor-hire` only persists bookings when authenticated).
- CORS: `ALLOWED_ORIGINS` is enforced — disallowed origins are not echoed back.
- Rate limiting: persisted per-IP/per-user in the `rate_limits` table (`rate-limiter.ts`).
- Secrets: only via `Deno.env`; no hardcoded keys; SQL goes through the Supabase query builder (no string interpolation).
- Input: Zod schemas validate every body (`validators.ts`).

## Deploying

Netlify (or any static host) — SPA routing, caching and the PWA are already configured:

- `public/_redirects` — `/* /index.html 200` so deep links (SEO routes) resolve.
- `public/_headers` — `/assets/*` served `immutable` (long-lived cache).
- The build output `dist/` includes the hashed `sw.js` and full `sitemap.xml` + `sitemap-images.xml`.

1. `npm run build`
2. Point your host at the `dist/` directory with a `/* → /index.html` SPA fallback.
3. Set the Supabase + edge-function env vars above in your host's environment.
4. Deploy the edge functions and run the DB migrations (`supabase/migrations/`).

### Email OTP hook (required for auth sign-in)

Supabase Auth is configured to call the `send-auth-email` edge function as its SMTP custom
hook (`SEND_EMAIL_HOOK`). If this function is not deployed/reachable, `POST /auth/v1/otp`
fails with `422 hook_timeout` and **no one can sign in with an email OTP**.

```sh
npx supabase functions deploy --project-ref <PROJECT_ID> send-auth-email
npx supabase secrets set --project-ref <PROJECT_ID> SEND_EMAIL_HOOK_SECRETS='{"api_key":"..."}'
```

The hook reads an `api_key` (and optionally SMTP/Resend config) from
`SEND_EMAIL_HOOK_SECRETS`. See `supabase/functions/send-auth-email/index.ts`. Also confirm
`auth.email.enable_signup` and the hook toggle under **Auth → Hooks** in the dashboard.

### Edge-function JWT enforcement

All edge functions declare `verify_jwt = true` in `supabase/config.toml`. Until a fresh
`supabase functions deploy` is pushed, previously deployed copies keep their old config and
may still accept any project anon key without a user token. After deploying, verify that
unauthenticated requests to mutating functions return `401` (see
`supabase/functions/_shared/auth-validator.ts`).

## Offline behavior

`public/sw.js` is build-hash versioned (`static-<hash>` / `dynamic-<hash>`). It precaches the built assets, serves navigations with `navigationFirst`, and falls back to `/index.html` so the full app — including deep links — works offline. A 80-entry LRU bound keeps the dynamic cache from growing unbounded.

## Known limitations

- `send-push-notification` currently logs sends rather than calling a web-push endpoint (VAPID wiring stubbed).
- `TractorList.tsx` / `TractorCard.tsx` are legacy; the app renders `TractorMarket.tsx` (edge-function backed) instead.
- `src/lib/mock-data.ts` powers offline/home-preview fallbacks only; live screens prefer edge functions first.
