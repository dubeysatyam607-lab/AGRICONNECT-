/**
 * Vercel Serverless Function — IoT Command Poll Endpoint (ESP32 pulls work).
 *
 * GET /api/iot/commands?deviceUid=AGRI-ESP32-001
 * Headers: x-device-token: <device token>
 *
 * The device polls this every 15 seconds. Only the physical device (verified
 * by its bound token hash) can read its queued commands. Nothing is ever
 * delivered without this authentication.
 */

import { resolveSupabaseConfig, tokenIsValid, COMMAND_POLL_INTERVAL_SEC } from "./_lib/iot-common.cjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-device-token, x-device-secret");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET to poll commands." });
  }

  const deviceUid = typeof req.query?.deviceUid === "string" ? req.query.deviceUid.trim() : "";
  if (!deviceUid) {
    return res.status(400).json({ error: "Missing required query parameter: deviceUid" });
  }

  const rawToken = req.headers["x-device-token"] || req.headers["x-device-secret"] || null;

  let supabaseUrl;
  let supabaseKey;
  try {
    ({ url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig());
  } catch (err) {
    console.error("[api/iot/commands] Config error:", err.message);
    return res.status(500).json({ error: "IoT commands are not configured on this server." });
  }

  const supabaseHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  try {
    const deviceRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_devices?device_uid=eq.${encodeURIComponent(deviceUid)}`,
      { headers: supabaseHeaders }
    );
    if (!deviceRes.ok) {
      throw new Error(`Database error querying device: ${deviceRes.statusText}`);
    }

    const devices = await deviceRes.json();
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(404).json({ error: `Device ${deviceUid} is not registered.`, deviceUid });
    }

    const device = devices[0];

    // Strong device authentication: the token hash must match the one bound
    // during the first telemetry exchange.
    if (!tokenIsValid(device, rawToken)) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing device token." });
    }

    const commandsRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_commands?device_id=eq.${encodeURIComponent(device.id)}&state=eq.QUEUED&order=issued_at.asc&select=id,command,issued_at`,
      { headers: supabaseHeaders }
    );
    if (!commandsRes.ok) {
      throw new Error(`Database error fetching commands: ${commandsRes.statusText}`);
    }

    const commands = await commandsRes.json();

    return res.status(200).json({
      success: true,
      deviceUid,
      pollIntervalSec: COMMAND_POLL_INTERVAL_SEC,
      commands: Array.isArray(commands) ? commands : [],
    });
  } catch (err) {
    console.error("[api/iot/commands] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch device commands", message: err?.message || "Internal server error" });
  }
}