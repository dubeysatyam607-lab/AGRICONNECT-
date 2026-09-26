/**
 * Express Controller — IoT Telemetry, Command Queue, Poll & Ack for AgriConnect.
 *
 * Mirrors the Vercel serverless endpoints so the local/dev server behaves
 * identically. Shares all validation + protocol rules with the serverless
 * functions via `api/iot/_lib/iot-common.cjs`.
 */

const path = require("path");
const {
  COMMANDS,
  capabilityForCommand,
  COMMAND_DEDUPE_MS,
  COMMAND_POLL_INTERVAL_SEC,
  resolveSupabaseConfig,
  hashToken,
  tokenIsValid,
  validateTelemetry,
  buildReadingRow,
  buildAlertsForReading,
  buildCommandFailureAlert,
} = require(path.join(__dirname, "..", "..", "api", "iot", "_lib", "iot-common.cjs"));

let supabaseUrl = "";
let supabaseKey = "";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    const cfg = resolveSupabaseConfig();
    supabaseUrl = cfg.url;
    supabaseKey = cfg.key;
  }
  return { supabaseUrl, supabaseKey };
}

function headers() {
  const { supabaseKey: key } = getSupabase();
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function fetchDeviceByUid(uid) {
  const { supabaseUrl } = getSupabase();
  const res = await fetch(`${supabaseUrl}/rest/v1/iot_devices?device_uid=eq.${encodeURIComponent(uid)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Database error querying device: ${res.statusText}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function addServerError(res, endpoint, err) {
  console.error(`[iotController.${endpoint}] Error:`, err?.message || err);
  if (err?.code === "IOT_CONFIG_MISSING") {
    return res.status(500).json({ error: "IoT is not configured on this server." });
  }
  return res.status(500).json({
    error: endpoint === "postTelemetry" ? "Failed to process IoT telemetry" : "Failed to process IoT command",
    message: err?.message || "Internal server error",
  });
}

/**
 * POST /api/iot/telemetry
 */
exports.postTelemetry = async (req, res) => {
  try {
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

    const device = await fetchDeviceByUid(cleanUid);
    if (!device) {
      return res.status(404).json({
        error: `Device ${cleanUid} is not registered in AgriConnect. Please register the device UID in your app profile.`,
        deviceUid: cleanUid,
        status: "NOT_CONNECTED",
      });
    }

    const incomingTokenHash = hashToken(rawToken);
    if (device.device_token_hash) {
      if (!incomingTokenHash || incomingTokenHash !== device.device_token_hash) {
        return res.status(401).json({ error: "Unauthorized: invalid or missing device token." });
      }
    } else if (!incomingTokenHash) {
      return res.status(401).json({ error: "Unauthorized: a device token is required to link this node." });
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

    const { supabaseUrl } = getSupabase();
    await fetch(`${supabaseUrl}/rest/v1/iot_devices?id=eq.${encodeURIComponent(device.id)}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(updatePayload),
    });

    const reading = validation.reading;
    await fetch(`${supabaseUrl}/rest/v1/sensor_readings`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(buildReadingRow(device, reading, nowIso)),
    });

    const alertsToCreate = buildAlertsForReading(device, reading, nowIso);
    if (alertsToCreate.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/iot_alerts`, {
        method: "POST",
        headers: headers(),
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
    return addServerError(res, "postTelemetry", err);
  }
};

/**
 * POST /api/iot/device-command — queue a command for the device to pick up.
 */
exports.postDeviceCommand = async (req, res) => {
  try {
    const body = req.body || {};
    const deviceUid = typeof body.deviceUid === "string" ? body.deviceUid.trim() : "";
    const cleanCmdRaw = typeof body.command === "string" ? body.command.trim().toUpperCase() : "";

    if (!deviceUid) {
      return res.status(400).json({ error: "Missing required parameter: deviceUid" });
    }
    if (!cleanCmdRaw) {
      return res.status(400).json({ error: "Missing required parameter: command" });
    }
    if (!COMMANDS.includes(cleanCmdRaw)) {
      return res.status(400).json({ error: `Unknown command "${cleanCmdRaw}". Supported commands: ${COMMANDS.join(", ")}.` });
    }

    const device = await fetchDeviceByUid(deviceUid);
    if (!device) {
      return res.status(404).json({ error: `Device ${deviceUid} is not registered in AgriConnect.` });
    }

    const capabilities = typeof device.capabilities === "object" && device.capabilities !== null ? device.capabilities : {};
    const neededCapability = capabilityForCommand(cleanCmdRaw);
    if (neededCapability && !capabilities[neededCapability]) {
      return res.status(400).json({
        error: `Hardware capability missing on this device. The ${cleanCmdRaw.toLowerCase().split("_")[0]} module is not connected/installed.`,
        deviceUid,
        command: cleanCmdRaw,
        capabilities,
      });
    }

    if (device.status !== "ONLINE") {
      return res.status(400).json({
        error: `Device ${deviceUid} is currently ${device.status}. Commands cannot be sent to disconnected hardware.`,
        deviceUid,
        status: device.status,
      });
    }

    const { supabaseUrl } = getSupabase();
    const cutoff = new Date(Date.now() - COMMAND_DEDUPE_MS).toISOString();
    const dupRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_commands?device_id=eq.${encodeURIComponent(device.id)}&command=eq.${encodeURIComponent(cleanCmdRaw)}&state=eq.QUEUED&issued_at=gte.${encodeURIComponent(cutoff)}&select=id,issued_at`,
      { headers: headers() }
    );
    const existing = dupRes.ok ? await dupRes.json() : [];
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({
        success: false,
        status: "ALREADY_QUEUED",
        commandId: existing[0].id,
        error: `Command ${cleanCmdRaw} is already queued and waiting for the device.`,
      });
    }

    const nowIso = new Date().toISOString();
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/iot_commands`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        device_id: device.id,
        farm_id: device.farm_id,
        command: cleanCmdRaw,
        state: "QUEUED",
        issued_at: nowIso,
        created_at: nowIso,
      }),
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
      deviceUid,
      command: cleanCmdRaw,
      issuedAt: nowIso,
      requiresAck: true,
      message: "Command sent to your device. Waiting for hardware confirmation\u2026",
    });
  } catch (err) {
    return addServerError(res, "postDeviceCommand", err);
  }
};

/**
 * GET /api/iot/commands — device polls for queued commands (token-authenticated).
 */
exports.getCommands = async (req, res) => {
  try {
    const deviceUid = typeof req.query?.deviceUid === "string" ? req.query.deviceUid.trim() : "";
    if (!deviceUid) {
      return res.status(400).json({ error: "Missing required query parameter: deviceUid" });
    }

    const rawToken = req.headers["x-device-token"] || req.headers["x-device-secret"] || null;
    const device = await fetchDeviceByUid(deviceUid);
    if (!device) {
      return res.status(404).json({ error: `Device ${deviceUid} is not registered.`, deviceUid });
    }
    if (!tokenIsValid(device, rawToken)) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing device token." });
    }

    const { supabaseUrl } = getSupabase();
    const commandsRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_commands?device_id=eq.${encodeURIComponent(device.id)}&state=eq.QUEUED&order=issued_at.asc&select=id,command,issued_at`,
      { headers: headers() }
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
    return addServerError(res, "getCommands", err);
  }
};

