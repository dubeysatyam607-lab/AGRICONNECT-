import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarm } from "@/contexts/FarmContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Droplets,
  Thermometer,
  Wind,
  CloudRain,
  Fence,
  Volume2,
  Radio,
  AlertTriangle,
  RefreshCw,
  Plus,
  Cpu,
  Sliders,
  Bell,
  Clock,
  Send,
  Info,
  CheckCircle2,
  XCircle,
  History,
  ChevronDown,
  Sparkles,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFarmDevices,
  fetchLatestReading,
  fetchReadingHistory,
  fetchRecentAlerts,
  fetchRecentCommands,
  registerIotDevice,
  sendDeviceCommand,
  sendTestTelemetry,
  markAlertRead,
  type IotDevice,
  type SensorReading,
  type IotAlert,
  type IotCommand,
  type DeviceStatus,
  type FenceStatus,
  type IotCommandName,
  type CommandLifecycle,
  describeCommandLifecycle,
  DEFAULT_CAPABILITIES,
} from "@/lib/iot-service";
import { IOT_MOCK_MODE_ENABLED, IOT_MOCK_MODE_LABEL, IOT_MOCK_MODE_HINT } from "@/lib/iot-mock-mode";
import { getIoTImage } from "@/lib/imageService";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export type DashboardState = "INITIAL" | "NO_DEVICE" | "CONNECTING" | "ONLINE" | "OFFLINE" | "NOT_CONNECTED" | "ERROR";

