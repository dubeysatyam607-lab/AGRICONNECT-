/**
 * AgriConnect IoT Service
 *
 * Provides functions for querying real device status, telemetry readings,
 * alerts, device registration, and sending remote commands.
 */

import { supabase } from "@/integrations/supabase/client";

export interface IotDeviceCapabilities {
  soilMoisture: boolean;
  temperature: boolean;
  humidity: boolean;
  rain: boolean;
  laserFence: boolean;
  buzzer: boolean;
}

export type DeviceStatus = "ONLINE" | "OFFLINE" | "NOT_CONNECTED";
export type FenceStatus = "NOT_CONNECTED" | "ARMED" | "NORMAL" | "INTRUSION" | "FAULT" | "OFFLINE";

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
};

/** Calculate effective device status based on last_seen timestamp */
export const calculateDeviceStatus = (lastSeen: string | null, configuredTimeoutSec = 300): DeviceStatus => {
  if (!lastSeen) return "NOT_CONNECTED";
  const diffSec = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (isNaN(diffSec) || diffSec < 0) return "NOT_CONNECTED";
  if (diffSec <= configuredTimeoutSec) return "ONLINE";
  return "OFFLINE";
};

/** Fetch IoT devices belonging to a farm */
export const fetchFarmDevices = async (farmId: string): Promise<IotDevice[]> => {
  try {
    const { data, error } = await supabase
      .from("iot_devices")
      .select("*")
      .eq("farm_id", farmId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[iot-service] Error fetching devices:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
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

/** Fetch latest sensor reading for a device */
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

/** Fetch recent IoT alerts for a farm */
export const fetchRecentAlerts = async (farmId: string): Promise<IotAlert[]> => {
  try {
    const { data, error } = await supabase
      .from("iot_alerts")
      .select("*")
      .eq("farm_id", farmId)
      .order("created_at", { ascending: false })
      .limit(10);

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

/** Register a new ESP32 device for a farm */
export const registerIotDevice = async (params: {
  deviceUid: string;
  deviceName?: string;
  farmId: string;
  userId?: string | null;
  capabilities?: Partial<IotDeviceCapabilities>;
}): Promise<{ success: boolean; device?: IotDevice; error?: string }> => {
  try {
    const uid = params.deviceUid.trim();
    if (!uid) return { success: false, error: "Device UID is required" };

    const payload = {
      device_uid: uid,
      device_name: params.deviceName || `ESP32 Node (${uid})`,
      farm_id: params.farmId,
      user_id: params.userId || null,
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
      return { success: false, error: error.message };
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

/** Send remote command to an ESP32 device */
export const sendDeviceCommand = async (
  deviceUid: string,
  command: "BUZZER_ON" | "BUZZER_OFF" | "ARM_FENCE" | "DISARM_FENCE"
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const response = await fetch("/api/iot/device-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceUid, command }),
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.error || "Failed to send command" };
    }

    return { success: true, message: result.message };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error sending command" };
  }
};

/** Send telemetry to backend for testing / hardware verification */
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

/** Prepare real IoT readings as context for Kisan Saathi AI */
export const getIotFarmContext = async (farmId: string): Promise<Record<string, unknown> | null> => {
  const devices = await fetchFarmDevices(farmId);
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
