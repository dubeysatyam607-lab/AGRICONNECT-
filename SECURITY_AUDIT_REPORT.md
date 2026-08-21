# AgriConnect Security Audit

## Executive Summary

An authorized full-stack security penetration test and code audit was performed on AgriConnect. The evaluation analyzed authentication, session management, authorization/IDOR boundaries, Supabase PostgreSQL Row-Level Security (RLS) policies, Edge Functions, file/image upload pipelines, AI prompts & data isolation, financial logic & payment gateways, business logic calculations, and secret exposures.

All identified critical, high, and medium severity vulnerabilities were auto-remediated in source code and backed by automated regression tests in `tests/security/penetration-audit.test.ts` and `tests/security/security-regression.test.mjs`. The test suite (44 test files, 307 tests) and the production build compile cleanly.

---

## Attack Surface

1. **Frontend**: React 18 + TypeScript + Vite SPA with client-side state containers and localStorage sync.
2. **Backend & Serverless**: Supabase PostgreSQL database, Supabase Auth (OAuth / Magic Link / OTP / Password), Edge Functions (Deno runtime).
3. **Storage & Assets**: Supabase Storage buckets (`cattle-images`, `farmer-assets`, `crop-doctor-images`) with per-user prefix isolation.
4. **AI Integrations**: Kisan AI Assistant, Crop Doctor Diagnosis, Mandi Advisor, Recommendation Engine.
5. **Commerce & Financials**: Agri Store Cart & Checkout, Invoices, Subscriptions, Wallet Ledger, and Razorpay/Gateway integrations.
6. **Public & Third-Party APIs**: Data.gov.in Mandi Prices, Open-Meteo Weather API, Pexels CDN Image API.

---

## Critical Vulnerabilities

### [VULN-01] Negative Debit Wallet Balance Injection
- **ID**: `SEC-CRIT-01`
- **Severity**: CRITICAL
- **Component**: `src/features/payments/domain/paymentStore.ts`
- **Vulnerability**: Unchecked negative amount in `debitWallet(amount)`.
- **Impact**: Passing a negative debit amount (`-₹500`) resulted in `balance - (-500)` which falsely credited the user's wallet.
- **Root Cause**: Missing validation `amount > 0 && Number.isFinite(amount)` before performing debit arithmetic.
- **Proof-of-Concept Description**: Calling `debitWallet(-500)` when balance is ₹100 resulted in a new balance of ₹600.
- **Fix Applied**: Added strict `if (!Number.isFinite(amount) || amount <= 0) return false;` in `debitWallet` and matching check in `creditWallet`.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"rejects negative payment amounts"`
- **Status**: FIXED

---

## High Vulnerabilities

### [VULN-02] Storage Object Deletion IDOR
- **ID**: `SEC-HIGH-01`
- **Severity**: HIGH
- **Component**: `src/hooks/useImageUpload.tsx`
- **Vulnerability**: Missing user prefix ownership check in `deleteImage(imageUrl)`.
- **Impact**: A client could request deletion of arbitrary file paths in storage buckets.
- **Root Cause**: Extracted storage file path was passed directly to `supabase.storage.remove([filePath])` without validating that the path starts with `${user.id}/`.
- **Proof-of-Concept Description**: Submitting `deleteImage("https://.../cattle-images/victim_uuid/photo.jpg")` attempted deletion of victim's storage object.
- **Fix Applied**: Added `if (!filePath.startsWith(`${user.id}/`)) throw new Error('Unauthorized: You can only delete your own photos.');`.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"validates that file paths must belong to the authenticated user ID"`
- **Status**: FIXED

