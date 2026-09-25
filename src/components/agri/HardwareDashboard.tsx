import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarm } from "@/contexts/FarmContext";
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
  fetchRecentAlerts,
  registerIotDevice,
  sendDeviceCommand,
  sendTestTelemetry,
  type IotDevice,
  type SensorReading,
  type IotAlert,
  type DeviceStatus,
  type FenceStatus,
  DEFAULT_CAPABILITIES,
} from "@/lib/iot-service";

export type DashboardState = "INITIAL" | "NO_DEVICE" | "CONNECTING" | "ONLINE" | "OFFLINE" | "ERROR";

const formatRelativeTime = (timestamp: string | null): string => {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Unknown";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const HardwareDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { profile } = useFarm();
  const { toast } = useToast();

  const farmId = profile.crop ? `farm_${profile.crop.toLowerCase().replace(/\s+/g, "_")}` : "default_farm";
  const farmDisplayName = `${profile.crop || "My"} Farm (${profile.farmArea || 5.2} acres)`;

  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<IotDevice | null>(null);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [dashboardState, setDashboardState] = useState<DashboardState>("INITIAL");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Dialog States
  const [registerOpen, setRegisterOpen] = useState<boolean>(false);
  const [testModeOpen, setTestModeOpen] = useState<boolean>(false);
  const [fenceGuideOpen, setFenceGuideOpen] = useState<boolean>(false);

  // Registration Form
  const [newUid, setNewUid] = useState<string>("AGRI-ESP32-001");
  const [newName, setNewName] = useState<string>("Main Field Node");
  const [newCapabilities, setNewCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Telemetry Simulator
  const [simSoil, setSimSoil] = useState<number>(1842);
  const [simTemp, setSimTemp] = useState<number>(28.4);
  const [simHumid, setSimHumid] = useState<number>(71);
  const [simRain, setSimRain] = useState<number>(840);
  const [simFence, setSimFence] = useState<FenceStatus>("NOT_CONNECTED");
  const [isSendingSim, setIsSendingSim] = useState<boolean>(false);
  const [isSendingCmd, setIsSendingCmd] = useState<boolean>(false);

  // Load Data
  const loadDashboardData = useCallback(async () => {
    setDashboardState("CONNECTING");
    try {
      const farmDevs = await fetchFarmDevices(farmId);
      setDevices(farmDevs);

      const activeDev = farmDevs[0] || null;
      setSelectedDevice(activeDev);

      if (!activeDev) {
        setLatestReading(null);
        setDashboardState("NO_DEVICE");
        return;
      }

      const reading = await fetchLatestReading(activeDev.id);
      setLatestReading(reading);

      if (activeDev.status === "ONLINE") {
        setDashboardState("ONLINE");
      } else if (activeDev.status === "OFFLINE") {
        setDashboardState("OFFLINE");
      } else {
        setDashboardState("NO_DEVICE");
      }

      const recentAlerts = await fetchRecentAlerts(farmId);
      setAlerts(recentAlerts);
    } catch (err) {
      console.error("[HardwareDashboard] Error loading IoT data:", err);
      setDashboardState("ERROR");
    }
  }, [farmId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time Supabase Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`iot_realtime_${farmId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "iot_devices" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings" },
        (payload) => {
          if (selectedDevice && payload.new && payload.new.device_id === selectedDevice.id) {
            setLatestReading(payload.new as SensorReading);
          }
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "iot_alerts" },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmId, selectedDevice, loadDashboardData]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await loadDashboardData();
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: "Sensors Synced", description: "Updated with latest telemetry status." });
    }, 400);
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) {
      toast({ title: "Validation Error", description: "Device UID required.", variant: "destructive" });
      return;
    }

    setIsRegistering(true);
    const res = await registerIotDevice({
      deviceUid: newUid,
      deviceName: newName,
      farmId: farmId,
      capabilities: newCapabilities,
    });

    setIsRegistering(false);
    if (!res.success) {
      toast({ title: "Registration Failed", description: res.error, variant: "destructive" });
      return;
    }

    toast({
      title: "ESP32 Node Linked!",
      description: `Device ${newUid} registered for ${farmDisplayName}. Status: NOT_CONNECTED until first telemetry.`,
    });
    setRegisterOpen(false);
    await loadDashboardData();
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

    toast({ title: "Telemetry Ingested", description: `Updated ${targetUid}. Device status is now ONLINE.` });
    setTestModeOpen(false);
    await loadDashboardData();
  };

  const handleTriggerBuzzer = async (cmd: "BUZZER_ON" | "BUZZER_OFF") => {
    if (!selectedDevice) {
      toast({ title: "No Device", description: "No connected ESP32 node found.", variant: "destructive" });
      return;
    }

    if (!selectedDevice.capabilities.buzzer) {
      toast({
        title: "Hardware Missing",
        description: "Buzzer module is not connected on this ESP32 node.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingCmd(true);
    const res = await sendDeviceCommand(selectedDevice.device_uid, cmd);
    setIsSendingCmd(false);

    if (!res.success) {
      toast({ title: "Command Failed", description: res.error, variant: "destructive" });
      return;
    }

    toast({ title: "Command Delivered", description: res.message });
  };

  const renderStatusDot = (status: DeviceStatus, lastSeen: string | null) => {
    switch (status) {
      case "ONLINE":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            ● Online
          </Badge>
        );
      case "OFFLINE":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            ○ Offline
          </Badge>
        );
      case "NOT_CONNECTED":
      default:
        return (
          <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-semibold px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
            ○ Not Connected
          </Badge>
        );
    }
  };

  const currentFenceStatus = (latestReading?.fence_status as FenceStatus) || "NOT_CONNECTED";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-4 space-y-6">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">AgriConnect Farm Node</h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <span>{farmDisplayName}</span>
            <span>•</span>
            <span className="font-mono">{selectedDevice ? selectedDevice.device_uid : "No Hardware Linked"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedDevice ? (
            renderStatusDot(selectedDevice.status, selectedDevice.last_seen)
          ) : (
            <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
              ○ Not Connected
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

      {/* ── STATE BANNERS ────────────────────────────────────────────────── */}
      {dashboardState === "NO_DEVICE" && (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 bg-card rounded-2xl p-6 text-center space-y-3">
          <Cpu className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Sensor node not connected</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Link your AgriConnect ESP32 field kit to read real farm telemetry. Synthetic or fake data generation is disabled.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={() => setRegisterOpen(true)} size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Link ESP32 Hardware
            </Button>
            <Button onClick={() => setTestModeOpen(true)} variant="outline" size="sm" className="rounded-full text-xs border-border">
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Hardware Test Mode
            </Button>
          </div>
        </Card>
      )}

      {dashboardState === "OFFLINE" && selectedDevice && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">Device Offline</p>
            <p>
              Node <span className="font-mono">{selectedDevice.device_uid}</span> was last seen{" "}
              <span className="font-semibold">{formatRelativeTime(selectedDevice.last_seen)}</span>. Displaying last actual reading received.
            </p>
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
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedDevice.status === "ONLINE" ? "Live · Updated " : "Last seen "}
                  {formatRelativeTime(latestReading.created_at)}
                </p>
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
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedDevice.status === "ONLINE" ? "Live · Updated " : "Last seen "}
                  {formatRelativeTime(latestReading.created_at)}
                </p>
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
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedDevice.status === "ONLINE" ? "Live · Updated " : "Last seen "}
                  {formatRelativeTime(latestReading.created_at)}
                </p>
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
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedDevice.status === "ONLINE" ? "Live · Updated " : "Last seen "}
                  {formatRelativeTime(latestReading.created_at)}
                </p>
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

      {/* ── SMART FENCE — FUTURE READY CARD ─────────────────────────────── */}
      <Card className="border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/40 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/20">
                <Fence className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Smart Fence
                  <Badge variant="outline" className="text-[10px] font-normal border-border">Future Module</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Laser beam + LDR perimeter security and acoustic deterrent
                </CardDescription>
              </div>
            </div>

            <div>
              {currentFenceStatus !== "NOT_CONNECTED" ? (
                <Badge className={currentFenceStatus === "INTRUSION" ? "bg-red-500 text-white font-bold animate-bounce" : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"}>
                  ● {currentFenceStatus}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-medium">
                  ○ Hardware Not Connected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Laser Sensor</p>
                <p className="text-[11px] text-muted-foreground">Transmitter</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">LDR Sensor</p>
                <p className="text-[11px] text-muted-foreground">Receiver</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Buzzer</p>
                <p className="text-[11px] text-muted-foreground">Audio Deterrent</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Not Connected</Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">Smart Fence Setup Instructions</p>
                <p className="text-muted-foreground max-w-xl">
                  Connect Laser diode + LDR module to GPIO pins. When beam interruption occurs, state switches to <span className="font-mono text-destructive font-semibold">INTRUSION</span> and creates immediate farmer alerts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setFenceGuideOpen(true)} className="rounded-full text-xs border-border flex-1 sm:flex-initial">
                Set Up Smart Fence
              </Button>

              <Button
                size="sm"
                variant={selectedDevice?.capabilities.buzzer ? "default" : "secondary"}
                disabled={!selectedDevice?.capabilities.buzzer || isSendingCmd}
                onClick={() => handleTriggerBuzzer("BUZZER_ON")}
                className="rounded-full text-xs flex-1 sm:flex-initial gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {selectedDevice?.capabilities.buzzer ? "Trigger Buzzer" : "Buzzer Unavailable"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ALERTS SECTION ──────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              Recent Farm Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 rounded-xl border border-border bg-card flex items-start justify-between text-xs gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className={alert.severity === "CRITICAL" ? "bg-red-500 text-white" : "bg-amber-500/15 text-amber-700"}>
                      {alert.alert_type}
                    </Badge>
                    <span className="font-semibold text-foreground">{alert.message}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{formatRelativeTime(alert.created_at)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── TEST BENCH ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Hardware Test Bench / Telemetry Verification</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTestModeOpen(true)} className="rounded-full text-xs h-8 border-border gap-1.5">
          <Send className="w-3.5 h-3.5 text-emerald-600" />
          Post Test Payload
        </Button>
      </div>

      {/* ── REGISTER DEVICE DIALOG ──────────────────────────────────────── */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              Register ESP32 Hardware Node
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your hardware Device UID printed on your micro-controller.
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

      {/* ── TEST BENCH DIALOG ───────────────────────────────────────────── */}
      <Dialog open={testModeOpen} onOpenChange={setTestModeOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Hardware Telemetry Test Bench
            </DialogTitle>
            <DialogDescription className="text-xs">
              Posts JSON payload to <code className="bg-muted px-1.5 py-0.5 rounded font-mono">/api/iot/telemetry</code> to verify real database row insertion and status transition.
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

      {/* ── SMART FENCE SETUP GUIDE DIALOG ─────────────────────────────── */}
      <Dialog open={fenceGuideOpen} onOpenChange={setFenceGuideOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Fence className="w-5 h-5 text-emerald-600" />
              Smart Fence Setup Guide
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pinout instructions for adding Laser Diode + LDR sensor module.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <div className="p-3 rounded-xl bg-muted space-y-1 text-foreground font-medium">
              <p className="font-bold">Hardware Wiring Pinout:</p>
              <p>• Soil Moisture: Analog Output → GPIO 34</p>
              <p>• Rain Sensor: Analog Output → GPIO 35</p>
              <p>• DHT11 Temp/Humidity: Data Pin → GPIO 4</p>
              <p>• Future Laser Diode: VCC → 5V, GND → GND</p>
              <p>• Future LDR Receiver: Signal → GPIO 32</p>
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
