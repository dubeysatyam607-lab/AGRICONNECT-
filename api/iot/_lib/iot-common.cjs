/**
 * AgriConnect IoT — shared backend helpers (validation, auth, alerts, queue rules).
 *
 * Plain CommonJS so it can be consumed both by the Vercel serverless functions
 * (ESM `import` of a .cjs default export) and the Express server (`require`).
 */

const crypto = require("crypto");

// ── Device / command protocol constants ───────────────────────────────────
const COMMANDS = ["BUZZER_ON", "BUZZER_OFF", "ARM_FENCE", "DISARM_FENCE", "PUMP_ON", "PUMP_OFF"];
const FENCE_STATES = ["NOT_CONNECTED", "ARMED", "NORMAL", "INTRUSION", "FAULT", "OFFLINE"];
const OFFLINE_TIMEOUT_SEC = 300; // matches client calculateDeviceStatus default
const COMMAND_DEDUPE_MS = 60 * 1000; // identical outstanding command dedupe window
const COMMAND_POLL_INTERVAL_SEC = 15; // ESP32 polls /api/iot/commands every 15s

// Capability gate per command
function capabilityForCommand(command) {
  if (command.startsWith("BUZZER_")) return "buzzer";
  if (command === "ARM_FENCE" || command === "DISARM_FENCE") return "laserFence";
  if (command === "PUMP_ON" || command === "PUMP_OFF") return "pump";
  return null;
}

// ── Supabase config (FAIL CLOSED — never embed a fallback credential) ─────
function resolveSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";
  if (!url || !key) {
    const err = new Error(
      "SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_URL are not configured. IoT endpoints fail closed until secrets are set."
    );
    err.code = "IOT_CONFIG_MISSING";
    throw err;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

// ── Token hashing ─────────────────────────────────────────────────────────
function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return null;
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

function tokenIsValid(device, rawToken) {
  if (!device || !device.device_token_hash) return false;
  const incoming = hashToken(rawToken);
  return Boolean(incoming) && incoming === device.device_token_hash;
}

// ── Payload sanitisation / validation ─────────────────────────────────────
function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sanitizeFenceStatus(value) {
  if (!value) return "NOT_CONNECTED";
  const upper = String(value).toUpperCase();
  return FENCE_STATES.includes(upper) ? upper : "NOT_CONNECTED";
}

/**
 * Validates an inbound telemetry payload.
 * Returns { ok, errors, reading } where `reading` holds either all `null`
 * (nothing was reported) or normalized numbers within the accepted ranges.
 */
function validateTelemetry(body) {
  const errors = [];
  const reading = {
    soil_moisture: null,
    temperature: null,
    humidity: null,
    rain_value: null,
    fence_status: "NOT_CONNECTED",
  };

  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Missing telemetry payload."], reading };
  }

  const soil = toFiniteNumber(body.soilMoisture);
  const temp = toFiniteNumber(body.temperature);
  const humid = toFiniteNumber(body.humidity);
  const rain = toFiniteNumber(body.rainValue);

  if (soil !== null && (soil < 0 || soil > 10000)) {
    errors.push("Invalid soilMoisture value. Expected numeric ADC reading or percentage.");
  } else reading.soil_moisture = soil;

  if (temp !== null && (temp < -50 || temp > 100)) {
    errors.push("Invalid temperature value. Expected -50 to 100 (°C).");
  } else reading.temperature = temp;

  if (humid !== null && (humid < 0 || humid > 100)) {
    errors.push("Invalid humidity value. Expected 0 to 100 (%).");
  } else reading.humidity = humid;

  if (rain !== null && (rain < 0 || rain > 10000)) {
    errors.push("Invalid rainValue. Expected numeric reading.");
  } else reading.rain_value = rain;

  reading.fence_status = sanitizeFenceStatus(body.fenceStatus);

  return { ok: errors.length === 0, errors, reading };
}

function readingHasData(reading) {
  return (reading && ["soil_moisture", "temperature", "humidity", "rain_value"]).some(
    (key) => reading[key] !== null && reading[key] !== undefined
  );
}

/**
 * Builds the sensor_readings insert row from a validated reading.
 */
function buildReadingRow(device, reading, nowIso) {
  return {
    device_id: device.id,
    farm_id: device.farm_id,
    soil_moisture: reading.soil_moisture,
    temperature: reading.temperature,
    humidity: reading.humidity,
    rain_value: reading.rain_value,
    fence_status: reading.fence_status,
    created_at: nowIso,
  };
}

/**
 * Derives farmer alerts from a validated reading. Returns an array of alert rows.
 */
function buildAlertsForReading(device, reading, nowIso) {
  const alerts = [];
  const base = { farm_id: device.farm_id, device_id: device.id, created_at: nowIso };

  if (reading.fence_status === "INTRUSION") {
    alerts.push({
      ...base,
      alert_type: "FENCE_INTRUSION",
      severity: "CRITICAL",
      message: `Intrusion detected at ${device.device_name}: the perimeter sensor beam was interrupted.`,
    });
  }

  if (reading.soil_moisture !== null && reading.soil_moisture <= 100 && reading.soil_moisture < 20) {
    alerts.push({
      ...base,
      alert_type: "LOW_SOIL_MOISTURE",
      severity: "WARNING",
      message: `Low soil moisture (${reading.soil_moisture}%) at ${device.device_name}. Consider irrigating the plot soon.`,
    });
  }

  if (!readingHasData(reading)) {
    alerts.push({
      ...base,
      alert_type: "SENSOR_ERROR",
      severity: "WARNING",
      message: `${device.device_name} is connected but is not reporting any sensor values. Check the wiring or the sensor module.`,
    });
  }

  return alerts;
}

function buildCommandFailureAlert(device, command, commandId, error, nowIso) {
  return {
    farm_id: device.farm_id,
    device_id: device.id,
    alert_type: "SENSOR_ERROR",
    severity: "WARNING",
    message: `Command ${command} on ${device.device_name} could not be executed by the device${error ? ` (${error})` : ""}.`,
    created_at: nowIso,
  };
}

module.exports = {
  COMMANDS,
  FENCE_STATES,
  OFFLINE_TIMEOUT_SEC,
  COMMAND_DEDUPE_MS,
  COMMAND_POLL_INTERVAL_SEC,
  capabilityForCommand,
  resolveSupabaseConfig,
  hashToken,
  tokenIsValid,
  toFiniteNumber,
  sanitizeFenceStatus,
  validateTelemetry,
  readingHasData,
  buildReadingRow,
  buildAlertsForReading,
  buildCommandFailureAlert,
};