const formatRelativeTime = (timestamp: string | null, now = Date.now()): string => {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Unknown";
  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const HistoryMetric = { moisture: "soil_moisture", temperature: "temperature", humidity: "humidity", rain: "rain_value" } as const;
type HistoryMetricKey = keyof typeof HistoryMetric;

const HardwareDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { profile } = useFarm();
  const { user } = useAuth();
  const { toast } = useToast();

  const userId = user?.id || null;
  const farmId = profile.crop ? `farm_${profile.crop.toLowerCase().replace(/\s+/g, "_")}` : "default_farm";
  const farmDisplayName = `${profile.crop || "My"} Farm (${profile.farmArea || 5.2} acres)`;

  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<IotDevice | null>(null);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [commands, setCommands] = useState<IotCommand[]>([]);
  const [dashboardState, setDashboardState] = useState<DashboardState>("INITIAL");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Command ack state machine (per command name)
  const [commandStates, setCommandStates] = useState<Partial<Record<IotCommandName, CommandLifecycle>>>({});
  const lastCommandIdRef = useRef<string | null>(null);
  const selectedDeviceRef = useRef<IotDevice | null>(null);
  selectedDeviceRef.current = selectedDevice;
  const isFetchingRef = useRef<boolean>(false);

  // Live relative timestamps
  const [now, setNow] = useState<number>(Date.now());

  // Diagnostics state
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const [lastApiStatus, setLastApiStatus] = useState<number | string>(200);

  // Dialog states
  const [registerOpen, setRegisterOpen] = useState<boolean>(false);
  const [testModeOpen, setTestModeOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [fenceGuideOpen, setFenceGuideOpen] = useState<boolean>(false);
  const [historyMetric, setHistoryMetric] = useState<HistoryMetricKey>("moisture");

  // Registration form
  const [newUid, setNewUid] = useState<string>("AGRI-ESP32-001");
  const [newName, setNewName] = useState<string>("Main Field Node");
  const [newToken, setNewToken] = useState<string>("");
  const [newCapabilities, setNewCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Telemetry simulator (mock mode only)
  const [simSoil, setSimSoil] = useState<number>(1842);
  const [simTemp, setSimTemp] = useState<number>(28.4);
  const [simHumid, setSimHumid] = useState<number>(71);
  const [simRain, setSimRain] = useState<number>(840);
  const [simFence, setSimFence] = useState<FenceStatus>("NOT_CONNECTED");
  const [isSendingSim, setIsSendingSim] = useState<boolean>(false);

  // Live ticker so relative timestamps refresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = useCallback(async (): Promise<IotDevice | null> => {
    if (isFetchingRef.current) return selectedDeviceRef.current;
    isFetchingRef.current = true;
    setDashboardState((prev) => (prev === "INITIAL" ? "CONNECTING" : prev));
    try {
      const farmDevs = await fetchFarmDevices(farmId, userId);

      if (!farmDevs || farmDevs.length === 0) {
        setDevices([]);
        setSelectedDevice(null);
        setLatestReading(null);
        setHistory([]);
        setAlerts([]);
        setCommands([]);
        setDashboardState("NO_DEVICE");
        return null;
      }

      // Smart device selection:
      // 1. Keep currently selected device if it still exists in the farm's devices
      // 2. Prioritize an ONLINE device
      // 3. Prioritize device with the most recent last_seen timestamp
      // 4. Fallback to the first registered device
      const currentSelected = selectedDeviceRef.current;
      let activeDev = farmDevs.find((d) => d.id === currentSelected?.id);
      if (!activeDev) {
        activeDev = farmDevs.find((d) => d.status === "ONLINE");
      }
      if (!activeDev) {
        const sortedByLastSeen = [...farmDevs]
          .filter((d) => d.last_seen)
          .sort((a, b) => new Date(b.last_seen!).getTime() - new Date(a.last_seen!).getTime());
        if (sortedByLastSeen.length > 0) {
          activeDev = sortedByLastSeen[0];
        }
      }
      if (!activeDev) {
        activeDev = farmDevs[0];
      }

      // Safely fetch telemetry sub-data using Promise.allSettled so partial errors don't fail the whole view
      const [readingRes, historyRes, alertsRes, commandsRes] = await Promise.allSettled([
        fetchLatestReading(activeDev.id),
        fetchReadingHistory(activeDev.id, 48),
        fetchRecentAlerts(12),
        fetchRecentCommands(activeDev.id, 5),
      ]);

      const reading = readingRes.status === "fulfilled" ? readingRes.value : null;
      const historyData = historyRes.status === "fulfilled" ? historyRes.value : [];
      const alertsData = alertsRes.status === "fulfilled" ? alertsRes.value : [];
      const commandsData = commandsRes.status === "fulfilled" ? commandsRes.value : [];

      if (reading) setLatestReading(reading);
      setHistory(historyData);
      setAlerts(alertsData);
      setCommands(commandsData);

      const readingTime = reading?.created_at;
      const devTime = activeDev.last_seen;

      let effectiveLastSeen = devTime;
      if (readingTime) {
        if (!devTime) {
          effectiveLastSeen = readingTime;
        } else {
          const rDate = new Date(readingTime).getTime();
          const dDate = new Date(devTime).getTime();
          if (!isNaN(rDate) && (isNaN(dDate) || rDate > dDate)) {
            effectiveLastSeen = readingTime;
          }
        }
      }

      const effectiveStatus = calculateDeviceStatus(effectiveLastSeen);
      const updatedDev: IotDevice = {
        ...activeDev,
        last_seen: effectiveLastSeen,
        status: effectiveStatus,
      };

      const updatedDevices = farmDevs.map((d) => (d.id === updatedDev.id ? updatedDev : d));
      setDevices(updatedDevices);
      setSelectedDevice((prev) => {
        if (!prev) return updatedDev;
        const matched = updatedDevices.find((d) => d.id === prev.id);
        return matched || updatedDev;
      });
      setDashboardState(effectiveStatus);

      if (readingTime && (!devTime || new Date(readingTime) > new Date(devTime))) {
        supabase
          .from("iot_devices")
          .update({ last_seen: readingTime, status: effectiveStatus, updated_at: new Date().toISOString() })
          .eq("id", activeDev.id)
          .then(() => {});
      }

      return updatedDev;
    } catch (err) {
      console.error("[HardwareDashboard] Error loading IoT data:", err);
      setSelectedDevice((prev) => {
        if (!prev) setDashboardState("ERROR");
        return prev;
      });
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, [farmId, userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-poll telemetry & device status every 5 seconds without overlapping requests
  useEffect(() => {
    let active = true;
    const interval = setInterval(() => {
      if (active) {
        loadDashboardData();
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loadDashboardData]);

  // Single realtime subscription, created once. Navigation Home → IoT → Home
  // cannot stack duplicates because only one channel is ever subscribed.
  useEffect(() => {
    const channel = supabase
      .channel(`iot_realtime_${farmId}_${userId ?? "guest"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "iot_devices" },
        () => {
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings" },
        (payload) => {
          const row = payload.new as SensorReading;
          const current = selectedDeviceRef.current;
          if (current && row.device_id === current.id) {
            setLatestReading(row);
            const newStatus = calculateDeviceStatus(row.created_at);
            const updatedDev: IotDevice = { ...current, last_seen: row.created_at, status: newStatus };
            setSelectedDevice(updatedDev);
            setDevices((prev) => prev.map((d) => (d.id === current.id ? updatedDev : d)));
            setDashboardState(newStatus);
            setHistory((prev) => {
              const next = [...prev, row];
              return next.length > 48 ? next.slice(next.length - 48) : next;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "iot_alerts" },
        (payload) => {
          setAlerts((prev) => [payload.new as IotAlert, ...prev].slice(0, 12));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "iot_commands" },
        (payload) => {
          const row = payload.new as IotCommand;
          if (lastCommandIdRef.current && row.id === lastCommandIdRef.current) {
            setCommandStates((prev) => ({
              ...prev,
              [row.command]: describeCommandLifecycle(row.issued_at, row.state),
            }));
            if (row.state === "EXECUTED") {
              toast({ title: "Command confirmed by device", description: `${row.command} executed successfully.` });
            } else if (row.state === "FAILED") {
              toast({ title: "Command failed on device", description: row.error || "The hardware reported an error.", variant: "destructive" });
            }
            lastCommandIdRef.current = null;
          }
          setCommands((prev) => {
            const existing = prev.find((c) => c.id === row.id);
            if (existing) {
              return prev.map((c) => (c.id === row.id ? { ...c, ...row } : c));
            }
            return [row, ...prev].slice(0, 5);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmId, userId, loadDashboardData, toast]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const freshDev = await loadDashboardData();
    setIsSyncing(false);
    if (freshDev?.status === "ONLINE") {
      toast({ title: "Sensors Synced", description: "Latest telemetry received from hardware." });
    } else if (freshDev?.status === "OFFLINE") {
      toast({ title: "Device Offline", description: `No telemetry received for over 90 seconds. Last seen ${formatRelativeTime(freshDev.last_seen, Date.now())}.`, variant: "destructive" });
    } else {
      toast({ title: "Waiting for Telemetry", description: "Power on your ESP32 node to connect.", variant: "destructive" });
    }
  };

  const handleSelectDevice = async (deviceUid: string) => {
    const target = devices.find((d) => d.device_uid === deviceUid) || null;
    if (target) {
      const reading = await fetchLatestReading(target.id);
      setLatestReading(reading);
      fetchReadingHistory(target.id, 48).then(setHistory);
      fetchRecentCommands(target.id, 5).then(setCommands);

      const effectiveLastSeen = (reading?.created_at && (!target.last_seen || new Date(reading.created_at) > new Date(target.last_seen)))
        ? reading.created_at
        : target.last_seen;
      const effectiveStatus = calculateDeviceStatus(effectiveLastSeen);
      const updatedDev: IotDevice = { ...target, last_seen: effectiveLastSeen, status: effectiveStatus };

      setSelectedDevice(updatedDev);
      setDashboardState(effectiveStatus);
    } else {
      setSelectedDevice(null);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) {
      toast({ title: "Validation Error", description: "Device UID required.", variant: "destructive" });
      return;
    }
    if (!newToken.trim()) {
      toast({ title: "Validation Error", description: "Device Token required. Copy DEVICE_TOKEN from the firmware config.", variant: "destructive" });
      return;
    }
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in before linking hardware.", variant: "destructive" });
      return;
    }

    setIsRegistering(true);
    const res = await registerIotDevice({
      deviceUid: newUid,
      deviceName: newName,
      deviceToken: newToken,
      farmId: farmId,
      userId,
      capabilities: newCapabilities,
    });

    setIsRegistering(false);
    if (!res.success) {
      toast({ title: "Registration Failed", description: res.error, variant: "destructive" });
      return;
    }

    toast({
      title: "ESP32 Node Linked",
      description: `Device ${newUid} registered for ${farmDisplayName}. Its token is now bound — it will show ONLINE after the first real telemetry heartbeat.`,
    });
    setRegisterOpen(false);
    await loadDashboardData();
  };

  // ── Command ack state machine (never optimistic) ────────────────────────
  const issueCommand = async (cmd: IotCommandName) => {
    const device = selectedDeviceRef.current;
    if (!device) {
      toast({ title: "No Device", description: "No connected ESP32 node found.", variant: "destructive" });
      return;
    }
    if (device.status !== "ONLINE") {
      toast({ title: "Device offline", description: "Commands cannot be delivered to disconnected hardware.", variant: "destructive" });
      return;
    }

    setCommandStates((prev) => ({
      ...prev,
      [cmd]: { phase: "sending", label: "Sending to the server\u2026" },
    }));

    const res = await sendDeviceCommand(device.device_uid, cmd);
    if (!res.success) {
      setCommandStates((prev) => ({
        ...prev,
        [cmd]: { phase: "failed", label: res.error || "Command could not be sent \u2014 Retry" },
      }));
      toast({ title: "Command Failed", description: res.error, variant: "destructive" });
      return;
    }

    lastCommandIdRef.current = res.commandId || null;
    setCommandStates((prev) => ({
      ...prev,
      [cmd]: { phase: "queued", label: "Waiting for the device to confirm\u2026" },
    }));
    toast({ title: "Command sent to your device", description: "Waiting for hardware confirmation." });
  };

  const commandStateIcon = (state?: CommandLifecycle) => {
    if (!state) return null;
    if (state.phase === "executed") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    if (state.phase === "failed") return <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />;
    if (state.phase === "sending" || state.phase === "queued") return <Send className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />;
    return null;
  };

  const renderCommandState = (cmd: IotCommandName) => {
    const state = commandStates[cmd];
    if (!state || state.phase === "idle") return null;
    return (
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${state.phase === "failed" ? "text-red-600 dark:text-red-400" : state.phase === "executed" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
        {commandStateIcon(state)}
        <span>{state.label}</span>
      </div>
    );
  };

  const handleSendTestTelemetry = async () => {
    const targetUid = selectedDevice ? selectedDevice.device_uid : newUid || "AGRI-ESP32-001";
    setIsSendingSim(true);
    const res = await sendTestTelemetry({
      deviceUid: targetUid,
      soilMoisture: simSoil,
      temperature: simTemp,
      humidity: simHumid,
      rainValue: simRain,
      fenceStatus: simFence,
    });
    setIsSendingSim(false);
    if (!res.success) {
      toast({ title: "Telemetry Error", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Demo Telemetry Ingested", description: `Verified the live pipeline with ${targetUid}.` });
    setTestModeOpen(false);
    await loadDashboardData();
  };

  const handleMarkAllAlertsRead = async () => {
    await Promise.all(alerts.filter((a) => !a.is_read).map((a) => markAlertRead(a.id)));
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    toast({ title: "Alerts marked read" });
  };

  const currentFenceStatus = (selectedDevice?.status === "ONLINE" ? latestReading?.fence_status : latestReading?.fence_status) || "NOT_CONNECTED";

  const insights = useMemo(() => {
    if (!selectedDevice || !latestReading) return [];
    const out: { icon: "sunrise" | "cloudy" | "droplets" | "wifi-off"; text: string; tone: "good" | "warn" | "bad" }[] = [];
    if (selectedDevice.status !== "ONLINE") {
      out.push({
        icon: "wifi-off",
        tone: "bad",
        text: `Device offline. Last real reading received ${formatRelativeTime(latestReading.created_at, now)}.`,
      });
    }
    if (selectedDevice.status === "ONLINE" && latestReading.soil_moisture !== null && latestReading.soil_moisture <= 100) {
      if (latestReading.soil_moisture < 20) {
        out.push({ icon: "droplets", tone: "warn", text: "Soil is dry — start irrigating this plot soon." });
      } else if (latestReading.soil_moisture <= 35) {
        out.push({ icon: "droplets", tone: "good", text: "Soil moisture is a little low — keep an eye on it." });
      }
    }
    if (selectedDevice.status === "ONLINE" && latestReading.temperature !== null) {
      if (latestReading.temperature > 38) {
        out.push({ icon: "sunrise", tone: "bad", text: "Very high temperature. Shield young plants and increase watering." });
      } else if (latestReading.temperature > 32) {
        out.push({ icon: "sunrise", tone: "warn", text: "High temperature. Consider light irrigation in the evening." });
      }
    }
    if (selectedDevice.status === "ONLINE" && latestReading.humidity !== null && latestReading.humidity > 90) {
      out.push({ icon: "cloudy", tone: "warn", text: "Very humid — watch for fungal disease on leaves." });
    }
    return out.slice(0, 3);
  }, [selectedDevice, latestReading, now]);

  const chartData = useMemo(() => {
    return history.map((r) => ({
      time: formatRelativeTime(r.created_at, now),
      [HistoryMetric.moisture]: r.soil_moisture,
      [HistoryMetric.temperature]: r.temperature,
      [HistoryMetric.humidity]: r.humidity,
      [HistoryMetric.rain]: r.rain_value,
    }));
  }, [history, now]);

  const chartColor: Record<HistoryMetricKey, string> = {
    moisture: "#0284c7",
    temperature: "#d97706",
    humidity: "#6366f1",
    rain: "#2563eb",
  };

  const renderStatusDot = (status: DeviceStatus, lastSeen: string | null) => {
    switch (status) {
      case "ONLINE":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Online
          </Badge>
        );
      case "OFFLINE":
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-semibold px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
            Offline
          </Badge>
        );
      case "NOT_CONNECTED":
      default:
        return (
          <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-semibold px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
            Not Connected
          </Badge>
        );
    }
  };

  const getRainStatusInfo = (rainVal: number | null | undefined) => {
    if (rainVal === null || rainVal === undefined) {
      return { status: "Unavailable", label: "Sensor unplugged or not reporting", isRaining: false };
    }
    if (rainVal >= 3200) {
      return { status: "Dry", label: "No rain detected", isRaining: false };
    } else if (rainVal >= 2500) {
      return { status: "Light Rain", label: "Moisture detected on sensor", isRaining: true };
    } else if (rainVal >= 1600) {
      return { status: "Raining", label: "Active precipitation", isRaining: true };
    } else {
      return { status: "Heavy Rain", label: "Heavy downpour detected", isRaining: true };
    }
  };

  const confirmedBuzzerState = useMemo(() => {
    const lastBuzzer = commands.find((c) => c.command === "BUZZER_ON" || c.command === "BUZZER_OFF");
    if (!lastBuzzer) return { status: "IDLE", label: "OFF (Default hardware state)" };
    if (lastBuzzer.state === "EXECUTED") {
      return lastBuzzer.command === "BUZZER_ON"
        ? { status: "ON", label: "Confirmed ON by ESP32" }
        : { status: "OFF", label: "Confirmed OFF by ESP32" };
    }
    if (lastBuzzer.state === "QUEUED") {
      return { status: "PENDING", label: "Awaiting hardware acknowledgment…" };
    }
    return { status: "FAILED", label: "Command execution failed" };
  }, [commands]);

  const confirmedPumpState = useMemo(() => {
    const lastPump = commands.find((c) => c.command === "PUMP_ON" || c.command === "PUMP_OFF");
    if (!lastPump) return { status: "IDLE", label: "OFF (Default hardware state)" };
    if (lastPump.state === "EXECUTED") {
      return lastPump.command === "PUMP_ON"
        ? { status: "ON", label: "Confirmed RUNNING by ESP32 relay" }
        : { status: "OFF", label: "Confirmed STOPPED by ESP32 relay" };
    }
    if (lastPump.state === "QUEUED") {
      return { status: "PENDING", label: "Awaiting hardware acknowledgment…" };
    }
    return { status: "FAILED", label: "Command execution failed" };
  }, [commands]);

  const readTimeLabel = (readingCreatedAt: string | null): React.ReactNode => {
    if (!latestReading) return null;
    const ts = readingCreatedAt ?? latestReading.created_at;
    const isLive = selectedDevice?.status === "ONLINE";
    const date = ts ? new Date(ts) : null;
    const localTimeStr = date && !isNaN(date.getTime())
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : null;

    return (
      <div className="space-y-0.5 pt-1">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <Clock className="w-3 h-3 text-muted-foreground" />
          {isLive ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Live · Updated {formatRelativeTime(ts, now)}</span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400 font-medium">Stale reading · {formatRelativeTime(ts, now)}</span>
          )}
          {localTimeStr && (
            <span className="text-[10px] text-muted-foreground font-mono">({localTimeStr})</span>
          )}
        </p>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-28 pt-4 space-y-6">
      {IOT_MOCK_MODE_ENABLED && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 shadow-sm">
          <Sliders className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold">{IOT_MOCK_MODE_LABEL}</span>
          <span className="text-muted-foreground">{IOT_MOCK_MODE_HINT}</span>
        </div>
      )}

      {/* ── HERO HEADER ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 via-card to-emerald-900/10 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                    AgriConnect Farm Node
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    IoT Field Station
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium mt-0.5">
                  <span>{farmDisplayName}</span>
                  <span className="text-emerald-500">•</span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded-md border border-border text-[11px] text-foreground font-semibold">
                    {selectedDevice ? selectedDevice.device_uid : "No Hardware Linked"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {selectedDevice ? (
              renderStatusDot(selectedDevice.status, selectedDevice.last_seen)
            ) : (
              <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 font-semibold px-3 py-1.5 text-xs rounded-full">
                <span className="w-2 h-2 rounded-full bg-slate-400 mr-2" />
                Not Connected
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="rounded-full h-9 px-4 text-xs gap-2 border-border shadow-sm hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
              <span>Sync</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setRegisterOpen(true)}
              className="rounded-full h-9 px-4 text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add ESP32 Node</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── DEVICE SELECTOR ──────────────────────────────────────────────── */}
      {devices.length > 1 && (
        <Card className="border-border rounded-2xl p-3 shadow-sm bg-card/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Device:</span>
            <div className="relative flex-1 max-w-sm">
              <select
                value={selectedDevice?.device_uid || ""}
                onChange={(e) => handleSelectDevice(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-input bg-background px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.device_uid}>
                    {d.device_name} ({d.device_uid}){d.status === "ONLINE" ? " — Online" : d.status === "OFFLINE" ? " — Offline" : " — Not Connected"}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </Card>
      )}

      {/* ── STATE BANNERS ────────────────────────────────────────────────── */}
      {dashboardState === "NO_DEVICE" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-sm shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>No Field Node Linked Yet</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Ready to Pair</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your AgriConnect ESP32 kit to stream real soil moisture, ambient temperature, humidity, and rain telemetry.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button onClick={() => setRegisterOpen(true)} size="sm" className="rounded-full h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-initial">
              <Plus className="w-4 h-4 mr-1" />
              Link Hardware
            </Button>
            {IOT_MOCK_MODE_ENABLED && (
              <Button onClick={() => setTestModeOpen(true)} variant="outline" size="sm" className="rounded-full h-9 px-4 text-xs font-semibold border-border flex-1 sm:flex-initial">
                <Sliders className="w-3.5 h-3.5 mr-1" />
                Demo Telemetry
              </Button>
            )}
          </div>
        </div>
      )}

      {dashboardState === "NOT_CONNECTED" && selectedDevice && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
          <Cpu className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400 animate-pulse" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Awaiting ESP32 Hardware Connection ({selectedDevice.device_uid})</p>
            <p className="leading-relaxed text-amber-800/90 dark:text-amber-300/90">
              Your node <span className="font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">{selectedDevice.device_uid}</span> is registered. Flash the firmware onto your ESP32 and power it up with Wi-Fi. Live telemetry will stream automatically.
            </p>
          </div>
        </div>
      )}

      {dashboardState === "OFFLINE" && selectedDevice && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-900 dark:text-rose-200 text-xs shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Device Offline</p>
            <p className="leading-relaxed">
              Node <span className="font-mono font-semibold">{selectedDevice.device_uid}</span> was last seen{" "}
              <span className="font-bold">{formatRelativeTime(selectedDevice.last_seen, now)}</span>. Displaying the last confirmed telemetry reading.
            </p>
          </div>
        </div>
      )}

      {dashboardState === "ERROR" && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-900 dark:text-rose-200 text-xs shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-0.5">
              <p className="font-bold text-sm">Could Not Reach Sensor Node</p>
              <p className="text-rose-800/90 dark:text-rose-300/90">
                Connection to your field node is currently interrupted. Tap below to retry handshake.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualSync} className="rounded-full text-xs border-rose-300 dark:border-rose-700 bg-background hover:bg-rose-50 shrink-0 h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry Sync
          </Button>
        </div>
      )}

      {/* ── SENSOR CARDS GRID (ZERO OVERLAP TELEMETRY TILES) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Soil Moisture */}
        <Card className="group relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-card hover:shadow-xl hover:border-sky-500/40 transition-all duration-300">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-sm group-hover:scale-105 transition-transform">
              <Droplets className="w-5 h-5" />
            </div>
            {selectedDevice && latestReading?.soil_moisture !== null && latestReading?.soil_moisture !== undefined ? (
              <Badge className={selectedDevice.status === "ONLINE" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] px-2.5 py-0.5 font-semibold" : "bg-muted text-muted-foreground text-[10px]"}>
                {selectedDevice.status === "ONLINE" ? "Live Stream" : "Cached"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60 bg-muted/40">
                Standby
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Soil Moisture</p>
            {selectedDevice && latestReading?.soil_moisture !== null && latestReading?.soil_moisture !== undefined ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                    {Math.round(latestReading.soil_moisture)}
                  </span>
                  <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                    {latestReading.soil_moisture <= 100 ? "%" : "ADC"}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(latestReading.soil_moisture <= 100 ? latestReading.soil_moisture : (latestReading.soil_moisture / 4095) * 100, 5), 100)}%` }}
                  />
                </div>
                {readTimeLabel(latestReading.created_at)}
              </div>
            ) : (
              <div className="pt-1 space-y-1">
                <span className="text-3xl font-bold text-muted-foreground/50">--</span>
                <p className="text-[11px] text-muted-foreground">Awaiting hardware stream</p>
                <div className="w-full bg-muted/40 h-1.5 rounded-full mt-2" />
              </div>
            )}
          </div>
        </Card>

        {/* 2. Temperature */}
        <Card className="group relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-card hover:shadow-xl hover:border-amber-500/40 transition-all duration-300">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm group-hover:scale-105 transition-transform">
              <Thermometer className="w-5 h-5" />
            </div>
            {selectedDevice && latestReading?.temperature !== null && latestReading?.temperature !== undefined ? (
              <Badge className={selectedDevice.status === "ONLINE" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] px-2.5 py-0.5 font-semibold" : "bg-muted text-muted-foreground text-[10px]"}>
                {selectedDevice.status === "ONLINE" ? "Live Stream" : "Cached"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60 bg-muted/40">
                Standby
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Temperature</p>
            {selectedDevice && latestReading?.temperature !== null && latestReading?.temperature !== undefined ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                    {latestReading.temperature.toFixed(1)}
                  </span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">°C</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max((latestReading.temperature / 50) * 100, 5), 100)}%` }}
                  />
                </div>
                {readTimeLabel(latestReading.created_at)}
              </div>
            ) : (
              <div className="pt-1 space-y-1">
                <span className="text-3xl font-bold text-muted-foreground/50">--</span>
                <p className="text-[11px] text-muted-foreground">DHT sensor standby</p>
                <div className="w-full bg-muted/40 h-1.5 rounded-full mt-2" />
              </div>
            )}
          </div>
        </Card>

        {/* 3. Humidity */}
        <Card className="group relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-card hover:shadow-xl hover:border-indigo-500/40 transition-all duration-300">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm group-hover:scale-105 transition-transform">
              <Wind className="w-5 h-5" />
            </div>
            {selectedDevice && latestReading?.humidity !== null && latestReading?.humidity !== undefined ? (
              <Badge className={selectedDevice.status === "ONLINE" ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] px-2.5 py-0.5 font-semibold" : "bg-muted text-muted-foreground text-[10px]"}>
                {selectedDevice.status === "ONLINE" ? "Live Stream" : "Cached"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60 bg-muted/40">
                Standby
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Humidity</p>
            {selectedDevice && latestReading?.humidity !== null && latestReading?.humidity !== undefined ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                    {Math.round(latestReading.humidity)}
                  </span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">%</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(latestReading.humidity, 5), 100)}%` }}
                  />
                </div>
                {readTimeLabel(latestReading.created_at)}
              </div>
            ) : (
              <div className="pt-1 space-y-1">
                <span className="text-3xl font-bold text-muted-foreground/50">--</span>
                <p className="text-[11px] text-muted-foreground">Relative humidity standby</p>
                <div className="w-full bg-muted/40 h-1.5 rounded-full mt-2" />
              </div>
            )}
          </div>
        </Card>

        {/* 4. Rain Sensor */}
        <Card className="group relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-card hover:shadow-xl hover:border-blue-500/40 transition-all duration-300">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm group-hover:scale-105 transition-transform">
              <CloudRain className="w-5 h-5" />
            </div>
            {selectedDevice && latestReading?.rain_value !== null && latestReading?.rain_value !== undefined ? (
              <Badge className={selectedDevice.status === "ONLINE" ? (getRainStatusInfo(latestReading.rain_value).isRaining ? "bg-blue-600 text-white text-[10px] px-2.5 py-0.5 font-bold shadow-sm" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-2.5 py-0.5 font-semibold") : "bg-muted text-muted-foreground text-[10px]"}>
                {selectedDevice.status === "ONLINE" ? (getRainStatusInfo(latestReading.rain_value).isRaining ? "Precipitation" : "Dry Field") : "Cached"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60 bg-muted/40">
                Standby
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rain Sensor</p>
            {selectedDevice && latestReading?.rain_value !== null && latestReading?.rain_value !== undefined ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    {getRainStatusInfo(latestReading.rain_value).status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium mt-1">
                  {getRainStatusInfo(latestReading.rain_value).label} (ADC: {latestReading.rain_value})
                </p>
                {/* Visual indicator bar */}
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${getRainStatusInfo(latestReading.rain_value).isRaining ? 85 : 15}%` }}
                  />
                </div>
                {readTimeLabel(latestReading.created_at)}
              </div>
            ) : (
              <div className="pt-1 space-y-1">
                <span className="text-3xl font-bold text-muted-foreground/50">--</span>
                <p className="text-[11px] text-muted-foreground">Optical/resistive rain standby</p>
                <div className="w-full bg-muted/40 h-1.5 rounded-full mt-2" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── MIDDLE ROW: HISTORY & AI FARM INSIGHTS ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          disabled={!selectedDevice || history.length === 0}
          className="group text-left p-5 rounded-3xl border border-border bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-card hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 flex items-center justify-between gap-4 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">Sensor History & Trends</p>
                {history.length > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0 border-emerald-500/30">
                    {history.length} Points
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {history.length > 0 ? "Inspect real-time sensor graphs & data logs" : "No telemetry readings recorded yet"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </button>

        <Card className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-amber-500/5 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">AI Farm Advisory</p>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Real-Time Insights</span>
          </div>
          {insights.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {dashboardState === "NO_DEVICE"
                ? "Link your hardware node to receive real-time soil, irrigation, and pest advisory based on authentic crop readings."
                : "Awaiting sufficient live sensor data to formulate crop advisory…"}
            </p>
          ) : (
            <ul className="space-y-2">
              {insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  {ins.icon === "wifi-off" ? (
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
                  ) : ins.icon === "sunrise" ? (
                    <Thermometer className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                  ) : ins.icon === "cloudy" ? (
                    <Wind className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                  ) : (
                    <Droplets className="w-4 h-4 mt-0.5 text-sky-500 shrink-0" />
                  )}
                  <span className="leading-snug">{ins.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── PRECISION FIELD CONTROLS (HIGH-CONTRAST INTERACTIVE TILES) ──────── */}
      <Card className="border border-border/80 shadow-xl rounded-3xl overflow-hidden bg-card">
        <CardHeader className="bg-gradient-to-r from-muted/50 via-card to-muted/30 pb-4 border-b border-border/70 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/30 shadow-sm">
                <Fence className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2.5">
                  <span>Field Controls</span>
                  <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    ESP32 Confirmed
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Laser perimeter, acoustic deterrent, and irrigation relays confirmed by hardware.
                </CardDescription>
              </div>
            </div>

            <div>
              {currentFenceStatus !== "NOT_CONNECTED" ? (
                <Badge className={currentFenceStatus === "INTRUSION" ? "bg-red-600 text-white font-bold animate-pulse px-3 py-1 shadow-md" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-3 py-1 font-semibold"}>
                  <span className="w-2 h-2 rounded-full bg-current mr-2 animate-ping" />
                  Fence: {currentFenceStatus}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  <span className="w-2 h-2 rounded-full bg-slate-400 mr-2" />
                  Hardware Offline
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          {/* Control 1: Smart Fence */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-card to-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/30 shadow-sm shrink-0">
                <Fence className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Smart Laser Fence</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                    LDR Perimeter
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Laser beam perimeter security to deter animal intrusion</p>
                {renderCommandState("ARM_FENCE")}
                {renderCommandState("DISARM_FENCE")}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                disabled={!selectedDevice?.capabilities.laserFence || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.ARM_FENCE?.phase === "sending" || commandStates.ARM_FENCE?.phase === "queued"}
                onClick={() => issueCommand("ARM_FENCE")}
                className="rounded-full text-xs font-semibold flex-1 sm:flex-initial h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-80 disabled:cursor-not-allowed"
              >
                <Fence className="w-3.5 h-3.5 mr-1.5" />
                Arm Fence
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.laserFence || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.DISARM_FENCE?.phase === "sending" || commandStates.DISARM_FENCE?.phase === "queued"}
                onClick={() => issueCommand("DISARM_FENCE")}
                className="rounded-full text-xs font-semibold flex-1 sm:flex-initial h-9 px-5 border-border hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Disarm
              </Button>
            </div>
          </div>

          {/* Control 2: Buzzer Deterrent */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-card to-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-500/30 shadow-sm shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Acoustic Buzzer Deterrent</p>
                  <Badge variant="outline" className={`text-[10px] ${confirmedBuzzerState.status === "ON" ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 font-bold" : "text-muted-foreground border-border bg-muted/40"}`}>
                    {confirmedBuzzerState.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">High-frequency buzzer pulse to repel wild boars and stray cattle</p>
                {renderCommandState("BUZZER_ON")}
                {renderCommandState("BUZZER_OFF")}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                disabled={!selectedDevice?.capabilities.buzzer || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.BUZZER_ON?.phase === "sending" || commandStates.BUZZER_ON?.phase === "queued"}
                onClick={() => issueCommand("BUZZER_ON")}
                className="rounded-full text-xs font-semibold flex-1 sm:flex-initial h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-80 disabled:cursor-not-allowed"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                Buzzer ON
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.buzzer || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.BUZZER_OFF?.phase === "sending" || commandStates.BUZZER_OFF?.phase === "queued"}
                onClick={() => issueCommand("BUZZER_OFF")}
                className="rounded-full text-xs font-semibold flex-1 sm:flex-initial h-9 px-5 border-border hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Buzzer OFF
              </Button>
            </div>
          </div>

          {/* Control 3: Water Irrigation Pump */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-card to-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sky-500/40 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center justify-center border border-sky-500/30 shadow-sm shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Irrigation Water Pump</p>
                  <Badge variant="outline" className={`text-[10px] ${confirmedPumpState.status === "ON" ? "bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/40 font-bold" : "text-muted-foreground border-border bg-muted/40"}`}>
                    {confirmedPumpState.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Relay switch controlling field water pump and drip irrigation</p>
                {renderCommandState("PUMP_ON")}
                {renderCommandState("PUMP_OFF")}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                disabled={!selectedDevice?.capabilities.pump || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.PUMP_ON?.phase === "sending" || commandStates.PUMP_ON?.phase === "queued"}
                onClick={() => issueCommand("PUMP_ON")}
                className="rounded-full text-xs font-semibold flex-1 sm:flex-initial h-9 px-5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-80 disabled:cursor-not-allowed"
              >
                <Droplets className="w-3.5 h-3.5 mr-1.5" />
                Pump ON
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.pump || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.PUMP_OFF?.phase === "sending" || commandStates.PUMP_OFF?.phase === "queued"}
                onClick={() => issueCommand("PUMP_OFF")}
                className="rounded-full text-xs font-semibold flex-1 sm:flex-initial h-9 px-5 border-border hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Pump OFF
              </Button>
            </div>
          </div>

          {/* Explanatory Footer Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-muted/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-foreground">Hardware Command Execution</p>
                <p className="text-muted-foreground max-w-xl leading-relaxed">
                  Your node checks for commands every 15 seconds, executes them on the GPIO relays, and sends back hardware verification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setFenceGuideOpen(true)} className="rounded-full text-xs border-border flex-1 sm:flex-initial h-8 px-4">
                Wiring Guide
              </Button>
              <Button size="sm" onClick={() => setHistoryOpen(true)} disabled={commands.length === 0} variant="outline" className="rounded-full text-xs border-border flex-1 sm:flex-initial gap-1.5 h-8 px-4">
                <History className="w-3.5 h-3.5" />
                Command Log
              </Button>
            </div>
          </div>

          {/* Recent Commands Feed */}
          {commands.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                Recent Hardware Commands
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {commands.slice(0, 4).map((c) => {
                  const lifecycle = describeCommandLifecycle(c.issued_at, c.state);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 text-xs py-2 px-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="font-mono font-semibold text-foreground">{c.command}</span>
                      <span className={`flex items-center gap-1.5 font-medium ${c.state === "FAILED" ? "text-rose-600" : c.state === "EXECUTED" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {commandStateIcon(lifecycle)}
                        {lifecycle.label}
                        <span className="text-muted-foreground text-[10px]">• {formatRelativeTime(c.issued_at, now)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DEVELOPER DIAGNOSTICS (HIDDEN BEHIND TOGGLE) ───────────────────── */}
      <Card className="border-border shadow-card rounded-2xl overflow-hidden">
        <div className="p-4 bg-muted/20">
          <button
            type="button"
            onClick={() => setDiagnosticsOpen((prev) => !prev)}
            className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Diagnostics
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] normal-case font-normal text-muted-foreground">Developer view</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${diagnosticsOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {diagnosticsOpen && (
            <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Device</span>
                <p className="font-bold text-foreground">{selectedDevice ? selectedDevice.device_uid : "N/A"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Connection</span>
                <p className={`font-bold ${selectedDevice?.status === "ONLINE" ? "text-emerald-600" : selectedDevice?.status === "OFFLINE" ? "text-red-600" : "text-slate-500"}`}>
                  ● {selectedDevice ? selectedDevice.status : "NOT_CONNECTED"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Last Telemetry</span>
                <p className="font-bold text-foreground">
                  {latestReading?.created_at ? new Date(latestReading.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "None"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Last API Response</span>
                <p className="font-bold text-emerald-600">{lastApiStatus}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Last Command</span>
                <p className="font-bold text-foreground">{commands[0]?.command || "None"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Command Status</span>
                <p className={`font-bold ${commands[0]?.state === "EXECUTED" ? "text-emerald-600" : commands[0]?.state === "FAILED" ? "text-red-600" : "text-amber-600"}`}>
                  {commands[0]?.state || "N/A"}
                </p>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-wider">Last Error</span>
                <p className="font-bold text-red-500 truncate">{commands[0]?.error || "None"}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── ALERTS SECTION ──────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Recent Farm Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleMarkAllAlertsRead} className="rounded-full text-[10px] h-7 gap-1.5 text-muted-foreground">
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border border-border bg-card flex items-start justify-between text-xs gap-3 ${alert.is_read ? "opacity-60" : ""}`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={alert.severity === "CRITICAL" ? "bg-red-500 text-white" : alert.severity === "WARNING" ? "bg-amber-500/15 text-amber-700" : "bg-sky-500/15 text-sky-700"}>
                      {alert.alert_type}
                    </Badge>
                    {!alert.is_read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="font-semibold text-foreground mt-0.5">{alert.message}</p>
                  <p className="text-[11px] text-muted-foreground">{formatRelativeTime(alert.created_at, now)}</p>
                </div>
                {!alert.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markAlertRead(alert.id)} className="rounded-full h-6 text-[10px] shrink-0 text-muted-foreground">
                    Mark read
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── REGISTER DEVICE DIALOG ──────────────────────────────────────── */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              Register ESP32 Hardware Node
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the Device UID on your micro-controller and the Device Token in its firmware config. Only its SHA-256 hash is stored — the token never leaves the device and this dashboard.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterDevice} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="deviceUid" className="text-xs font-semibold">
                Device UID *
              </Label>
              <Input id="deviceUid" value={newUid} onChange={(e) => setNewUid(e.target.value)} placeholder="e.g. AGRI-ESP32-001" className="font-mono text-sm uppercase" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deviceName" className="text-xs font-semibold">
                Device Name / Zone
              </Label>
              <Input id="deviceName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. North Field Node" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deviceToken" className="text-xs font-semibold">
                Device Token (from firmware config) *
              </Label>
              <Input id="deviceToken" type="password" value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="Paste DEVICE_TOKEN from config.h" className="text-sm" autoComplete="off" required />
              <p className="text-[11px] text-muted-foreground">
                Same token must be set as <code className="font-mono">DEVICE_TOKEN</code> in the firmware config.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-bold text-foreground">Sensor Capabilities:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Soil Moisture</span>
                  <Switch checked={newCapabilities.soilMoisture} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, soilMoisture: v }))} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Temperature</span>
                  <Switch checked={newCapabilities.temperature} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, temperature: v }))} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Humidity</span>
                  <Switch checked={newCapabilities.humidity} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, humidity: v }))} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Rain Sensor</span>
                  <Switch checked={newCapabilities.rain} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, rain: v }))} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Buzzer</span>
                  <Switch checked={newCapabilities.buzzer} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, buzzer: v }))} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Smart Fence</span>
                  <Switch checked={newCapabilities.laserFence} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, laserFence: v }))} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span>Water Pump</span>
                  <Switch checked={newCapabilities.pump} onCheckedChange={(v) => setNewCapabilities((c) => ({ ...c, pump: v }))} />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)} className="rounded-full text-xs">Cancel</Button>
              <Button type="submit" disabled={isRegistering} className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs">
                {isRegistering ? "Saving..." : "Save Device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── HISTORY DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Sensor History
            </DialogTitle>
            <DialogDescription className="text-xs">
              The last {history.length} real readings from{" "}
              <span className="font-mono">{selectedDevice?.device_uid}</span>. Values come directly from the hardware.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {(Object.keys(HistoryMetric) as HistoryMetricKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setHistoryMetric(key)}
                className={`rounded-full px-3 py-1 border text-xs font-medium ${historyMetric === key ? "bg-emerald-700 text-white border-emerald-700" : "border-border text-muted-foreground bg-card"}`}
              >
                {key === "moisture" ? "Soil Moisture" : key === "temperature" ? "Temperature" : key === "humidity" ? "Humidity" : "Rain"}
              </button>
            ))}
            {commands.length > 0 && (
              <button
                onClick={() => setHistoryMetric("rain")}
                className={`rounded-full px-3 py-1 border text-xs font-medium ${"rain" === historyMetric ? "bg-emerald-700 text-white border-emerald-700" : "border-border text-muted-foreground bg-card"}`}
              >
                Command State
              </button>
            )}
          </div>

          {history.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={48} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey={HistoryMetric[historyMetric]}
                    name={historyMetric}
                    stroke={chartColor[historyMetric]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">No sensor readings recorded for this device yet.</p>
          )}

          {commands.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Commands</p>
              {commands.map((cmd) => {
                const lifecycle = describeCommandLifecycle(cmd.issued_at, cmd.state);
                return (
                  <div key={cmd.id} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold">{cmd.command}</span>
                    <span className={`flex items-center gap-1.5 ${cmd.state === "FAILED" ? "text-red-600" : cmd.state === "EXECUTED" ? "text-emerald-700" : "text-amber-700"}`}>
                      {commandStateIcon(lifecycle)}
                      {lifecycle.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setHistoryOpen(false)} className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TEST BENCH DIALOG (mock mode only) ──────────────────────────── */}
      {IOT_MOCK_MODE_ENABLED && (
        <Dialog open={testModeOpen} onOpenChange={setTestModeOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Hardware Telemetry Test Bench
              </DialogTitle>
              <DialogDescription className="text-xs">
                {IOT_MOCK_MODE_LABEL} — posts manually entered values to the live pipeline to verify database insertion and status transitions while wiring the hardware.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Device UID</Label>
                <Input value={selectedDevice?.device_uid || newUid} readOnly className="font-mono text-xs bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Soil Moisture (Raw ADC)</span>
                    <span className="font-bold">{simSoil}</span>
                  </div>
                  <input type="range" min="0" max="4095" value={simSoil} onChange={(e) => setSimSoil(Number(e.target.value))} className="w-full" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Temperature (°C)</span>
                    <span className="font-bold">{simTemp}°C</span>
                  </div>
                  <input type="range" min="0" max="50" step="0.5" value={simTemp} onChange={(e) => setSimTemp(Number(e.target.value))} className="w-full" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Humidity (%)</span>
                    <span className="font-bold">{simHumid}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={simHumid} onChange={(e) => setSimHumid(Number(e.target.value))} className="w-full" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Rain Sensor (Raw ADC)</span>
                    <span className="font-bold">{simRain}</span>
                  </div>
                  <input type="range" min="0" max="4095" value={simRain} onChange={(e) => setSimRain(Number(e.target.value))} className="w-full" />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setTestModeOpen(false)} className="rounded-full text-xs">Close</Button>
                <Button onClick={handleSendTestTelemetry} disabled={isSendingSim} className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs">
                  {isSendingSim ? "Posting..." : "Post Telemetry Payload"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── SMART FENCE WIRING GUIDE DIALOG ─────────────────────────────── */}
      <Dialog open={fenceGuideOpen} onOpenChange={setFenceGuideOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Fence className="w-5 h-5 text-emerald-600" />
              Hardware Wiring Guide
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pinout for the AgriConnect ESP32 field kit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <div className="p-3 rounded-xl bg-muted space-y-1 text-foreground font-medium">
              <p className="font-bold">Sensor & control pins:</p>
              <p>{"\u2022"} Soil Moisture: Analog Output \u2192 GPIO 34</p>
              <p>{"\u2022"} Rain Sensor: Analog Output \u2192 GPIO 35</p>
              <p>{"\u2022"} DHT11 Temp/Humidity: Data Pin \u2192 GPIO 4</p>
              <p>{"\u2022"} Fence laser power: \u2192 GPIO 25 (relay)</p>
              <p>{"\u2022"} Fence LDR receiver: Signal \u2192 GPIO 32</p>
              <p>{"\u2022"} Buzzer: Signal \u2192 GPIO 26</p>
              <p>{"\u2022"} Water pump: Relay control \u2192 GPIO 27</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setFenceGuideOpen(false)} className="bg-emerald-700 text-white rounded-full text-xs w-full">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HardwareDashboard;