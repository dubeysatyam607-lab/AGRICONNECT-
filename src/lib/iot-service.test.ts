import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateDeviceStatus,
  describeCommandLifecycle,
  sendDeviceCommand,
  sendTestTelemetry,
  DEFAULT_CAPABILITIES,
  COMMAND_STATE_LABELS,
} from "./iot-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("iot-service device status (real lastSeen heartbeat only)", () => {
  it("returns NOT_CONNECTED when no heartbeat exists", () => {
    expect(calculateDeviceStatus(null)).toBe("NOT_CONNECTED");
  });

  it("treats an invalid timestamp as NOT_CONNECTED", () => {
    expect(calculateDeviceStatus("garbage")).toBe("NOT_CONNECTED");
  });

  it("returns ONLINE for a fresh heartbeat within the timeout", () => {
    const lastSeen = new Date(Date.now() - 30_000).toISOString();
    expect(calculateDeviceStatus(lastSeen)).toBe("ONLINE");
  });

  it("returns OFFLINE once the heartbeat is stale", () => {
    const lastSeen = new Date(Date.now() - 301_000).toISOString();
    expect(calculateDeviceStatus(lastSeen)).toBe("OFFLINE");
  });

  it("respects a custom timeout window", () => {
    const lastSeen = new Date(Date.now() - 10_000).toISOString();
    expect(calculateDeviceStatus(lastSeen, 5)).toBe("OFFLINE");
  });
});

describe("iot-service command lifecycle (never optimistic)", () => {
  it("starts idle", () => {
    expect(describeCommandLifecycle(null, null)).toEqual({ phase: "idle", label: "Ready" });
  });

  it("maps QUEUED to waiting for the device", () => {
    const lc = describeCommandLifecycle("2026-09-26T00:00:00Z", "QUEUED");
    expect(lc.phase).toBe("queued");
    expect(lc.label).toBe(COMMAND_STATE_LABELS.QUEUED);
  });

  it("maps EXECUTED only after the hardware confirms", () => {
    const lc = describeCommandLifecycle("2026-09-26T00:00:00Z", "EXECUTED");
    expect(lc.phase).toBe("executed");
    expect(lc.label).toBe(COMMAND_STATE_LABELS.EXECUTED);
  });

  it("maps FAILED and EXPIRED to the failed phase", () => {
    expect(describeCommandLifecycle("2026-09-26T00:00:00Z", "FAILED").phase).toBe("failed");
    expect(describeCommandLifecycle("2026-09-26T00:00:00Z", "EXPIRED").phase).toBe("failed");
  });
});

describe("iot-service sendDeviceCommand (ack-based QUEUED response)", () => {
  it("parses a QUEUED response with the commandId for ack tracking", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        status: "QUEUED",
        commandId: "cmd-123",
        message: "Command sent to your device. Waiting for hardware confirmation…",
      }),
    }));

    const res = await sendDeviceCommand("AGRI-ESP32-001", "PUMP_ON");
    expect(res.success).toBe(true);
    expect(res.status).toBe("QUEUED");
    expect(res.commandId).toBe("cmd-123");
    expect(res.message).toContain("Waiting for hardware confirmation");
  });

  it("does not claim success when the server rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: "Device is currently OFFLINE." }),
    }));
    const res = await sendDeviceCommand("AGRI-ESP32-001", "ARM_FENCE");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Device is currently");
  });

  it("surfaces ALREADY_QUEUED with the existing commandId", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({ status: "ALREADY_QUEUED", commandId: "cmd-dup" }),
    }));
    const res = await sendDeviceCommand("AGRI-ESP32-001", "BUZZER_ON");
    expect(res.success).toBe(false);
    expect(res.status).toBe("ALREADY_QUEUED");
    expect(res.commandId).toBe("cmd-dup");
  });

  it("returns a friendly message on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const res = await sendDeviceCommand("AGRI-ESP32-001", "BUZZER_ON");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/network|failed/i);
  });
});

describe("iot-service sendTestTelemetry", () => {
  it("surfaces backend validation errors verbatim", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Invalid temperature value. Expected -50 to 100 (°C)." }),
    }));
    const res = await sendTestTelemetry({ deviceUid: "AGRI-ESP32-001", temperature: 9999 });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Invalid temperature");
  });
});

describe("iot-service defaults", () => {
  it("ships pump disabled by default (capability must be wired explicitly)", () => {
    expect(DEFAULT_CAPABILITIES.pump).toBe(false);
    expect(DEFAULT_CAPABILITIES.buzzer).toBe(false);
    expect(DEFAULT_CAPABILITIES.laserFence).toBe(false);
  });
});