# AgriConnect IoT Implementation Report

Date: 2026-09-26
Scope: Real-hardware IoT integration (ESP32), command acknowledgment, data ownership, image system aliases, and a full test plan. Hardware-dependent items are explicitly marked **NOT VERIFIED**.

---

## 1. Executive Summary

AgriConnect already had a single-directional ESP32 telemetry pipeline and an IoT dashboard, but the command system only *pretended* to reach the hardware, demo values could be posted into the real database, and devices were scoped by a crop-derived `farm_id` shared by every user growing the same crop (a cross-user data leak).

This work rewrites the IoT backend and frontend into a real, acknowledge-based system:

- Telemetry is strictly validated; only physical sensor data can enter `sensor_readings`.
- Commands (Buzzer, Smart Fence, Water Pump) are **queued**, pulled by the device over HTTPS, and only shown as done once the hardware sends an `EXECUTED` / `FAILED` acknowledgment.
- Devices are **owned by the authenticated user** (RLS + explicit scoping); the previous "visible to everyone" RLS openness is removed.
- Demo/simulated telemetry is gated behind `VITE_IOT_MOCK_MODE` and hidden in production.
- A live sensor-history chart (recharts), real-time insights, device selector, live "Updated X sec ago" timestamps, command logging and alert acknowledgments were added.
- Senior image aliases `getTractorImage()`, `getMandiImage()`, `getIoTImage()` were added on top of the existing multi-tier image resolver.

**Honesty rule:** commands and hardware flows could not be executed against physical ESP32 hardware during this session. Every hardware-dependent outcome below is marked **NOT VERIFIED**.

---

## 2. Existing Architecture (as found)

| Layer | Files | Behaviour |
|---|---|---|
| Firmware | `firmware/agriconnect_esp32_node.ino` | ESP32 POSTs telemetry every 30 s to `/api/iot/telemetry`. No command channel. Hardcoded Wi-Fi creds, server IP, device UID/token. |
| Vercel API | `api/iot/telemetry.js`, `api/iot/device-command.js` | Telemetry ingest (range checks, token-hash auth, heartbeats, alerts). `device-command` validated capability/status then returned success — **never delivered anything** to the device. Hardcoded Supabase fallback keys. |
| Express server | `server/controllers/iotController.js`, `server/routes/iotRoutes.js` | Duplicated telemetry + command logic (prone to divergence). |
| Frontend | `src/lib/iot-service.ts`, `src/components/agri/HardwareDashboard.tsx` | Supabase-backed device/reading/alert fetch + realtime. Presentational dashboard with sensor cards, fence/buzzer cards, a "Hardware Test Bench" that posted arbitrary values into the real DB, and no history chart. |
| Database | `supabase/migrations/20260925000000_iot_integration.sql` | `iot_devices`, `sensor_readings`, `iot_alerts` + RLS. RLS for `iot_devices` allowed `user_id IS NULL` rows to be **visible to every authenticated user**. Public insert policies existed on `sensor_readings` / `iot_alerts`. |
| Images | `src/lib/imageService.ts`, `image-resolver.ts`, `crop-images.ts`, `machine-images.ts`, `cattle-images.ts` | Mature multi-tier resolver (validation, curated registry, category fallback, offline SVG). No IoT/tractor/mandi aliases. |

---

## 3. What Was Broken

1. **Fake command delivery.** `device-command` returned `success: true` without any hardware path; the UI toasted "Command Delivered". The firmware had no receiver.
2. **Fake data into production DB.** The in-app "Hardware Telemetry Test Bench" let anyone post invented sensor values to the real `/api/iot/telemetry` pipeline. `VITE_IOT_MOCK_MODE` did not exist.
3. **Cross-user data leak.** `farmId = farm_<crop>` is identical for all users growing the same crop → every such device listing was shared. RLS additionally exposed all `user_id IS NULL` devices and allowed public inserts to `sensor_readings`/`iot_alerts`.
4. **Hardcoded Supabase fallbacks.** `api/iot/telemetry.js` and `device-command.js` embedded a hardcoded publishable key (now removed) as a fallback and would never fail closed when secrets were missing.
5. **No command acknowledgment.** No queue, no polling surface, no ack endpoint, no UI state machine (Sending → Waiting → Confirmed/Failed).
6. **Client churn + stale time.** Realtime channel resubscribed whenever the selected device changed and refetched the whole dashboard on every sensor insert; relative timestamps went stale between renders.
7. **No sensor history, no insights, no alert acknowledgment.**
8. **Firmware leaked a real Wi-Fi password** and used a guessable default device token (both removed in this rewrite).

