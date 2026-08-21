# AgriConnect — Live Production Feature Health Report

This report documents the live production readiness audit across all application modules, testing UI → frontend logic → API → backend → database → response → UI.

---

### 1. Authentication (Google Auth, Email OTP, Magic Link, Sessions)
- **Feature**: Google Auth, Email Auth, Magic Link, OTP, Password Reset, Sessions & Protected Routes
- **Status**: WORKING
- **Error**: Potential token leakage in browser history during OAuth redirect callback.
- **Root Cause**: Hash/query parameters containing authorization tokens remained in the browser address bar after redirection.
- **Fix**: Implemented `window.history.replaceState(null, '', window.location.pathname)` immediately in `AuthCallback.tsx` after session extraction; enforced PKCE code exchange with Supabase Auth.
- **Regression Test**: `src/pages/auth/AuthCallback.test.tsx` -> `"cleans up hash and query parameters from history"`, `src/features/auth/presentation/forgotpassword.test.tsx` (7 tests)

---

### 2. First-Time vs Returning User Onboarding Journey
- **Feature**: Farmer Onboarding & Profile Persistence
- **Status**: WORKING
- **Error**: Returning users previously risked repeating full onboarding steps if session flag was lost.
- **Root Cause**: Onboarding completion check relied on volatile local state rather than database record `onboarding_completed`.
- **Fix**: Synced `onboarding_completed` flag from Supabase `profiles` table upon login; first-login collects complete farmer profile (Name, Mobile, State, District, Village, Land Size, Crops, Consent) and persists directly to PostgreSQL; second-login automatically bypasses onboarding.
- **Regression Test**: `src/features/auth/presentation/welcomeflow.test.tsx` -> `"sends returning farmers who already onboarded straight to login"`, `src/features/auth/presentation/onboarding/steps.test.tsx` (8 tests)

---

### 3. Authorization, Data Isolation & Admin Security
- **Feature**: User Data Isolation, IDOR Prevention, Server-Side Admin Control
- **Status**: WORKING
- **Error**: Storage object deletion lacked user ID verification, allowing potential deletion of other users' uploads.
- **Root Cause**: `deleteImage(url)` in `useImageUpload.tsx` passed raw file paths without verifying `${user.id}/` prefix ownership.
- **Fix**: Added strict ownership validation `if (!filePath.startsWith(`${user.id}/`)) throw new Error('Unauthorized')` in `useImageUpload.tsx`; database RLS policies enforce `auth.uid() = user_id`; admin role verified server-side in `RequireAdmin.tsx` via JWT claims and RLS.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"validates that file paths must belong to the authenticated user ID"`, `src/core/auth/requiradmin.test.tsx` (2 tests)

---

### 4. Kisan AI Assistant & Context Engine
- **Feature**: Kisan AI Chat, Agronomy Context & Speech Engine
- **Status**: WORKING
- **Error**: Generic prompt responses without real Mandi APMC data integration or localized crop context.
- **Root Cause**: Heuristics did not distinguish between live real-time API prices and benchmark reference prices, with missing voice TTS fallbacks.
- **Fix**: Integrated farm context (farmer's state, crop, land size) into Kisan AI prompts; configured live Data.gov.in integration with fallback to local agronomy engine (`local-advisor.ts`); added explicit data-source transparency ("Data.gov.in Verified Live" vs "APMC Benchmark Reference"); implemented sanitized Web Speech synthesis.
- **Regression Test**: `local-advisor.test.ts` (11 tests), `src/lib/local-advisor.test.ts` (10 tests), `src/core/voice/voiceEngine.test.ts` (20 tests)

---

### 5. Crop Doctor & AI Scan Diagnostics
- **Feature**: Crop Leaf Disease Diagnosis & Scan History
- **Status**: WORKING
- **Error**: Runtime exception `handleImageUpload is not defined` when uploading images via the file input.
- **Root Cause**: `handleImageUpload` function was missing from the component body in `CropDoctor.tsx`.
- **Fix**: Added `handleImageUpload` with MIME type enforcement (`image/jpeg`, `image/png`, `image/webp`), size ceiling (`MAX_FILE_MB = 8`), and client-side HTML5 canvas compression before Edge Function dispatch; scan records saved to `ai_scans` table partitioned by `user_id`.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"ensures disallowed mime types are rejected"`, `src/lib/image-resolver.test.ts` (9 tests)

---

### 6. Live Mandi Market & APMC Prices
- **Feature**: Real-Time Mandi Prices, Search, Filters & Alerts
- **Status**: WORKING
- **Error**: Missing crop imagery on custom commodities and offline network dropouts.
- **Root Cause**: Hardcoded asset URLs for rare commodities failed to load; API errors showed blank screens.
- **Fix**: Integrated dynamic Pexels CDN image resolution for all commodities in `pexels-api.ts`; added multi-resource failover between Data.gov.in endpoints and Edge Function `mandi-prices`; cached last-known verified prices in localStorage for offline resilience.
- **Regression Test**: `src/lib/mandi-api.test.ts` (4 tests), `src/lib/pexels-api.test.ts` (5 tests)

---

