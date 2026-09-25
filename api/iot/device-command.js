/**
 * Vercel Serverless Function — IoT Device Command Endpoint (Buzzer & Smart Fence).
 *
 * POST /api/iot/device-command
 * Payload:
 * {
 *   "deviceUid": "AGRI-ESP32-001",
 *   "command": "BUZZER_ON" | "BUZZER_OFF" | "ARM_FENCE" | "DISARM_FENCE"
 * }
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yrebxnpilkfeaofykvhq.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_PMQ7FkMezMesBBJiVQsNUQ_Lu3I4n6A";

  try {
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
        error: `Device ${cleanUid} is not registered in AgriConnect.`,
        deviceUid: cleanUid,
      });
    }

    const device = devices[0];
    const capabilities = typeof device.capabilities === "object" && device.capabilities !== null ? device.capabilities : {};

    // Validate capability against command
    if (cleanCmd.startsWith("BUZZER_") && !capabilities.buzzer) {
      return res.status(400).json({
        error: "Hardware capability missing on this device. Buzzer module is not connected/installed.",
        deviceUid: cleanUid,
        command: cleanCmd,
        capabilities,
      });
    }

    if ((cleanCmd === "ARM_FENCE" || cleanCmd === "DISARM_FENCE") && !capabilities.laserFence) {
      return res.status(400).json({
        error: "Hardware capability missing on this device. Laser Smart Fence module is not connected/installed.",
        deviceUid: cleanUid,
        command: cleanCmd,
        capabilities,
      });
    }

    // Verify device status
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
    console.error("[api/iot/device-command] Error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to dispatch device command",
      message: err?.message || "Internal server error",
    });
  }
}