---

## 4. What Was Fixed

### Backend (Vercel + Express share one source of truth)
- **`api/iot/_lib/iot-common.cjs`** — shared, pure, CommonJS module consumed by both the Vercel serverless functions and the Express server:
  - strict payload validation (finite numbers, physical ranges), fence-status sanitisation, alert derivation (`FENCE_INTRUSION`, `LOW_SOIL_MOISTURE`, new `SENSOR_ERROR` when a connected node reports nothing);
  - command whitelist, per-command capability gate, dedupe window, token hashing, and **fail-closed** Supabase config resolution (no embedded keys);
  - offline timeout constant (300 s), command poll interval (15 s).
- **`api/iot/telemetry.js` / `server/controllers/iotController.js`** — hardened: fail-closed config, device token required, `SENSOR_ERROR` alerts, all validation via the shared module. The Express controller mirrors the serverless endpoints exactly.
- **`api/iot/device-command.js`** — now **queues** commands into `iot_commands` (state `QUEUED`), refuses when the real status is not ONLINE, gates on installed capability, deduplicates identical outstanding commands (409 `ALREADY_QUEUED`). Returns `requiresAck: true` and a `commandId`.
- **`api/iot/commands.js` (new)** — `GET /api/iot/commands?deviceUid=…` authenticated by the device's bound token hash; returns queued commands for the device to pull.
- **`api/iot/command-ack.js` (new)** — `POST /api/iot/command-ack` authenticated by token hash; flips the command to `EXECUTED`/`FAILED` with `acked_at`; on failure creates a farmer alert.
- **`vercel.json`** — routes for the two new endpoints.
- **`server/routes/iotRoutes.js`** — `GET /commands`, `POST /command-ack`.

### Database (2 new migrations)
- **`20260926000000_iot_commands.sql`** — `iot_commands` table + indexes + owner-only read RLS + Realtime publication; documents the `pump` capability default.
- **`20260926010000_iot_ownership_fix.sql`** — owner-only RLS on all four tables; **requires `user_id = auth.uid()`** at device registration; removes public insert policies from `sensor_readings`/`iot_alerts` (service role still writes, bypasses RLS).

### Frontend
- **`src/lib/iot-service.ts`** — devices scoped by authenticated `user_id` + RLS; `pump` capability; `fetchReadingHistory`, `fetchRecentCommands`, `markAlertRead`; ack-based `sendDeviceCommand`; non-optimistic `describeCommandLifecycle(…)`; registration now requires `userId`.
- **`src/lib/iot-mock-mode.ts`** — `IOT_MOCK_MODE_ENABLED` is true **only** when `VITE_IOT_MOCK_MODE === "true"`. Everything demo is hidden otherwise and labelled "Demo Data".
- **`src/components/agri/HardwareDashboard.tsx`** (rewritten):
  - one realtime channel with stable deps + refs (navigation can no longer stack duplicate subscriptions);
  - 10 s live ticker so "Updated X sec ago" refreshes without refetch loops (sensor inserts now update the reading + history incrementally instead of reloading the page);
  - device selector when multiple nodes exist;
  - command ack state machine with per-command "Sending… → Waiting for the device… → Confirmed by device / Retry";
  - water pump controls, wiring guide, "how commands work" explainer, command log;
  - **sensor history chart** (recharts) fed only from real readings, with metric switch and command-state log dialogue;
  - real-data farm insights (dry soil, heat, humidity, offline notice);
  - alert list with per-item and bulk "mark read";
  - Demo Test Bench visible only in mock mode; offline banner uses a live last-seen timestamp; no emoji glyphs (all Lucide icons).

