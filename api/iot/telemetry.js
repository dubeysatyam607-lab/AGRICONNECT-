/**
 * Vercel Serverless Function — IoT Telemetry Ingestion Endpoint.
 *
 * POST /api/iot/telemetry
 * Payload:
 * {
 *   "deviceUid": "AGRI-ESP32-001",
 *   "deviceToken": "agri_secret_token_12345",
 *   "soilMoisture": 1842,
 *   "temperature": 28.4,
 *   "humidity": 71,
 *   "rainValue": 840,
 *   "fenceStatus": "NOT_CONNECTED"
 * }
 */

import crypto from "crypto";

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

function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return null;
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
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
  const { deviceUid, deviceToken, soilMoisture, temperature, humidity, rainValue, fenceStatus } = body;
  const headerToken = req.headers["x-device-token"] || req.headers["x-device-secret"];
  const rawToken = deviceToken || headerToken || null;

  if (!deviceUid || typeof deviceUid !== "string" || !deviceUid.trim()) {
    return res.status(400).json({ error: "Missing required parameter: deviceUid" });
  }

  const cleanUid = deviceUid.trim();

  // Range checks
  if (soilMoisture !== undefined && soilMoisture !== null) {
    const num = Number(soilMoisture);
    if (!Number.isFinite(num) || num < 0 || num > 10000) {
      return res.status(400).json({ error: "Invalid soilMoisture value. Expected numeric ADC reading or percentage." });
    }
  }

  if (temperature !== undefined && temperature !== null) {
    const num = Number(temperature);
    if (!Number.isFinite(num) || num < -50 || num > 100) {
      return res.status(400).json({ error: "Invalid temperature value. Expected -50 to 100 (°C)" });
    }
  }

  if (humidity !== undefined && humidity !== null) {
    const num = Number(humidity);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      return res.status(400).json({ error: "Invalid humidity value. Expected 0 to 100 (%)" });
    }
  }

  if (rainValue !== undefined && rainValue !== null) {
    const num = Number(rainValue);
    if (!Number.isFinite(num) || num < 0 || num > 10000) {
      return res.status(400).json({ error: "Invalid rainValue. Expected numeric reading." });
    }
  }

  const validFenceStates = ["NOT_CONNECTED", "ARMED", "NORMAL", "INTRUSION", "FAULT", "OFFLINE"];
  const cleanFenceStatus = fenceStatus && validFenceStates.includes(String(fenceStatus).toUpperCase())
    ? String(fenceStatus).toUpperCase()
    : "NOT_CONNECTED";

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yrebxnpilkfeaofykvhq.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_PMQ7FkMezMesBBJiVQsNUQ_Lu3I4n6A";

  try {
    // 1. Fetch device record
    const deviceRes = await fetch(`${supabaseUrl}/rest/v1/iot_devices?device_uid=eq.${encodeURIComponent(cleanUid)}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });

    if (!deviceRes.ok) {
      throw new Error(`Database error querying device: ${deviceRes.statusText}`);
    }

    const devices = await deviceRes.json();
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(404).json({
        error: `Device ${cleanUid} is not registered in AgriConnect. Please register the device UID in your app profile.`,
        deviceUid: cleanUid,
        status: "NOT_CONNECTED",
      });
    }

    const device = devices[0];
    const incomingTokenHash = hashToken(rawToken);

    // Validate device token hash if device_token_hash is configured in DB
    if (device.device_token_hash) {
      if (!incomingTokenHash || incomingTokenHash !== device.device_token_hash) {
        return res.status(401).json({ error: "Unauthorized: Invalid or missing device token." });
      }
    }

    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: "ONLINE",
      last_seen: nowIso,
      updated_at: nowIso,
    };

    // If device had no token hash yet and token was supplied, bind it
    if (!device.device_token_hash && incomingTokenHash) {
      updatePayload.device_token_hash = incomingTokenHash;
    }

    // 2. Update status and last_seen
    await fetch(`${supabaseUrl}/rest/v1/iot_devices?id=eq.${encodeURIComponent(device.id)}`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    // 3. Insert sensor_readings row
    const readingPayload = {
      device_id: device.id,
      farm_id: device.farm_id,
      soil_moisture: soilMoisture !== undefined && soilMoisture !== null ? Number(soilMoisture) : null,
      temperature: temperature !== undefined && temperature !== null ? Number(temperature) : null,
      humidity: humidity !== undefined && humidity !== null ? Number(humidity) : null,
      rain_value: rainValue !== undefined && rainValue !== null ? Number(rainValue) : null,
      fence_status: cleanFenceStatus,
      created_at: nowIso,
    };

    await fetch(`${supabaseUrl}/rest/v1/sensor_readings`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(readingPayload),
    });

    // 4. Trigger alerts if conditions are breached
    const alertsToCreate = [];

    if (cleanFenceStatus === "INTRUSION") {
      alertsToCreate.push({
        farm_id: device.farm_id,
        device_id: device.id,
        alert_type: "FENCE_INTRUSION",
        severity: "CRITICAL",
        message: `PERIMETER INTRUSION DETECTED on ${device.device_name}! Laser fence beam interrupted.`,
      });
    }

    if (soilMoisture !== undefined && soilMoisture !== null && Number(soilMoisture) <= 100 && Number(soilMoisture) < 20) {
      alertsToCreate.push({
        farm_id: device.farm_id,
        device_id: device.id,
        alert_type: "LOW_SOIL_MOISTURE",
        severity: "WARNING",
        message: `Low soil moisture level (${soilMoisture}%) detected on ${device.device_name}.`,
      });
    }

    if (alertsToCreate.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/iot_alerts`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(alertsToCreate),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Telemetry received",
      deviceUid: cleanUid,
      status: "ONLINE",
      lastSeen: nowIso,
    });
  } catch (err) {
    console.error("[api/iot/telemetry] Error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to process IoT telemetry",
      message: err?.message || "Internal server error",
    });
  }
}
