/**
 * Express Controller — IoT Telemetry & Device Command Endpoints for AgriConnect backend.
 */

const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yrebxnpilkfeaofykvhq.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_PMQ7FkMezMesBBJiVQsNUQ_Lu3I4n6A";

function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return null;
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * POST /api/iot/telemetry
 */
exports.postTelemetry = async (req, res) => {
  try {
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

    // 1. Fetch device
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
        error: `Device ${cleanUid} is not registered in AgriConnect. Please add the device in your app profile.`,
        deviceUid: cleanUid,
        status: "NOT_CONNECTED",
      });
    }

    const device = devices[0];
    const incomingTokenHash = hashToken(rawToken);

    // Validate device token hash if present in DB
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

    if (!device.device_token_hash && incomingTokenHash) {
      updatePayload.device_token_hash = incomingTokenHash;
    }

    // 2. Update iot_devices
    await fetch(`${supabaseUrl}/rest/v1/iot_devices?id=eq.${encodeURIComponent(device.id)}`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    // 3. Insert reading
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

    // 4. Alerts
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
    console.error("[iotController.postTelemetry] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to process telemetry", message: err?.message || "Internal server error" });
  }
};

/**
 * POST /api/iot/device-command
 */
exports.postDeviceCommand = async (req, res) => {
  try {
    const body = req.body || {};
    const { deviceUid, command } = body;

    if (!deviceUid || typeof deviceUid !== "string" || !deviceUid.trim()) {
      return res.status(400).json({ error: "Missing required parameter: deviceUid" });
    }

    if (!command || typeof command !== "string" || !command.trim()) {
      return res.status(400).json({ error: "Missing required parameter: command" });
    }

    const cleanUid = deviceUid.trim();
    const cleanCmd = command.trim().toUpperCase();

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
      return res.status(404).json({ error: `Device ${cleanUid} is not registered in AgriConnect.` });
    }

    const device = devices[0];
    const capabilities = typeof device.capabilities === "object" && device.capabilities !== null ? device.capabilities : {};

    if (cleanCmd.startsWith("BUZZER_") && !capabilities.buzzer) {
      return res.status(400).json({
        error: "Hardware capability missing on this device. Buzzer module is not connected/installed.",
        deviceUid: cleanUid,
        command: cleanCmd,
      });
    }

    if ((cleanCmd === "ARM_FENCE" || cleanCmd === "DISARM_FENCE") && !capabilities.laserFence) {
      return res.status(400).json({
        error: "Hardware capability missing on this device. Laser Smart Fence module is not connected/installed.",
        deviceUid: cleanUid,
        command: cleanCmd,
      });
    }

    if (device.status !== "ONLINE") {
      return res.status(400).json({
        error: `Device ${cleanUid} is currently ${device.status}. Commands cannot be delivered to disconnected hardware.`,
        deviceUid: cleanUid,
        status: device.status,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Command ${cleanCmd} issued successfully to device ${cleanUid}`,
      deviceUid: cleanUid,
      command: cleanCmd,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[iotController.postDeviceCommand] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to dispatch device command", message: err?.message || "Internal server error" });
  }
};
