/**
 * Vercel Serverless Function — IoT Command Acknowledgment Endpoint.
 *
 * POST /api/iot/command-ack
 * Payload:
 * {
 *   "deviceUid": "AGRI-ESP32-001",
 *   "deviceToken": "your_long_random_device_token",
 *   "commandId": "<uuid>",
 *   "status": "EXECUTED" | "FAILED",
 *   "error": "optional message on failure"
 * }
 *
 * Called by the ESP32 after it physically executed (or failed to execute) a
 * queued command. Until this arrives, the command stays QUEUED so the app
 * shows "waiting for the device" instead of a premature success.
 */

import {
  resolveSupabaseConfig,
  hashToken,
  COMMANDS,
  buildCommandFailureAlert,
} from "./_lib/iot-common.cjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-device-token, x-device-secret");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST for command acknowledgments." });
  }

  const body = req.body || {};
  const deviceUid = typeof body.deviceUid === "string" ? body.deviceUid.trim() : "";
  const commandId = typeof body.commandId === "string" ? body.commandId.trim() : "";
  const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
  const error = typeof body.error === "string" ? body.error.slice(0, 300) : "";

  const headerToken = req.headers["x-device-token"] || req.headers["x-device-secret"];
  const rawToken = body.deviceToken || headerToken || null;

  if (!deviceUid) {
    return res.status(400).json({ error: "Missing required parameter: deviceUid" });
  }
  if (!commandId) {
    return res.status(400).json({ error: "Missing required parameter: commandId" });
  }
  if (status !== "EXECUTED" && status !== "FAILED") {
    return res.status(400).json({ error: "Invalid status. Expected EXECUTED or FAILED." });
  }

  let supabaseUrl;
  let supabaseKey;
  try {
    ({ url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig());
  } catch (err) {
    console.error("[api/iot/command-ack] Config error:", err.message);
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
      return res.status(404).json({ error: `Device ${deviceUid} is not registered.` });
    }

    const device = devices[0];

    // Verify the ack really comes from the physical device
    const incomingHash = hashToken(rawToken);
    if (!device.device_token_hash || !incomingHash || incomingHash !== device.device_token_hash) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing device token." });
    }

    // Load the pending command so the ack can only target a queued one
    const cmdRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_commands?id=eq.${encodeURIComponent(commandId)}&device_id=eq.${encodeURIComponent(device.id)}&select=id,command,state`,
      { headers: supabaseHeaders }
    );
    if (!cmdRes.ok) {
      throw new Error(`Database error fetching command: ${cmdRes.statusText}`);
    }
    const commands = await cmdRes.json();
    const command = Array.isArray(commands) ? commands[0] : undefined;

    if (!command) {
      return res.status(404).json({ error: "Command not found for this device.", commandId });
    }
    if (command.state === "EXECUTED" || command.state === "FAILED") {
      return res.status(409).json({ error: "Command already acknowledged.", commandId, state: command.state });
    }
    if (command.state !== "QUEUED") {
      return res.status(409).json({ error: `Command is in state ${command.state} and cannot be acknowledged.`, commandId });
    }

    const nowIso = new Date().toISOString();
    const ackPayload = {
      state: status,
      acked_at: nowIso,
      updated_at: nowIso,
      ...(status === "FAILED" && error ? { error } : {}),
    };

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/iot_commands?id=eq.${encodeURIComponent(commandId)}`, {
      method: "PATCH",
      headers: supabaseHeaders,
      body: JSON.stringify(ackPayload),
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update command ack: ${updateRes.statusText}`);
    }

    if (status === "FAILED") {
      const alert = buildCommandFailureAlert(device, command.command, commandId, error, nowIso);
      await fetch(`${supabaseUrl}/rest/v1/iot_alerts`, {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(alert),
      });
    }

    return res.status(200).json({
      success: true,
      commandId,
      acknowledged: true,
      state: status,
      ackedAt: nowIso,
    });
  } catch (err) {
    console.error("[api/iot/command-ack] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to process command acknowledgment", message: err?.message || "Internal server error" });
  }
}