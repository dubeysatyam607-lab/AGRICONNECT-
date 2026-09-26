/**
 * AgriConnect IoT Service
 *
 * Provides functions for querying real device status, telemetry readings,
 * alerts, device registration, reading history, and the acknowledge-based
 * command lifecycle. All data here comes from physical hardware — the only
 * place demo/simulated flows are ever possible is the gated mock mode in
 * @/lib/iot-mock-mode.
 */

import { supabase } from "@/integrations/supabase/client";

export interface IotDeviceCapabilities {
  soilMoisture: boolean;
  temperature: boolean;
  humidity: boolean;
  rain: boolean;
  laserFence: boolean;
  buzzer: boolean;
  pump: boolean;
}

export type DeviceStatus = "ONLINE" | "OFFLINE" | "NOT_CONNECTED";
export type FenceStatus = "NOT_CONNECTED" | "ARMED" | "NORMAL" | "INTRUSION" | "FAULT" | "OFFLINE";

export type IotCommandName = "BUZZER_ON" | "BUZZER_OFF" | "ARM_FENCE" | "DISARM_FENCE" | "PUMP_ON" | "PUMP_OFF";
export type IotCommandState = "QUEUED" | "EXECUTED" | "FAILED" | "EXPIRED";

export interface IotCommand {
  id: string;
  device_id: string;
  farm_id: string;
  command: IotCommandName;
  state: IotCommandState;
  error: string | null;
  issued_at: string;
  acked_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface IotDevice {
  id: string;
  user_id: string | null;
  farm_id: string;
  device_name: string;
  device_type: string;
  device_uid: string;
  status: DeviceStatus;
  capabilities: IotDeviceCapabilities;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: string;
  device_id: string;
  farm_id: string;
  soil_moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  rain_value: number | null;
  fence_status: FenceStatus | null;
  created_at: string;
}

export interface IotAlert {
  id: string;
  farm_id: string;
  device_id: string;
  alert_type: "LOW_SOIL_MOISTURE" | "HEAVY_RAIN" | "DEVICE_OFFLINE" | "SENSOR_ERROR" | "FENCE_INTRUSION";
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  is_read: boolean;
  created_at: string;
}

export const DEFAULT_CAPABILITIES: IotDeviceCapabilities = {
  soilMoisture: true,
  temperature: true,
  humidity: true,
  rain: true,
  laserFence: false,
  buzzer: false,
  pump: false,
};

export const COMMAND_STATE_LABELS: Record<IotCommandState, string> = {
  QUEUED: "Waiting for the device",
  EXECUTED: "Confirmed by device",
  FAILED: "Device reported a failure",
  EXPIRED: "Timed out",
};

/**
 * Effective device status based on the real last_seen heartbeat.
 * A device is ONLINE only while its last_seen is within the timeout window.
 */
export const calculateDeviceStatus = (lastSeen: string | null, configuredTimeoutSec = 300): DeviceStatus => {
  if (!lastSeen) return "NOT_CONNECTED";
  const diffSec = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (isNaN(diffSec) || diffSec < 0) return "NOT_CONNECTED";
  if (diffSec <= configuredTimeoutSec) return "ONLINE";
  return "OFFLINE";
};

export interface CommandLifecycle {
  phase: "idle" | "sending" | "queued" | "executed" | "failed";
  label: string;
}

export const describeCommandLifecycle = (issuedAt: string | null, state: IotCommandState | null): CommandLifecycle => {
  if (state === "EXECUTED") return { phase: "executed", label: COMMAND_STATE_LABELS.EXECUTED };
  if (state === "FAILED") return { phase: "failed", label: COMMAND_STATE_LABELS.FAILED };
  if (state === "EXPIRED") return { phase: "failed", label: COMMAND_STATE_LABELS.EXPIRED };
  if (state === "QUEUED" || issuedAt) return { phase: "queued", label: COMMAND_STATE_LABELS.QUEUED };
  return { phase: "idle", label: "Ready" };
};

/** Fetch IoT devices owned by the authenticated user (RLS + explicit filter). */
export const fetchFarmDevices = async (farmId: string, userId?: string | null): Promise<IotDevice[]> => {
  try {
    let query = supabase
      .from("iot_devices")
      .select("*")
      .eq("farm_id", farmId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[iot-service] Error fetching devices:", error.message);
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => ({
      ...row,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        ...(typeof row.capabilities === "object" && row.capabilities ? row.capabilities : {}),
      },
      status: calculateDeviceStatus(row.last_seen),
    })) as IotDevice[];
  } catch (e) {
    console.error("[iot-service] Failed to fetch farm devices:", e);
    return [];
  }
};

/** Fetch the latest sensor reading for a device (real data only). */
export const fetchLatestReading = async (deviceId: string): Promise<SensorReading | null> => {
  try {
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[iot-service] Error fetching latest reading:", error.message);
      return null;
    }

    return (data as SensorReading) || null;
  } catch (e) {
    console.error("[iot-service] Failed to fetch latest reading:", e);
    return null;
  }
};

/** Fetch recent sensor reading history (used for charts). */
export const fetchReadingHistory = async (deviceId: string, limit = 48): Promise<SensorReading[]> => {
  try {
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("id,device_id,farm_id,soil_moisture,temperature,humidity,rain_value,fence_status,created_at")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[iot-service] Error fetching reading history:", error.message);
      return [];
    }

    return ((data as SensorReading[]) || []).slice().reverse();
  } catch (e) {
    console.error("[iot-service] Failed to fetch reading history:", e);
    return [];
  }
};

