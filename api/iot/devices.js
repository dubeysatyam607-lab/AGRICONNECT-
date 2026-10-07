/**
 * Vercel Serverless Function — IoT Device Query & Status Endpoint.
 *
 * GET /api/iot/devices?farmId=...&userId=...&deviceUid=...
 *
 * Uses service role headers to safely read real iot_devices and latest
 * sensor_readings from Supabase, preventing RLS query blockage on hardware nodes.
 */

import { resolveSupabaseConfig, OFFLINE_TIMEOUT_SEC } from "./_lib/iot-common.cjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-device-token");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET for devices query." });
  }

  let supabaseUrl, supabaseKey;
  try {
    ({ url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig());
  } catch (err) {
    console.error("[api/iot/devices] Config error:", err.message);
    return res.status(500).json({ error: "IoT device service is not configured on this server." });
  }

  const supabaseHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  const { farmId, userId, deviceUid } = req.query || {};

  try {
    let queryUrl = `${supabaseUrl}/rest/v1/iot_devices?select=*&order=created_at.desc`;
    if (deviceUid && typeof deviceUid === "string" && deviceUid.trim()) {
      queryUrl += `&device_uid=eq.${encodeURIComponent(deviceUid.trim())}`;
    }

    const deviceRes = await fetch(queryUrl, { headers: supabaseHeaders });
    if (!deviceRes.ok) {
      throw new Error(`Database query failed: ${deviceRes.statusText}`);
    }

    let devices = await deviceRes.json();
    if (!Array.isArray(devices)) devices = [];

    const nowMs = Date.now();

    // Process each device and attach its latest reading
    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        // 1. Fetch latest reading
        let latestReading = null;
        try {
          const readingRes = await fetch(
            `${supabaseUrl}/rest/v1/sensor_readings?device_id=eq.${encodeURIComponent(device.id)}&order=created_at.desc&limit=1`,
            { headers: supabaseHeaders }
          );
          if (readingRes.ok) {
            const readings = await readingRes.json();
            if (Array.isArray(readings) && readings.length > 0) {
              latestReading = readings[0];
            }
          }
        } catch (e) {
          console.error(`[api/iot/devices] Error fetching reading for ${device.id}:`, e);
        }

        // 2. Determine effective last_seen
        let effectiveLastSeen = device.last_seen;
        if (latestReading && latestReading.created_at) {
          if (!effectiveLastSeen || new Date(latestReading.created_at) > new Date(effectiveLastSeen)) {
            effectiveLastSeen = latestReading.created_at;
          }
        }

        // 3. Compute real status based on 90s timeout
        let status = "NOT_CONNECTED";
        if (effectiveLastSeen) {
          const diffSec = (nowMs - new Date(effectiveLastSeen).getTime()) / 1000;
          if (!isNaN(diffSec) && diffSec >= 0 && diffSec <= OFFLINE_TIMEOUT_SEC) {
            status = "ONLINE";
          } else if (!isNaN(diffSec) && diffSec > OFFLINE_TIMEOUT_SEC) {
            status = "OFFLINE";
          }
        }

        // 4. Auto-bind user_id if device is unassigned or binding requested
        if (userId && typeof userId === "string" && (!device.user_id || device.user_id !== userId)) {
          fetch(`${supabaseUrl}/rest/v1/iot_devices?id=eq.${encodeURIComponent(device.id)}`, {
            method: "PATCH",
            headers: supabaseHeaders,
            body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString() }),
          }).catch(() => {});
          device.user_id = userId;
        }

        // 5. Auto-bind farm_id if device farm is default_farm and farmId provided
        if (farmId && typeof farmId === "string" && (device.farm_id === "default_farm" || !device.farm_id)) {
          fetch(`${supabaseUrl}/rest/v1/iot_devices?id=eq.${encodeURIComponent(device.id)}`, {
            method: "PATCH",
            headers: supabaseHeaders,
            body: JSON.stringify({ farm_id: farmId, updated_at: new Date().toISOString() }),
          }).catch(() => {});
          device.farm_id = farmId;
        }

        return {
          ...device,
          last_seen: effectiveLastSeen,
          status,
          latestReading,
        };
      })
    );

    return res.status(200).json({
      success: true,
      devices: enrichedDevices,
    });
  } catch (err) {
    console.error("[api/iot/devices] Error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to fetch IoT devices",
      message: err?.message || "Internal server error",
    });
  }
}