### 7. Agri Store & Financial Commerce
- **Feature**: Product Catalog, Cart, Checkout, Invoices & Wallet
- **Status**: WORKING
- **Error**: Negative debit amount injection in wallet and potential cart price/quantity tampering.
- **Root Cause**: `debitWallet(amount)` did not validate `amount > 0`, allowing negative debit values to credit balances; `computeTotals` did not clamp non-integer or negative quantities.
- **Fix**: Added strict validation `if (!Number.isFinite(amount) || amount <= 0) return false;` in `paymentStore.ts`; clamped cart quantities to integers `>= 1`; bounded coupon discounts; blocked circular wallet self-top-up loops and duplicate refunds.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"rejects negative payment amounts"`, `"prevents double refunding on already refunded transactions"`

---

### 8. Weather & Hyperlocal Spray Advisory
- **Feature**: Live Weather, 7-Day Forecast, Rainfall Radar & Spray Window
- **Status**: WORKING
- **Error**: Potential application crashes when GPS location permission was denied.
- **Root Cause**: `LocationContext` threw uncaught errors when `navigator.geolocation` failed without fallback defaults.
- **Fix**: Provided graceful fallback to state capital default coordinates upon permission denial or offline state; live sync powered by Open-Meteo API without fabricating weather data.
- **Regression Test**: `src/location-repro.test.tsx` (1 test), `src/app-provider-repro.test.tsx` (1 test)

---

### 9. Tractor & Farm Equipment Marketplace
- **Feature**: Tractor Listings, Hire Requests & Owner Direct Contact
- **Status**: WORKING
- **Error**: None - Verified functional.
- **Root Cause**: N/A
- **Fix**: Equipment listings backed by Supabase `farm_equipment` table with RLS; verified owner badges and direct call/WhatsApp integration.
- **Regression Test**: `tractor_market.test.ts` (3 tests)

---

### 10. Crop Calendar & Timeline Planner
- **Feature**: Crop Growth Lifecycle, Sowing-to-Harvest Stages
- **Status**: WORKING
- **Error**: None - Verified functional.
- **Root Cause**: N/A
- **Fix**: Dynamic timeline rendering across 20+ Indian crops; automatically preselects farmer's primary crop from profile; guest users default to Wheat.
- **Regression Test**: `src/components/agri/CropCalendar.test.tsx` (3 tests), `src/components/agri/cropTimelineData.test.ts` (5 tests)

---

### 11. Government Schemes & Subsidy Finder
- **Feature**: Central & State Scheme Eligibility & Direct Links
- **Status**: WORKING
- **Error**: None - Verified functional.
- **Root Cause**: N/A
- **Fix**: Structured database of official Indian schemes (PM-Kisan, PMFBY, KCC, Solar Subsidies) with category filters, search, and direct portal links without false government certification claims.
- **Regression Test**: `src/lib/government-schemes.test.ts` (4 tests)

---

### 12. Farmer Profile & KYC Verification
- **Feature**: Profile Editing, KYC Simulation (Aadhaar & KCC Linkage)
- **Status**: WORKING
- **Error**: Avatar uploader permitted arbitrary SVG uploads with potential XSS vectors.
- **Root Cause**: File input in `ProfileAvatarUploader.tsx` lacked MIME whitelist verification.
- **Fix**: Enforced `image/jpeg`, `image/png`, `image/webp` whitelist in `ProfileAvatarUploader.tsx`; profile updates persist to `profiles` and `farmer_kyc` tables.
- **Regression Test**: `src/features/profile/presentation/views/FarmerKYCVerificationView.test.tsx` (3 tests), `src/features/profile/domain/models/FarmerKYC.test.ts` (9 tests)

---

### 13. Multilingual Engine & Internationalization
- **Feature**: Global Language Switch (Hindi, English & Regional Locales)
- **Status**: WORKING
- **Error**: None - Verified functional.
- **Root Cause**: N/A
- **Fix**: `LanguageContext` synchronizes translations across all screens, navigation, forms, modals, toasts, empty states, and AI prompt formatting.
- **Regression Test**: `src/i18n/journey/index.test.ts` (16 tests), `language-context.test.ts` (8 tests)

---

### 14. Universal Resilient Image System (`<AgriImage>`)
- **Feature**: Dynamic Image Loading, Fallbacks & Pexels CDN Resolution
- **Status**: WORKING
- **Error**: Broken placeholder images when only crop/product names were provided without static assets.
- **Root Cause**: Unmapped commodities displayed broken browser 404 icons.
- **Fix**: Enhanced `<AgriImage>` to dynamically query Pexels API and curated high-definition Pexels CDNs by crop/product name; renders loading skeletons and graceful SVG fallbacks with `referrerPolicy="no-referrer"`.
- **Regression Test**: `src/lib/pexels-api.test.ts` (5 tests), `src/lib/image-resolver.test.ts` (9 tests)

---

### 15. Legal Compliance & Data Privacy
- **Feature**: Privacy Policy, Terms, Cookie Consent & Data Declarations
- **Status**: WORKING
- **Error**: None - Verified functional.
- **Root Cause**: N/A
- **Fix**: Dedicated legal routes (`/privacy`, `/terms`, `/data-declaration`) with explicit third-party API disclosures, AI advisories, and data retention policies.
- **Regression Test**: `seo-config.test.ts` (9 tests), `seo-head.test.ts` (11 tests)
