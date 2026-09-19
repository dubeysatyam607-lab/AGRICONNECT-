# AgriConnect — Emoji & Visual-Integrity Audit (v1)

*What we audited, what we changed, what the seam of work was, and what remains (flagged as P2/P3). Sibling doc: `COMPETITOR_DESIGN_RESEARCH.md`.*

## 1. Why we swept emojis (the standing rule)
Emojis are **content**: they belong in prose, not in the product's *icon system*. In a premium human product an emoji must never carry a feature's identity — as nav/button/section icons, status badges, category glyphs, card icons, empty-state art, or a "magic AI" decorative personality. Those jobs belong to the lucide icon set (already installed, weight-web, a11y-friendly `aria-hidden` glyphs) plus the brand palette. We also reject "AI-slop" visual habits — rainbow gradients, decorative robot personalities, clip-art banners, and cluttered badges.

## 2. Inventory & mapping (the principled seam)
The codebase keeps **content** and **icon** in the same string fields (`emoji`). We did *not* delete the data; we re-rendered each field through the **lucide icon th池** at the presentation layer. That keeps i18n JSON + data models untouched (tests stay green) while changing what users see.

Conversion strategy used:
- **Shared primitives → lucide defaults** (`EmptyState` default `🌾`→`Sprout`, `OfflineState` `📡/✅`→`WifiOff/Wifi`, `RetryState` `⚠️`→`TriangleAlert`, error-state `EmptyState`→`Sprout`).
- **Brand/top screens:** `main.tsx` error fallback `🌱`→inline sprout SVG; `NotFound` quick-links → lucide; `StateLanding` feature chips (`📊🤖🗣️`→`LineChart`/`Bot`/`Speech`); `Pricing` decorative text emojis removed; `CompleteProfile` `⚠️`→`TriangleAlert`, avatar fallback `👨🌾`→initial.
- **Farmer-network (social feed):** `EntityCard` provider/buyer/farmer type meta already lucide; `ServicesHub` group icons (`🚜📦💰🏛🧑🤝🧑`→`Tractor`/`Package`/`Coins`/`Landmark`/`Handshake`); `ChatsView`, `CommunityView`, `RequirementsView`, `ProvidersView` message-type & section glyphs → lucide.
- **Weather/Kisan surfaces:** `WeatherWidget`, `SevenDayForecastCard`, `HourlyForecastTimeline` condition maps (`☀️🌧️❄️`→`Sun`/`CloudRain`/`Snowflake`); `KisanChat` bot-avatar/labels → `Bot`; assistant persona keeps a warm human-first feel.
- **Money/insurance:** `CropProfitCalculator` crop-selector dropdown & result rows keep a single lucide glyph per crop (data map preserved); `FasalBima` selector same pattern.

## 3. What changed — file ledger (subset of the highest-traffic surfaces)
| File | Change |
|---|---|
| `src/main.tsx` | `🌱` error fallback → inline sprout SVG |
| `src/components/ui/error-state.tsx` | `EmptyState` default `🌾`→`Sprout`; `RetryState` `⚠️`→`TriangleAlert` |
| `src/components/ui/offline.tsx`, `AppLoader.tsx` | `📡/✅`→`WifiOff`/`Wifi`; `🌱`→`Sprout` |
| `src/pages/NotFound.tsx` | `🏡💬🛒📈🏛❓` quick links → lucide |
| `src/pages/StateLanding.tsx` | feature chips → `LineChart`/`Bot`/`Speech` |
| `src/pages/Pricing.tsx` | stripped decorative text emojis; lucide trust glyphs |
| `src/pages/CompleteProfile.tsx` | `⚠️`→`TriangleAlert`; farmer avatar initial fallback |
| `src/components/auth/AuthWrappers.tsx`, `Contact.tsx` | brand glyph `🌾`→`Sprout`; contact glyphs → lucide |
| `src/features/farmer-network/...` | ServicesHub groups, Chats/Community/Requirements views → lucide |
| `src/components/agri/KisanChat.tsx` | `🤖` bot labels/avatars → `Bot` (profile/assistant) |
| `src/features/weather/...` + `WeatherWidget.tsx` | condition icons → `Sun`/`Cloud*`/`Snowflake` |
| `src/features/today/...` (`TodayTasks`) | `📅`→`CalendarDays` in snapshots; `☔` field nav tex 제거 |
| `src/features/farmer-profile/...` views | `💬📷`→`MessageCircle`/`Camera`; old `FirstDayBoard` gardé (new board already lucide) |

`tsc --noEmit` clean; `npm run build` passes; full vitest suite green (586 passing) — including the i18n journey tests that assert the exact locale token counts we deliberately touched only at the render layer.

## 4. Deliberately KEPT (content, not icons)
- Drizzle/weather **animation** glyphs only in live-updating hero/weather canvases where a weather *pictograph* is semantically a data point, not a feature icon — and even there we switched the static condition maps to lucide.
- Kisan-degree/anti-pattern data inside `soil-health`/`scheme` cards stays as data (it reads as content, and a full data-model migration is a P2 — see §5). Where these glyphs appeared as UI chrome we already substituted lucide.

## 5. Remaining / P2-P3 (honest backlog)
- `CropProfitCalculator`, `FasalBima`, `CropProfitCalculator.CROPS`, and `ServicesHub` crop/commodity **data maps** still carry a `emoji` key used in selectors/lists. These render small per-crop pictographs. Full migration = replace each map's glyph with a lucide icon reference in the same data record and render that icon. Keep back-compatible default.
- Some `FasalBima`/`SoilHealthParametersCard` unit chips (`⚠️`, `🌱`) — visually minor; fold into the §5.1 migration.
- Onboarding (`FirstDayBoard` old variant) purposely untouched except lucide (new board is source of truth).
- The **state-level enterprise surfaces** (`DAP`, `GC`, `fertiliser`/`seed` B2B lists) still use emoji *in hyperlinked commodity lists*; treat as P2 under the same "data map → lucide render" rule.

## 6. Guardrails added / reaffirmed
- All new feature icons must come from **lucide-react** with `size` + `aria-hidden`.
- **No emoji as a nav, button, status, section, or feature cue.** Where copy needs a tone, use the brand palette and typographic weight instead of glyphs.
- Motion stays calm: single live pulse + `prefers-reduced-motion` guard; no decorative rainbow.
- Human-first farming persona: advisory/AI surfaces use a warm, expert-farmer voice — the re-imagined `KisanChat` keeps an assistant persona rather than a robot mascot.