### Firmware
- **`firmware/config.h`** — central, placeholder-only configuration (Wi-Fi, server base, device UID/token, all pin assignments). Real credentials must be filled in locally and must never be committed.
- **`firmware/agriconnect_esp32_node.ino`** — added a 15 s command-poll loop (`GET /commands`), physical execution of `BUZZER_ON/OFF`, `ARM/DISARM_FENCE`, `PUMP_ON/OFF` (fence LDR-verified NORMAL/INTRUSION states), and an `EXECUTED`/`FAILED` acknowledgment (`POST /command-ack`). Removed the hardcoded real Wi-Fi password and guessable token.

### Images
- **`src/lib/imageService.ts`** — added `getTractorImage()`, `getMandiImage()`, `getIoTImage()` built on the existing verified registry + safe fallbacks; dashboard empty state now uses a real farm photograph.

### Dead-code / cleanup
- Removed hardcoded Supabase fallback keys from `api/` and `server/`; added `node --check` syntax verification and `require()` smoke tests to the workflow (not committed).

---

## 5. Hardware & Protocol

**Supported commands:** `BUZZER_ON`, `BUZZER_OFF`, `ARM_FENCE`, `DISARM_FENCE`, `PUMP_ON`, `PUMP_OFF`.

**Capability gate:** each command requires the matching installed module — `buzzer`, `laserFence`, `pump`. Commands for uninstalled modules are rejected with a farmer-friendly message.

**Device identity:** `device_uid` (unique) + secret token. The first telemetry exchange binds a SHA-256 hash of the token to the row; every later request is verified against it.

**Telemetry payload (real sensors only):**

```json
{
  "deviceUid": "AGRI-ESP32-001",
  "deviceToken": "long_random_token",
  "soilMoisture": 1842,
  "temperature": 28.4,
  "humidity": 71,
  "rainValue": 840,
  "fenceStatus": "NORMAL"
}
```

**Command lifecycle over HTTPS:**

```
App ──POST /api/iot/device-command─────────────► Server (QUEUED row)
ESP32 ──GET /api/iot/commands (every 15s)─┬────► Server queues fetched
ESP32 executes on GPIOs ◄──────────────────┘
ESP32 ──POST /api/iot/command-ack (EXECUTED|FAILED)─► Server updates row + alerts
App   ◄── Realtime iot_commands UPDATE ─────────────── (Confirmed/Failed shown)
```

**Pin map (`firmware/config.h`):** soil 34, rain 35, DHT11 4, fence laser 25 (relay), fence LDR 32, buzzer 26, pump relay 27.

**Timing:** telemetry 30 s; command poll 15 s; offline after 300 s without `last_seen`.

---

## 6. Telemetry Flow (end-to-end)

1. Device reads physical analog/digital sensor pins + DHT11.
2. POST to `/api/iot/telemetry` with token header.
3. Rate limiter → device UID checks → payload validated (finite, physical ranges; out-of-range values → HTTP 400 with a clear message).
4. Device row located; token verified against stored hash (or bound on first contact).
5. `iot_devices` updated to `ONLINE` with `last_seen` heartbeat.
6. `sensor_readings` row inserted (server side only — public insert no longer allowed).
7. Real alerts derived (`FENCE_INTRUSION`, `LOW_SOIL_MOISTURE`, `SENSOR_ERROR`) and inserted via service role.
8. Client receives it over Realtime and updates only the reading + history (no full-page reload).

---

## 7. Command Flow (end-to-end, acknowledge-based)

1. Farmer taps a control. The button enters **Sending…**.
2. `POST /api/iot/device-command` validates the device, its online status and installed capability; duplicates within 60 s are rejected (409).
3. Server inserts a `iot_commands` row (`QUEUED`) and returns `{ status: "QUEUED", commandId, requiresAck: true }`. UI switches to **Waiting for the device…**.
4. The ESP32 polls `GET /api/iot/commands` (token-authenticated) every 15 s, executes the first queued command, then `POST /api/iot/command-ack`.
5. On `EXECUTED` the row flips with `acked_at`; Realtime tells the UI to show **Confirmed by device** (green). On `FAILED` the UI shows **Device reported a failure** with a retry and a farmer alert is created.
6. Nothing is ever displayed as done until step 5 completes.