/**
 * POST /api/iot/command-ack — device confirms execution/failure.
 */
exports.postCommandAck = async (req, res) => {
  try {
    const body = req.body || {};
    const deviceUid = typeof body.deviceUid === "string" ? body.deviceUid.trim() : "";
    const commandId = typeof body.commandId === "string" ? body.commandId.trim() : "";
    const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
    const error = typeof body.error === "string" ? body.error.slice(0, 300) : "";

    const headerToken = req.headers["x-device-token"] || req.headers["x-device-secret"];
    const rawToken = body.deviceToken || headerToken || null;

    if (!deviceUid) return res.status(400).json({ error: "Missing required parameter: deviceUid" });
    if (!commandId) return res.status(400).json({ error: "Missing required parameter: commandId" });
    if (status !== "EXECUTED" && status !== "FAILED") {
      return res.status(400).json({ error: "Invalid status. Expected EXECUTED or FAILED." });
    }

    const device = await fetchDeviceByUid(deviceUid);
    if (!device) {
      return res.status(404).json({ error: `Device ${deviceUid} is not registered.` });
    }
    const incomingHash = hashToken(rawToken);
    if (!device.device_token_hash || !incomingHash || incomingHash !== device.device_token_hash) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing device token." });
    }

    const { supabaseUrl } = getSupabase();
    const cmdRes = await fetch(
      `${supabaseUrl}/rest/v1/iot_commands?id=eq.${encodeURIComponent(commandId)}&device_id=eq.${encodeURIComponent(device.id)}&select=id,command,state`,
      { headers: headers() }
    );
    if (!cmdRes.ok) {
      throw new Error(`Database error fetching command: ${cmdRes.statusText}`);
    }
    const rows = await cmdRes.json();
    const command = Array.isArray(rows) ? rows[0] : undefined;
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
      headers: headers(),
      body: JSON.stringify(ackPayload),
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update command ack: ${updateRes.statusText}`);
    }

    if (status === "FAILED") {
      await fetch(`${supabaseUrl}/rest/v1/iot_alerts`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(buildCommandFailureAlert(device, command.command, commandId, error, nowIso)),
      });
    }

    return res.status(200).json({ success: true, commandId, acknowledged: true, state: status, ackedAt: nowIso });
  } catch (err) {
    return addServerError(res, "postCommandAck", err);
  }
};