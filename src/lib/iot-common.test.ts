import { describe, it, expect } from "vitest";
import iotCommon from "../../api/iot/_lib/iot-common.cjs";

const {
  COMMANDS,
  capabilityForCommand,
  hashToken,
  sanitizeFenceStatus,
  validateTelemetry,
  readingHasData,
  buildReadingRow,
  buildAlertsForReading,
  COMMAND_DEDUPE_MS,
  COMMAND_POLL_INTERVAL_SEC,
} = iotCommon;

describe("iot validation module (shared backend logic)", () => {
  it("exposes the documented command whitelist", () => {
    expect(COMMANDS).toEqual([
      "BUZZER_ON",
      "BUZZER_OFF",
      "ARM_FENCE",
      "DISARM_FENCE",
      "PUMP_ON",
      "PUMP_OFF",
    ]);
  });

  it("maps commands to the capability they require", () => {
    expect(capabilityForCommand("BUZZER_ON")).toBe("buzzer");
    expect(capabilityForCommand("ARM_FENCE")).toBe("laserFence");
    expect(capabilityForCommand("PUMP_ON")).toBe("pump");
    expect(capabilityForCommand("NOT_A_COMMAND")).toBeNull();
  });

  it("hashes device tokens deterministically", () => {
    expect(hashToken("  secret  ")).toBe(hashToken("secret"));
    expect(hashToken("")).toBeNull();
    expect(hashToken(null)).toBeNull();
    expect(hashToken("secret")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts a valid telemetry payload", () => {
    const result = validateTelemetry({
      soilMoisture: 1842,
      temperature: 28.4,
      humidity: 71,
      rainValue: 840,
    });
    expect(result.ok).toBe(true);
    expect(result.reading.soil_moisture).toBe(1842);
    expect(result.reading.fence_status).toBe("NOT_CONNECTED");
  });

  it("rejects out-of-range physical values (no fake data can enter)", () => {
    expect(validateTelemetry({ temperature: 101 }).ok).toBe(false);
    expect(validateTelemetry({ temperature: -51 }).ok).toBe(false);
    expect(validateTelemetry({ humidity: 101 }).ok).toBe(false);
    expect(validateTelemetry({ soilMoisture: -1 }).ok).toBe(false);
    expect(validateTelemetry({ soilMoisture: 10001 }).ok).toBe(false);
    expect(validateTelemetry({ rainValue: -1 }).ok).toBe(false);
  });

  it("rejects non-numeric values instead of coercing NaN", () => {
    const result = validateTelemetry({ soilMoisture: "abc" });
    expect(result.ok).toBe(true); // non-numeric is treated as absent, not fake
    expect(result.reading.soil_moisture).toBeNull();
    expect(readingHasData(result.reading)).toBe(false);
  });

  it("normalises fence status safely", () => {
    expect(sanitizeFenceStatus("intrusion")).toBe("INTRUSION");
    expect(sanitizeFenceStatus("GARBAGE")).toBe("NOT_CONNECTED");
    expect(sanitizeFenceStatus(undefined)).toBe("NOT_CONNECTED");
  });

  it("builds a sensor reading row keyed to the real device", () => {
    const device = { id: "dev-1", farm_id: "farm_x" };
    const row = buildReadingRow(device, { soil_moisture: 10, temperature: 25, humidity: 60, rain_value: 100, fence_status: "NORMAL" }, "2026-09-26T00:00:00Z");
    expect(row.device_id).toBe("dev-1");
    expect(row.farm_id).toBe("farm_x");
    expect(row.created_at).toBe("2026-09-26T00:00:00Z");
  });

  it("derives intrusion and low-moisture alerts only from real values", () => {
    const device = { id: "dev-1", farm_id: "farm_x", device_name: "Node A" };
    const alerts = buildAlertsForReading(
      device,
      { soil_moisture: 12, temperature: 25, humidity: 60, rain_value: 100, fence_status: "INTRUSION" },
      "2026-09-26T00:00:00Z"
    );
    const types = alerts.map((a) => a.alert_type);
    expect(types).toContain("FENCE_INTRUSION");
    expect(types).toContain("LOW_SOIL_MOISTURE");
    expect(alerts.every((a) => a.message.length > 0)).toBe(true);
  });

  it("creates a sensor-error alert when a connected node reports no data", () => {
    const device = { id: "dev-1", farm_id: "farm_x", device_name: "Node A" };
    const alerts = buildAlertsForReading(
      device,
      { soil_moisture: null, temperature: null, humidity: null, rain_value: null, fence_status: "NOT_CONNECTED" },
      "2026-09-26T00:00:00Z"
    );
    expect(alerts.map((a) => a.alert_type)).toContain("SENSOR_ERROR");
  });

  it("keeps safe command protocol timing values", () => {
    expect(COMMAND_DEDUPE_MS).toBe(60_000);
    expect(COMMAND_POLL_INTERVAL_SEC).toBe(15);
  });
});