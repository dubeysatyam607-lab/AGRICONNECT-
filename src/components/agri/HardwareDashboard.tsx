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

export type DashboardState = "INITIAL" | "NO_DEVICE" | "CONNECTING" | "ONLINE" | "OFFLINE" | "ERROR";

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

  // Live relative timestamps
  const [now, setNow] = useState<number>(Date.now());

  // Dialog states
  const [registerOpen, setRegisterOpen] = useState<boolean>(false);
  const [testModeOpen, setTestModeOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [fenceGuideOpen, setFenceGuideOpen] = useState<boolean>(false);
  const [historyMetric, setHistoryMetric] = useState<HistoryMetricKey>("moisture");

  // Registration form
  const [newUid, setNewUid] = useState<string>("AGRI-ESP32-001");
  const [newName, setNewName] = useState<string>("Main Field Node");
  const [newCapabilities, setNewCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Telemetry simulator (mock mode only)
  const [simSoil, setSimSoil] = useState<number>(1842);
  const [simTemp, setSimTemp] = useState<number>(28.4);
  const [simHumid, setSimHumid] = useState<number>(71);
  const [simRain, setSimRain] = useState<number>(840);
  const [simFence, setSimFence] = useState<FenceStatus>("NOT_CONNECTED");
  const [isSendingSim, setIsSendingSim] = useState<boolean>(false);

  // Live ticker so "12 sec ago" refreshes without full refetches
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setDashboardState((prev) => (prev === "INITIAL" ? "CONNECTING" : prev));
    try {
      const farmDevs = await fetchFarmDevices(farmId, userId);
      setDevices(farmDevs);

      setSelectedDevice((prev) => {
        if (!prev) return farmDevs[0] || null;
        const stillThere = farmDevs.find((d) => d.id === prev.id);
        return stillThere || farmDevs[0] || null;
      });

      if (farmDevs.length === 0) {
        setLatestReading(null);
        setHistory([]);
        setAlerts([]);
        setCommands([]);
        setDashboardState("NO_DEVICE");
        return;
      }

      const activeDev = farmDevs[0];
      const reading = await fetchLatestReading(activeDev.id);
      setLatestReading(reading);
      setHistory(await fetchReadingHistory(activeDev.id, 48));
      setAlerts(await fetchRecentAlerts(12));
      setCommands(await fetchRecentCommands(activeDev.id, 5));

      if (activeDev.status === "ONLINE") setDashboardState("ONLINE");
      else if (activeDev.status === "OFFLINE") setDashboardState("OFFLINE");
      else setDashboardState("NO_DEVICE");
    } catch (err) {
      console.error("[HardwareDashboard] Error loading IoT data:", err);
      setDashboardState("ERROR");
    }
  }, [farmId, userId]);

  useEffect(() => {
    loadDashboardData();
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
    await loadDashboardData();
    setIsSyncing(false);
    toast({ title: "Sensors Synced", description: "Updated with the latest telemetry status." });
  };

  const handleSelectDevice = (deviceUid: string) => {
    const next = devices.find((d) => d.device_uid === deviceUid) || null;
    setSelectedDevice(next);
    if (next) {
      fetchLatestReading(next.id).then(setLatestReading);
      fetchReadingHistory(next.id, 48).then(setHistory);
      fetchRecentCommands(next.id, 5).then(setCommands);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) {
      toast({ title: "Validation Error", description: "Device UID required.", variant: "destructive" });
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
      description: `Device ${newUid} registered for ${farmDisplayName}. It will show ONLINE after the first real telemetry heartbeat.`,
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

  const readTimeLabel = (readingCreatedAt: string | null): React.ReactNode => {
    if (!latestReading) return null;
    return (
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {selectedDevice?.status === "ONLINE" ? "Live \u00b7 Updated " : "Last seen "}
        {formatRelativeTime(readingCreatedAt ?? latestReading.created_at, now)}
      </p>
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-4 space-y-6">
      {IOT_MOCK_MODE_ENABLED && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Sliders className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{IOT_MOCK_MODE_LABEL}</span>
          <span className="text-muted-foreground">{IOT_MOCK_MODE_HINT}</span>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">AgriConnect Farm Node</h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <span>{farmDisplayName}</span>
            <span>{"\u2022"}</span>
            <span className="font-mono">{selectedDevice ? selectedDevice.device_uid : "No Hardware Linked"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedDevice ? (
            renderStatusDot(selectedDevice.status, selectedDevice.last_seen)
          ) : (
            <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
              Not Connected
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={handleManualSync} disabled={isSyncing} className="rounded-full h-8 text-xs gap-1.5 border-border">
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
            Sync
          </Button>

          <Button size="sm" onClick={() => setRegisterOpen(true)} className="rounded-full h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="w-3.5 h-3.5" />
            Add ESP32 Node
          </Button>
        </div>
      </div>

      {/* ── DEVICE SELECTOR ──────────────────────────────────────────────── */}
      {devices.length > 1 && (
        <Card className="border-border rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Device</span>
            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedDevice?.device_uid || ""}
                onChange={(e) => handleSelectDevice(e.target.value)}
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 pr-8 appearance-none"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.device_uid}>
                    {d.device_name} ({d.device_uid}){d.status === "ONLINE" ? " — Online" : d.status === "OFFLINE" ? " — Offline" : " — Not Connected"}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </Card>
      )}

      {/* ── STATE BANNERS ────────────────────────────────────────────────── */}
      {dashboardState === "NO_DEVICE" && (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-card rounded-2xl p-6 text-center space-y-3">
          <img
            src={getIoTImage({ name: "farm field sensor" })}
            alt="Smart farm with monitoring sensors"
            className="w-full h-36 sm:h-44 object-cover rounded-xl"
            loading="lazy"
          />
          <Cpu className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Sensor node not connected</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Link your AgriConnect ESP32 field kit to read real farm telemetry. Only genuine sensor readings are ever displayed — synthetic or demo values are never generated here.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={() => setRegisterOpen(true)} size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Link ESP32 Hardware
            </Button>
            {IOT_MOCK_MODE_ENABLED && (
              <Button onClick={() => setTestModeOpen(true)} variant="outline" size="sm" className="rounded-full text-xs border-border">
                <Sliders className="w-3.5 h-3.5 mr-1.5" />
                Demo Test Bench
              </Button>
            )}
          </div>
        </Card>
      )}

      {dashboardState === "OFFLINE" && selectedDevice && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-800 dark:text-red-200 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">Device Offline</p>
            <p>
              Node <span className="font-mono">{selectedDevice.device_uid}</span> was last seen{" "}
              <span className="font-semibold">{formatRelativeTime(selectedDevice.last_seen, now)}</span>. Showing the last real reading received from the hardware.
            </p>
          </div>
        </div>
      )}

      {dashboardState === "ERROR" && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-800 dark:text-red-200 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold text-sm">Could not reach your sensors</p>
            <p>Farm sensor connection lost. Pull down to try again, or come back in a moment.</p>
            <Button variant="outline" size="sm" onClick={handleManualSync} className="mt-2 rounded-full text-xs border-border">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* ── SENSOR CARDS GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soil Moisture */}
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-500" />
                Soil Moisture
              </span>
              {selectedDevice && latestReading?.soil_moisture !== null && latestReading?.soil_moisture !== undefined ? (
                <Badge className="bg-sky-500/15 text-sky-700 border-sky-500/20 text-[10px]">
                  {selectedDevice.status === "ONLINE" ? "Active" : "Offline Record"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDevice && latestReading?.soil_moisture !== null && latestReading?.soil_moisture !== undefined ? (
              <>
                <div className="space-y-0.5">
                  {latestReading.soil_moisture <= 100 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold tracking-tight text-foreground">
                        {Math.round(latestReading.soil_moisture)}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-2xl font-extrabold text-foreground">{Math.round(latestReading.soil_moisture)}</span>
                      <p className="text-[11px] text-muted-foreground font-medium">Raw sensor value (ADC)</p>
                    </div>
                  )}
                </div>
                {readTimeLabel(latestReading.created_at)}
              </>
            ) : (
              <div className="py-2 space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Sensor node not connected</p>
                <p className="text-[11px] text-muted-foreground">No telemetry available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-500" />
                Temperature
              </span>
              {selectedDevice && latestReading?.temperature !== null && latestReading?.temperature !== undefined ? (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 text-[10px]">
                  {selectedDevice.status === "ONLINE" ? "Active" : "Offline Record"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDevice && latestReading?.temperature !== null && latestReading?.temperature !== undefined ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">
                    {latestReading.temperature.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">°C</span>
                </div>
                {readTimeLabel(latestReading.created_at)}
              </>
            ) : (
              <div className="py-2 space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Sensor node not connected</p>
                <p className="text-[11px] text-muted-foreground">No telemetry available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Humidity */}
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-indigo-500" />
                Humidity
              </span>
              {selectedDevice && latestReading?.humidity !== null && latestReading?.humidity !== undefined ? (
                <Badge className="bg-indigo-500/15 text-indigo-700 border-indigo-500/20 text-[10px]">
                  {selectedDevice.status === "ONLINE" ? "Active" : "Offline Record"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDevice && latestReading?.humidity !== null && latestReading?.humidity !== undefined ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">
                    {Math.round(latestReading.humidity)}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
                {readTimeLabel(latestReading.created_at)}
              </>
            ) : (
              <div className="py-2 space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Sensor node not connected</p>
                <p className="text-[11px] text-muted-foreground">No telemetry available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rain Sensor */}
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-blue-500" />
                Rain Sensor
              </span>
              {selectedDevice && latestReading?.rain_value !== null && latestReading?.rain_value !== undefined ? (
                <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 text-[10px]">
                  {selectedDevice.status === "ONLINE" ? "Active" : "Offline Record"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDevice && latestReading?.rain_value !== null && latestReading?.rain_value !== undefined ? (
              <>
                <div className="space-y-0.5">
                  <span className="text-2xl font-extrabold text-foreground">{latestReading.rain_value}</span>
                  <p className="text-[11px] text-muted-foreground font-medium">Raw sensor value (ADC)</p>
                </div>
                {readTimeLabel(latestReading.created_at)}
              </>
            ) : (
              <div className="py-2 space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Sensor node not connected</p>
                <p className="text-[11px] text-muted-foreground">No telemetry available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── HISTORY + INSIGHTS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={() => setHistoryOpen(true)}
          disabled={!selectedDevice || history.length === 0}
          className="rounded-2xl border-border h-auto p-4 justify-start gap-3 text-left"
        >
          <History className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-foreground">Sensor History</p>
            <p className="text-[11px] text-muted-foreground">
              {history.length > 0 ? "Chart of the last 48 real readings from your node" : "No readings recorded yet"}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
        </Button>

        <Card className="border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Farm Insights</p>
          </div>
          {insights.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {dashboardState === "NO_DEVICE" ? "Link a sensor node to get real-time farming advice based on your actual readings." : "Waiting for enough live data to give advice\u2026"}
            </p>
          ) : (
            <ul className="space-y-2">
              {insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                  {ins.icon === "wifi-off" ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-red-500 shrink-0" /> : ins.icon === "sunrise" ? <Thermometer className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" /> : ins.icon === "cloudy" ? <Wind className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" /> : <Droplets className="w-3.5 h-3.5 mt-0.5 text-sky-500 shrink-0" />}
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── SMART FENCE / BUZZER / PUMP — COMMAND CARD ────────────────────── */}
      <Card className="border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/40 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/20">
                <Fence className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Field Controls
                  <Badge variant="outline" className="text-[10px] font-normal border-border">Commands on this page are confirmed by your hardware</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Buzzer, Smart Fence and water pump — nothing is shown as done until the device confirms it.
                </CardDescription>
              </div>
            </div>

            <div>
              {currentFenceStatus !== "NOT_CONNECTED" ? (
                <Badge className={currentFenceStatus === "INTRUSION" ? "bg-red-500 text-white font-bold" : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  {currentFenceStatus}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                  Hardware Not Connected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Smart fence */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Fence className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Smart Fence</p>
                <p className="text-[11px] text-muted-foreground">Laser beam + LDR perimeter security</p>
                {renderCommandState("ARM_FENCE")}
                {renderCommandState("DISARM_FENCE")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.laserFence || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.ARM_FENCE?.phase === "sending" || commandStates.ARM_FENCE?.phase === "queued"}
                onClick={() => issueCommand("ARM_FENCE")}
                className="rounded-full text-xs border-border"
              >
                <Fence className="w-3.5 h-3.5" />
                Arm
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.laserFence || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.DISARM_FENCE?.phase === "sending" || commandStates.DISARM_FENCE?.phase === "queued"}
                onClick={() => issueCommand("DISARM_FENCE")}
                className="rounded-full text-xs border-border"
              >
                Disarm
              </Button>
            </div>
          </div>

          {/* Buzzer */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Volume2 className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Buzzer Deterrent</p>
                <p className="text-[11px] text-muted-foreground">Scare away stray animals</p>
                {renderCommandState("BUZZER_ON")}
                {renderCommandState("BUZZER_OFF")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                disabled={!selectedDevice?.capabilities.buzzer || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.BUZZER_ON?.phase === "sending" || commandStates.BUZZER_ON?.phase === "queued"}
                onClick={() => issueCommand("BUZZER_ON")}
                className="rounded-full text-xs flex-1 sm:flex-initial gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {selectedDevice?.capabilities.buzzer ? "Buzzer On" : "Buzzer Unavailable"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.buzzer || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.BUZZER_OFF?.phase === "sending" || commandStates.BUZZER_OFF?.phase === "queued"}
                onClick={() => issueCommand("BUZZER_OFF")}
                className="rounded-full text-xs flex-1 sm:flex-initial border-border"
              >
                Buzzer Off
              </Button>
            </div>
          </div>

          {/* Water pump */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                <Droplets className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Water Pump</p>
                <p className="text-[11px] text-muted-foreground">Relay-controlled irrigation</p>
                {renderCommandState("PUMP_ON")}
                {renderCommandState("PUMP_OFF")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                disabled={!selectedDevice?.capabilities.pump || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.PUMP_ON?.phase === "sending" || commandStates.PUMP_ON?.phase === "queued"}
                onClick={() => issueCommand("PUMP_ON")}
                className="rounded-full text-xs flex-1 sm:flex-initial gap-1.5 bg-sky-700 hover:bg-sky-800 text-white"
              >
                <Droplets className="w-3.5 h-3.5" />
                {selectedDevice?.capabilities.pump ? "Pump On" : "Pump Unavailable"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDevice?.capabilities.pump || !selectedDevice || selectedDevice.status !== "ONLINE" || commandStates.PUMP_OFF?.phase === "sending" || commandStates.PUMP_OFF?.phase === "queued"}
                onClick={() => issueCommand("PUMP_OFF")}
                className="rounded-full text-xs flex-1 sm:flex-initial border-border"
              >
                Pump Off
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">How commands work</p>
                <p className="text-muted-foreground max-w-xl">
                  Your node checks for new commands every 15 seconds, executes them on the connected GPIOs, and sends back a confirmation. Until that confirmation arrives, the app shows "waiting for the device" — never a premature success.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setFenceGuideOpen(true)} className="rounded-full text-xs border-border flex-1 sm:flex-initial">
                Wiring Guide
              </Button>
              <Button size="sm" onClick={() => setHistoryOpen(true)} disabled={commands.length === 0} variant="outline" className="rounded-full text-xs border-border flex-1 sm:flex-initial gap-1.5">
                <History className="w-3.5 h-3.5" />
                Command Log
              </Button>
            </div>
          </div>

          {/* Command log */}
          {commands.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                Recent Commands
              </p>
              {commands.slice(0, 4).map((c) => {
                const lifecycle = describeCommandLifecycle(c.issued_at, c.state);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 text-[11px] py-1.5 px-2 rounded-lg bg-muted/40">
                    <span className="font-mono font-semibold text-foreground">{c.command}</span>
                    <span className={`flex items-center gap-1.5 ${c.state === "FAILED" ? "text-red-600" : c.state === "EXECUTED" ? "text-emerald-700" : "text-amber-700"}`}>
                      {commandStateIcon(lifecycle)}
                      {lifecycle.label}
                      <span className="text-muted-foreground">\u00b7 {formatRelativeTime(c.issued_at, now)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
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
              Enter the Device UID printed on your micro-controller. It becomes yours and only yours to view.
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