/**
 * Vercel Serverless Function — IoT Device Command Endpoint.
 *
 * POST /api/iot/device-command
 * Payload:
 * {
 *   "deviceUid": "AGRI-ESP32-001",
 *   "command": "BUZZER_ON" | "BUZZER_OFF" | "ARM_FENCE" | "DISARM_FENCE" | "PUMP_ON" | "PUMP_OFF"
 * }
 *
 * A command is QUEUED into `iot_commands`. The ESP32 node polls it via
 * GET /api/iot/commands and reports execution via POST /api/iot/command-ack.
 * The API never claims delivery — only that the command was accepted.
 */

import { resolveSupabaseConfig, COMMANDS, capabilityForCommand, COMMAND_DEDUPE_MS } from "./_lib/iot-common.cjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-device-token, x-device-secret");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST for device commands." });
  }

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

  if (!COMMANDS.includes(cleanCmd)) {
    return res.status(400).json({
      error: `Unknown command "${cleanCmd}". Supported commands: ${COMMANDS.join(", ")}.`,
    });
  }

  let supabaseUrl;
  let supabaseKey;
  try {
    ({ url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig());
  } catch (err) {
    console.error("[api/iot/device-command] Config error:", err.message);
    return res.status(500).json({ error: "IoT commands are not configured on this server." });
  }

  const supabaseHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  try {
    const deviceRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_devices?device_uid=eq.${encodeURIComponent(cleanUid)}`,
      { headers: supabaseHeaders }
    );

    if (!deviceRes.ok) {
      throw new Error(`Database error querying device: ${deviceRes.statusText}`);
    }

    const devices = await deviceRes.json();
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(404).json({
        error: `Device ${cleanUid} is not registered in AgriConnect.`,
        deviceUid: cleanUid,
      });
    }

    const device = devices[0];
    const capabilities =
      typeof device.capabilities === "object" && device.capabilities !== null ? device.capabilities : {};

    // Capability gate — a command is never accepted for hardware that lacks the module
    const neededCapability = capabilityForCommand(cleanCmd);
    if (neededCapability && !capabilities[neededCapability]) {
      return res.status(400).json({
        error: `Hardware capability missing on this device. The ${cleanCmd.toLowerCase().split("_")[0]} module is not connected/installed.`,
        deviceUid: cleanUid,
        command: cleanCmd,
        capabilities,
      });
    }

    // Commands can only be queued while the node has a live heartbeat
    if (device.status !== "ONLINE") {
      return res.status(400).json({
        error: `Device ${cleanUid} is currently ${device.status}. Commands cannot be sent to disconnected hardware. Last seen ${device.last_seen || "never"}.`,
        deviceUid: cleanUid,
        status: device.status,
      });
    }

    // Deduplicate identical outstanding commands (within the dedupe window)
    const cutoff = new Date(Date.now() - COMMAND_DEDUPE_MS).toISOString();
    const dupRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_commands?device_id=eq.${encodeURIComponent(device.id)}&command=eq.${encodeURIComponent(cleanCmd)}&state=eq.QUEUED&issued_at=gte.${encodeURIComponent(cutoff)}&select=id,issued_at`,
      { headers: supabaseHeaders }
    );
    const existing = dupRes.ok ? await dupRes.json() : [];
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({
        success: false,
        status: "ALREADY_QUEUED",
        commandId: existing[0].id,
        error: `Command ${cleanCmd} is already queued and waiting for the device.`,
      });
    }

    const nowIso = new Date().toISOString();
    const commandRow = {
      device_id: device.id,
      farm_id: device.farm_id,
      command: cleanCmd,
      state: "QUEUED",
      issued_at: nowIso,
      created_at: nowIso,
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/iot_commands`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify(commandRow),
    });
    if (!insertRes.ok) {
      throw new Error(`Failed to queue command: ${insertRes.statusText}`);
    }
    const inserted = await insertRes.json();
    const commandId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;

    return res.status(200).json({
      success: true,
      status: "QUEUED",
      commandId,
      deviceUid: cleanUid,
      command: cleanCmd,
      issuedAt: nowIso,
      requiresAck: true,
      message: "Command sent to your device. Waiting for hardware confirmation\u2026",
    });
  } catch (err) {
    console.error("[api/iot/device-command] Error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to queue device command",
      message: err?.message || "Internal server error",
    });
  }
}