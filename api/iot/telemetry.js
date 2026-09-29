/**
 * Vercel Serverless Function — IoT Telemetry Ingestion Endpoint.
 *
 * POST /api/iot/telemetry
 * Payload:
 * {
 *   "deviceUid": "AGRI-ESP32-001",
 *   "deviceToken": "your_long_random_device_token",
 *   "soilMoisture": 1842,
 *   "temperature": 28.4,
 *   "humidity": 71,
 *   "rainValue": 840,
 *   "fenceStatus": "NOT_CONNECTED"
 * }
 *
 * All values must come from physical sensors. No client-side or demo values are
 * ever generated here; invalid or out-of-range readings are rejected with 400.
 */

import { resolveSupabaseConfig, hashToken, validateTelemetry, buildReadingRow, buildAlertsForReading } from "./_lib/iot-common.cjs";

// Simple in-memory IP rate limiter
const ipRateMap = new Map();
const RATE_LIMIT_MAX = 120; // Allow 120 telemetry posts per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipRateMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    entry.count += 1;
  }
  ipRateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-device-token, x-device-secret");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST for telemetry." });
  }

  const clientIP = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ error: "Rate limit exceeded. Telemetry throttled." });
  }

  const body = req.body || {};
  const { deviceUid } = body;
  const headerToken = req.headers["x-device-token"] || req.headers["x-device-secret"];
  const rawToken = body.deviceToken || headerToken || null;

  if (!deviceUid || typeof deviceUid !== "string" || !deviceUid.trim()) {
    return res.status(400).json({ error: "Missing required parameter: deviceUid" });
  }

  const cleanUid = deviceUid.trim();

  const validation = validateTelemetry(body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.errors[0], deviceUid: cleanUid });
  }

  let supabaseUrl;
  let supabaseKey;
  try {
    ({ url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig());
  } catch (err) {
    console.error("[api/iot/telemetry] Config error:", err.message);
    return res.status(500).json({ error: "IoT telemetry is not configured on this server." });
  }

  const supabaseHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Fetch or auto-register the device
    const deviceRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_devices?device_uid=eq.${encodeURIComponent(cleanUid)}`,
      { headers: supabaseHeaders }
    );

    if (!deviceRes.ok) {
      throw new Error(`Database error querying device: ${deviceRes.statusText}`);
    }

    const devices = await deviceRes.json();
    let device;
    const incomingTokenHash = hashToken(rawToken);

    if (!Array.isArray(devices) || devices.length === 0) {
      if (!incomingTokenHash) {
        return res.status(401).json({
          error: `Device ${cleanUid} is not registered and no deviceToken was supplied to register it.`,
          deviceUid: cleanUid,
          status: "NOT_CONNECTED",
        });
      }

      const nowIso = new Date().toISOString();
      const newDevicePayload = {
        device_uid: cleanUid,
        device_name: `AgriConnect ESP32 (${cleanUid})`,
        device_type: "ESP32_FARM_NODE",
        farm_id: "default_farm",
        status: "ONLINE",
        device_token_hash: incomingTokenHash,
        capabilities: {
          soilMoisture: true,
          temperature: true,
          humidity: true,
          rain: true,
          laserFence: false,
          buzzer: false,
          pump: false,
        },
        last_seen: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const createRes = await fetch(`${supabaseUrl}/rest/v1/iot_devices`, {
        method: "POST",
        headers: { ...supabaseHeaders, Prefer: "return=representation" },
        body: JSON.stringify(newDevicePayload),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to auto-register device ${cleanUid}: ${createRes.statusText}`);
      }

      const createdDevices = await createRes.json();
      device = Array.isArray(createdDevices) ? createdDevices[0] : createdDevices;
    } else {
      device = devices[0];

      if (device.device_token_hash) {
        if (!incomingTokenHash || incomingTokenHash !== device.device_token_hash) {
          return res.status(401).json({ error: "Unauthorized: invalid or missing device token." });
        }
      } else if (!incomingTokenHash) {
        return res.status(401).json({ error: "Unauthorized: a device token is required to link this node." });
      }
    }

    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: "ONLINE",
      last_seen: nowIso,
      updated_at: nowIso,
    };
    if (!device.device_token_hash && incomingTokenHash) {
      updatePayload.device_token_hash = incomingTokenHash;
    }

    // 2. Update status and last_seen (heartbeat)
    await fetch(`${supabaseUrl}/rest/v1/iot_devices?id=eq.${encodeURIComponent(device.id)}`, {
      method: "PATCH",
      headers: supabaseHeaders,
      body: JSON.stringify(updatePayload),
    });

    // 3. Insert sensor_readings row (real physical values only)
    const reading = validation.reading;
    const readingRow = buildReadingRow(device, reading, nowIso);
    await fetch(`${supabaseUrl}/rest/v1/sensor_readings`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify(readingRow),
    });

    // 4. Derive and insert real alerts
    const alertsToCreate = buildAlertsForReading(device, reading, nowIso);
    if (alertsToCreate.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/iot_alerts`, {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(alertsToCreate),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Telemetry received",
      deviceUid: cleanUid,
      received: true,
      status: "ONLINE",
      lastSeen: nowIso,
      serverTime: nowIso,
    });
  } catch (err) {
    console.error("[api/iot/telemetry] Error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to process IoT telemetry",
      message: err?.message || "Internal server error",
    });
  }
}