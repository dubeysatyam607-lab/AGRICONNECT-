# Competitor Design Research — Indian AgriTech / Farm-Product UI

*Reference for the AgriConnect premium redesign. Research compares **UI/UX craft, icon systems, visual hierarchy, and farmer-first trust signals** of leading Indian agritech products — not revenue or feature counts. No product is ranked "winner"; each is mined for transferable design principles.*

---

## 1. AgroStar — Farmers' network-first marketplace

**Craft strengths (patterns to adopt)**
- **Large, legible product imagery** with rounded corners and minimal chrome; photos (not illustration) dominate so a low-literacy farmer instantly identifies the item.
- **Price + subsidy + packet-size as the primary metadata row** — the farmer's buying decision hinges on these three numbers.
- Commodity category icons are **flat line pictograms** (tractor, sprayer, seeds) — consistent stroke, no color noise.
- A single bold "Engage" CTA color (their saffron/orange) is used *only* for purchase — reserved accent discipline.
- Trust marks (brand, "100% genuine", MRP strikethrough) live directly on the product card.

**Anti-patterns / things to avoid**
- Dense deal banners with clashing colors can read as "clip-art". We will never mix saturated backgrounds arbitrarily.
- Their UI leans Hindi-only-first; AgriConnect must stay 12-language parallel without losing layout quality.

**Transfer to AgriConnect:** photo-first commodity cards + reserved CTA accent + metadata-first card layout (already done in Mandi/Store/Services surfaces).

## 2. Ninjacart — B2B supply-chain operational polish

**Craft strengths**
- **Extremely tight data density** done well: tables with crisp dividers, aligned numbers, monospace-ish rupee figures.
- Status-driven rows (In-transit / Delivered) use **color semantics, not icons**: green = healthy, amber = attention, red = issue, with a single small glyph.
- Clean warehouse/location model communicated with map chips, not illustrations.

**Transfer to AgriConnect:** our Mandi price list and order tables adopt their numeric alignment + colour-semantic status dots; we removed emoji status badges in favor of lucide status glyphs.

## 3. DeHaat — advisory + ecosystem trust

**Craft strengths**
- Advisory cards are **text-first, icon-light**: a short headline, one accent pill, plain body copy. The *information* carries the weight, not decoration.
- Consistent use of a single brand-green for interactive affordances and a warm neutral for content cards.
- "Doctor / expert" surfaces use a **persona avatar** (human, not a sparkle robot) to build trust for crop-doctor — trusted-human branding beats AI-branding here.

**Transfer to AgriConnect:** our AI insights use a calm, human farmer persona + a single AI accent, replacing robot/sparkle emoji branding; advisory blocks follow text-first composition.

## 4. Bijak — mandi pricing transparency

**Craft strengths**
- **Real numbers first**: tonnage, price per quintal, city — formatted with heavy numerals and deliberate spacing. No ornament competes with the figure.
- Category filter chips: simple pill buttons, one active state, high tap targets.
- Price-update "pulse" via a subtle live indicator reinforces freshness without motion spam.

**Transfer to AgriConnect:** mandi/weather live badges use a restrained amber-emerald pulse; figures are `tabular-nums` with large weight (done in WeatherWidget + MandiPriceList).

## 5. Gramophone / AgroStar Bazaar — crop-care-content brands

**Craft strengths**
- Content cards: one image, one bold headline, eyebrow label, one CTA. Consistent 2-column rhythm. Hierarchy via scale + weight, not color.
- *Seasonal* bands (kharif/rabi) tinted subtly per crop, forming a calm legend used throughout the calendar/calendar surfaces — a "system color", not decoration.

**Transfer to AgriConnect:** CropCalendar season chips reuse the same forest/amber/sky system tints across screens so colour becomes a language.

## 6. Kisan Call Center / IVR & WhatsApp-based farm services

**Craft strengths**
- Voice-first farmers interact by *speaking*; the UI merely confirms. Language veil (Hindi/marathi/etc.) is the default, English secondary.
- Minimal text, maximum spacing, large touch targets — one action per screen.

**Transfer to AgriConnect:** we treat multilingual copy as first-class (12 languages), keep in-app voice input visible on every agri surface, and keep one-primary-action screens on mobile.

## 7. Govt-facing treat: Digit/UPI & Aadhaar UX patterns

**Craft strengths**
- Progressive disclosure for identity: "verify" flows keep inputs minimalhol with strong confirm-to-entity chips.
- **Lock + shield = encryption trust**; consistent subtle lock glyph rather than ⚠️/decorative emoji.
- Confirmation screens are high-MotionCelebrate but **not** emoji-festooned.

**Transfer to AgriConnect:** KYC/Aadhaar screens use lucide lock/shield with calm success states; we've swept decorative emojis from CompleteProfile/Pricing/AuthWrappers to keep trust signals crisp.

---

## Cross-product "design system" synthesis (adopted)

| Principle | Where applied in AgriConnect |
|---|---|
| Foto-first product cards | Store, Cattle, Machinery, Services cards |
| Reserved accent (single CTA green) | All primary buttons `bg-forest` |
| Tabular numerals for ₹/temps | MandiPriceList, WeatherWidget |
| Color-as-language legend | kharif/rabi/zaid tints, category chips |
| Trust glyphs (lock/shield/badge) not emoji | KYC, profile, pricing badges |
| Status = color + small lucide glyph | Offline/Error/Empty/Retry states |
| Text-first advisory, low ornament | Crop advisor, schemes descriptions |
| Human persona for farming AI | Kisan Chat assistant avatar |

## Explicitly *rejected* from all products
- Decorative / AI-slop emoji as feature icons, section icons, status badges, nav icons, cards, empty states (removed across product UI; see AGRIConnect_DESIGN_AUDIT.md).
- Rainbow gradient carousels; clashing alert colors; illustrated stock "clip-art" banners.
- Uncontrolled motion (we use one live-pulse + reduced-motion guard).

---

*Compiled from public product usage; scores/learnings are editorial design observations for AgriConnect's internal redesign, not an endorsement.*