---

## 8. Image System Changes

The existing resolver already validated URLs and layered curated → category → offline-SVG fallbacks. This session added:
- `getTractorImage(name?)` → machinery registry alias;
- `getMandiImage(name?)` → crop registry alias with verified default;
- `getIoTImage({ name? })` → real smart-farm photograph for IoT surfaces (used in the dashboard empty state and available for setup guides).

All three are stable (no random selection), never return empty, and only ever resolve real agricultural photographs.

---

## 9. Test Results

Verification in this environment: **34 unit tests passed** across `iot-common`, `iot-service`, `iot-mock-mode`, `image-aliases`; `node --check` passed on all four serverless files; Express controller/routes load; `npx tsc -b tsconfig.app.json` reports **no new errors** (all 1185 lines are pre-existing, unchanged files); `vite build` succeeds (HardwareDashboard chunk 45.8 kB).

| # | Test | Result |
|---|---|---|
| 1 | Payload validation rejects out-of-range / non-numeric physical values | ✅ PASS (unit) |
| 2 | Fence-status sanitisation + token hashing | ✅ PASS (unit) |
| 3 | Capability gate per command (buzzer/fence/pump) | ✅ PASS (unit) |
| 4 | Alert derivation (intrusion, low moisture, sensor error) | ✅ PASS (unit) |
| 5 | Device online/offline from real `last_seen` (300 s window, custom window) | ✅ PASS (unit) |
| 6 | Command ack state machine (QUEUED/EXECUTED/FAILED/EXPIRED — never optimistic) | ✅ PASS (unit) |
| 7 | `sendDeviceCommand` parses QUEUED + `commandId`; 409/dedupe; network failure | ✅ PASS (unit, mocked fetch) |
| 8 | Mock mode disabled unless `VITE_IOT_MOCK_MODE === "true"` | ✅ PASS (unit) |
| 9 | `getTractor/Mandi/IoTImage` aliases return real stable URLs | ✅ PASS (unit) |
| 10 | Telemetry insert, device heartbeat, command poll/ack against live Supabase + physical ESP32 | ⛔ **NOT VERIFIED** (no hardware / no applied migration in this session) |
| 11 | Disconnect → OFFLINE and reconnect → ONLINE in-app | ⛔ **NOT VERIFIED** (needs live hardware) |
| 12 | Command executed on real GPIOs + confirmed in app | ⛔ **NOT VERIFIED** (needs live hardware) |
| 13 | Sensor history chart rendering real readings | ⛔ **NOT VERIFIED** (chart builds; needs real readings to view) |

To run the live checks you must: apply the two migrations, set `SUPABASE_SERVICE_ROLE_KEY`/`VITE_SUPABASE_URL` server-side, flash an ESP32 with real `config.h` values, and confirm the token link. Until then, everything hardware-dependent stays NOT VERIFIED.

---

## 10. Remaining Configuration & Next Steps

1. **Apply migrations** (in order): `20260925000000_iot_integration.sql`, `20260926000000_iot_commands.sql`, `20260926010000_iot_ownership_fix.sql`. Warn: the ownership migration hides any pre-existing device with `user_id IS NULL`.
2. **Server env (fail-closed):** `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) on both Vercel and the Express host. IoT endpoints will return `501/500 "not configured"` otherwise.
3. **Frontend env:** `VITE_IOT_MOCK_MODE` left unset in production. Set to `"true"` only in a dev-only build to reveal the Demo Test Bench (labelled "Demo Data").
4. **Firmware:** copy/edit `firmware/config.h` with your 2.4 GHz Wi-Fi, server base URL, device UID (must match an app-registered device) and a long random token. Never commit real values.
5. **Register the device** in the app (Add ESP32 Node → now binds it to your account). First telemetry binds the token hash.
6. **Re-audit for fake data:** production paths contain no `Math.random`/demo/`isOnline=true` shortcuts for IoT. The only demo surface is the mock-gated test bench.
7. **Future:** optional MQTT transport for truly sub-second command latency; `EXPIRED` sweeper for stale `QUEUED` rows; per-zone device grouping once a real `farms` table exists.