/** Fetch recent IoT alerts for the authenticated user's devices. */
export const fetchRecentAlerts = async (limit = 10): Promise<IotAlert[]> => {
  try {
    const { data, error } = await supabase
      .from("iot_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[iot-service] Error fetching alerts:", error.message);
      return [];
    }

    return (data as IotAlert[]) || [];
  } catch (e) {
    console.error("[iot-service] Failed to fetch alerts:", e);
    return [];
  }
};

/** Mark a single alert as read. */
export const markAlertRead = async (alertId: string): Promise<void> => {
  try {
    await supabase.from("iot_alerts").update({ is_read: true }).eq("id", alertId);
  } catch (e) {
    console.error("[iot-service] Failed to mark alert read:", e);
  }
};

/** Recent command activity for a device (real ack states). */
export const fetchRecentCommands = async (deviceId: string, limit = 5): Promise<IotCommand[]> => {
  try {
    const { data, error } = await supabase
      .from("iot_commands")
      .select("*")
      .eq("device_id", deviceId)
      .order("issued_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[iot-service] Error fetching commands:", error.message);
      return [];
    }

    return (data as IotCommand[]) || [];
  } catch (e) {
    console.error("[iot-service] Failed to fetch commands:", e);
    return [];
  }
};

/** Register a real hardware device. user_id is required for ownership. */
export const registerIotDevice = async (params: {
  deviceUid: string;
  deviceName?: string;
  farmId: string;
  userId: string;
  capabilities?: Partial<IotDeviceCapabilities>;
}): Promise<{ success: boolean; alreadyRegistered?: boolean; device?: IotDevice; error?: string }> => {
  try {
    const uid = params.deviceUid.trim();
    if (!uid) return { success: false, error: "Device UID is required" };
    if (!params.userId) return { success: false, error: "Sign in to register a device" };

    const existing = await supabase
      .from("iot_devices")
      .select("*")
      .eq("device_uid", uid)
      .maybeSingle();

    if (existing.error) return { success: false, error: existing.error.message };

    if (existing.data) {
      if (existing.data.user_id === params.userId) {
        return {
          success: true,
          alreadyRegistered: true,
          device: {
            ...existing.data,
            capabilities: { ...DEFAULT_CAPABILITIES, ...(existing.data.capabilities as object) },
            status: existing.data.status || "NOT_CONNECTED",
          } as IotDevice,
        };
      }
      return {
        success: false,
        error: "This device UID is already registered to another account. Use a unique name like AGRI-ESP32-002.",
      };
    }

    const payload = {
      device_uid: uid,
      device_name: params.deviceName || `ESP32 Node (${uid})`,
      farm_id: params.farmId,
      user_id: params.userId,
      device_type: "ESP32_FARM_NODE",
      status: "NOT_CONNECTED" as const,
      capabilities: { ...DEFAULT_CAPABILITIES, ...(params.capabilities || {}) },
    };

    const { data, error } = await supabase
      .from("iot_devices")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[iot-service] Error registering device:", error.message);
      const isConflict = typeof error.code === "string" && /^23/.test(error.code);
      return {
        success: false,
        error: isConflict
          ? "Device UID already exists. Use a unique name (e.g. AGRI-ESP32-002)."
          : error.message,
      };
    }

    return {
      success: true,
      device: {
        ...data,
        capabilities: { ...DEFAULT_CAPABILITIES, ...(data.capabilities as object) },
        status: "NOT_CONNECTED",
      } as IotDevice,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to register device" };
  }
};

/**
 * Queue a remote command. Returns the server's QUEUED state with the commandId.
 * The UI must NOT show success — it must wait for the device ack via realtime
 * (iot_commands EXECUTED/FAILED).
 */
export const sendDeviceCommand = async (
  deviceUid: string,
  command: IotCommandName
): Promise<{
  success: boolean;
  status?: "QUEUED" | "ALREADY_QUEUED";
  commandId?: string;
  message?: string;
  error?: string;
}> => {
  try {
    const response = await fetch("/api/iot/device-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceUid, command }),
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.error || (response.status === 409 ? "Command is already waiting for the device" : "Failed to send command"),
        status: result.status,
        commandId: result.commandId,
      };
    }

    return {
      success: true,
      status: result.status || "QUEUED",
      commandId: result.commandId,
      message: result.message,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error sending command" };
  }
};

/**
 * Demo telemetry (mock mode only). This posts to the real backend — it is used
 * ONLY to verify wiring while developing/test-benching, and is hidden whenever
 * VITE_IOT_MOCK_MODE is not enabled.
 */
export const sendTestTelemetry = async (payload: {
  deviceUid: string;
  soilMoisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainValue?: number | null;
  fenceStatus?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const response = await fetch("/api/iot/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.error || "Telemetry post failed" };
    }

    return { success: true, message: result.message };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error sending telemetry" };
  }
};

/** Prepare real IoT readings as context for Kisan Saathi AI. */
export const getIotFarmContext = async (farmId: string, userId?: string | null): Promise<Record<string, unknown> | null> => {
  const devices = await fetchFarmDevices(farmId, userId);
  const connectedDevice = devices.find((d) => d.status === "ONLINE");
  if (!connectedDevice) return null;

  const latestReading = await fetchLatestReading(connectedDevice.id);
  if (!latestReading) return null;

  return {
    isIotConnected: true,
    deviceUid: connectedDevice.device_uid,
    deviceName: connectedDevice.device_name,
    soilMoisture: latestReading.soil_moisture,
    temperature: latestReading.temperature,
    humidity: latestReading.humidity,
    rainValue: latestReading.rain_value,
    fenceStatus: latestReading.fence_status,
    lastUpdated: latestReading.created_at,
  };
};