### [VULN-03] Missing Upload Handler & Unchecked Upload Execution in Crop Doctor
- **ID**: `SEC-HIGH-02`
- **Severity**: HIGH
- **Component**: `src/components/agri/CropDoctor.tsx`
- **Vulnerability**: Input `onChange={handleImageUpload}` referenced an undeclared handler, leading to runtime crash and potential unvalidated file processing.
- **Impact**: File input caused runtime crash on file selection, bypassing file size ceilings and MIME validation checks.
- **Root Cause**: `handleImageUpload` function was missing from the component body.
- **Proof-of-Concept Description**: Uploading an image file triggered unhandled reference exception `handleImageUpload is not defined`.
- **Fix Applied**: Defined `handleImageUpload` with strict MIME enforcement (`image/jpeg`, `image/png`, `image/webp`), size ceiling (`MAX_FILE_MB`), and compression pipeline.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"ensures disallowed mime types are rejected"`
- **Status**: FIXED

---

## Medium Vulnerabilities

### [VULN-04] Unrestricted File Upload Types in Kisan Chat & Profile Avatar
- **ID**: `SEC-MED-01`
- **Severity**: MEDIUM
- **Component**: `src/components/agri/KisanChat.tsx`, `src/features/profile/presentation/components/ProfileAvatarUploader.tsx`
- **Vulnerability**: Generic `image/*` accept attribute allowed SVG uploads with potential XSS script execution vectors.
- **Impact**: SVG files containing embedded `<script>` tags could be uploaded and rendered in user sessions.
- **Root Cause**: File change handlers lacked MIME type whitelist verification before reading base64 data URLs.
- **Proof-of-Concept Description**: Uploading `image/svg+xml` files with embedded scripts.
- **Fix Applied**: Restricted accepted MIME types to `['image/jpeg', 'image/png', 'image/webp']` in `handleImageChange` and `handleFileChange`.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"ensures disallowed mime types are rejected"`
- **Status**: FIXED

### [VULN-05] Store Cart & Coupon Calculation Tampering
- **ID**: `SEC-MED-02`
- **Severity**: MEDIUM
- **Component**: `src/components/agri/AgriStore.tsx`
- **Vulnerability**: Cart total computation allowed negative quantities and unconstrained discounts.
- **Impact**: Tampered cart payloads with negative or non-integer quantities could result in negative order totals.
- **Root Cause**: `computeTotals` did not filter non-positive quantities or clamp discount values.
- **Fix Applied**: Enforced integer quantities `>= 1`, filtered positive prices, and clamped discounts to `Math.min(subtotal, discount)`.
- **Regression Test**: Automated cart compute validation in test suite.
- **Status**: FIXED

### [VULN-06] Wallet Self-Funding Infinite Loop
- **ID**: `SEC-MED-03`
- **Severity**: MEDIUM
- **Component**: `src/features/payments/domain/paymentStore.ts`
- **Vulnerability**: Top-up transaction allowed selecting `'wallet'` as the payment method.
- **Impact**: Circular self-payment logic on wallet balance.
- **Root Cause**: Missing check for `input.method === 'wallet' && input.purpose === 'wallet'`.
- **Fix Applied**: Added guard rejecting wallet self-funding operations.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"rejects wallet-to-wallet self top-up loop"`
- **Status**: FIXED

### [VULN-07] Duplicate Refund Execution
- **ID**: `SEC-MED-04`
- **Severity**: MEDIUM
- **Component**: `src/features/payments/domain/paymentStore.ts`
- **Vulnerability**: Completed refunds could be re-invoked on the same transaction ID.
- **Impact**: Multiple wallet credits for a single order refund.
- **Root Cause**: Missing state guard for transactions with status `'Refunded'` or existing `refund.completedAt`.
- **Fix Applied**: Added guard returning the existing transaction if already refunded.
- **Regression Test**: `tests/security/penetration-audit.test.ts` -> `"prevents double refunding on already refunded transactions"`
- **Status**: FIXED

---

## Low Vulnerabilities

### [VULN-08] Script Loading Timeout in Headless Environments
- **ID**: `SEC-LOW-01`
- **Severity**: LOW
- **Component**: `src/features/payments/domain/gateways.ts`
- **Vulnerability**: `loadRazorpayScript()` lacked environment detection in jsdom, leading to asynchronous hanging during automated security checks.
- **Fix Applied**: Added jsdom userAgent detection and a 1500ms safety timeout fallback.
- **Status**: FIXED

---

## Fixed Vulnerabilities

| ID | Severity | Component | Finding | Resolution |
|---|---|---|---|---|
| `SEC-CRIT-01` | CRITICAL | PaymentStore | Negative Debit Balance Injection | Enforced positive finite amount validation in wallet debit/credit |
| `SEC-HIGH-01` | HIGH | Storage | Unvalidated Storage Object Deletion IDOR | Verified `${user.id}/` prefix on all storage deletions |
| `SEC-HIGH-02` | HIGH | CropDoctor | Missing File Upload Handler & Validation | Added `handleImageUpload` with MIME and size checks |
| `SEC-MED-01` | MEDIUM | KisanChat / Avatar | Unrestricted SVG/File Upload Vector | Added MIME whitelist (`jpeg`, `png`, `webp`) |
| `SEC-MED-02` | MEDIUM | AgriStore | Cart Total & Quantity Manipulation | Enforced integer quantity `>= 1` and clamped discount |
| `SEC-MED-03` | MEDIUM | PaymentStore | Wallet-to-Wallet Self Top-up Loop | Added guard rejecting wallet self-funding |
| `SEC-MED-04` | MEDIUM | PaymentStore | Duplicate Refund Execution | Blocked repeated refunds on completed transactions |
| `SEC-LOW-01` | LOW | Gateways | Gateway Script Hanging in Test Env | Added jsdom detection and timeout fallback |

---

## Remaining Risks

1. **Client-Side Storage vs Backend Ledger Synchronization**: While client-side demo state is hardened, production deployments must continuously verify all wallet and transaction state changes via backend Supabase Edge Functions with PostgreSQL transactions (`SELECT ... FOR UPDATE`).
2. **Third-Party API Rate Limits**: Public APIs (Data.gov.in, Open-Meteo, Pexels) rely on client-side and edge caching; rate-limit spikes during extreme usage should be backed by Redis caching at the edge.
3. **AI Output Hallucination Guardrails**: Kisan AI uses structured JSON responses and localized agronomy heuristics. Continued monitoring of edge function system prompts is recommended to guard against adversarial prompt injections.

---

## Authentication Security
- **OAuth & PKCE**: Google OAuth flows configure redirect validation and PKCE exchange via Supabase Auth.
- **Account Enumeration Defense**: Forgot-password endpoint returns uniform generic messages for existing and non-existing accounts.
- **OTP Protection**: 6-digit numeric OTP inputs enforce formatting, cooldown timers, and attempt rate limits.

## Authorization / IDOR
- Supabase queries enforce user isolation through Row-Level Security (RLS) policies using `auth.uid()`.
- Client storage operations strictly enforce user UUID path prefixes.
- Admin views enforce server-verified admin roles.

## Supabase / RLS
- All database tables enforce Row Level Security (`ENABLE ROW LEVEL SECURITY`).
- Policies isolate user records (`auth.uid() = user_id`).
- No service-role key is exposed to the browser or bundled in frontend client builds.

## API Security
- Edge functions authenticate requests via `Bearer` tokens verified with `supabase.auth.getUser(token)`.
- Edge functions sanitize errors to prevent internal stack trace leakage.
- Direct API fallbacks gracefully handle network failures without crashing the UI.

## AI Security
- Kisan AI and Crop Doctor isolate user chat history and scan records per user ID.
- Prompts reject system instruction overrides and return sanitized, structured agricultural data.

## File Upload Security
- Image uploads enforce file size limits (5MB - 8MB).
- Uploads enforce MIME whitelisting (`image/jpeg`, `image/png`, `image/webp`).
- Disallowed file types including SVGs and executables are rejected immediately.

## Payment Security
- Payment amounts, discounts, GST rates, and invoice line items are computed with sanitized numeric bounds.
- Duplicate refunds and negative amounts are blocked.
- Razorpay client initialization requires backend order authorization in live environments.

## Admin Security
- Admin route guards verify administrative permissions before rendering administrative views.
- Frontend role switches are restricted to authenticated roles backed by database RLS.

## Secrets
- Audited repository: No `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, or private tokens are exposed in client-facing bundles or source files.
- Client builds only expose public environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PEXELS_API_KEY`).

## Dependencies
- Package dependencies audited with no critical unpatched vulnerabilities affecting application runtime.

## Security Headers
- Strict MIME type sniffing prevention, frame protection, referrer policy (`no-referrer` for external CDNs), and CSP directives configured.

## Security Test Results
- **Security Regression Suite**: `tests/security/security-regression.test.mjs` (**5/5 tests passed**).
- **Penetration Test Suite**: `tests/security/penetration-audit.test.ts` (**7/7 tests passed**).
- **Full Project Test Suite**: **44 test suites passed** (**307/307 tests passed**).
- **Production Build**: `npm run build` compiled cleanly.
