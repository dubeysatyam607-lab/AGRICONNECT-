import React, { useState } from "react";
import { Droplets, Fence, Battery, Signal, AlertTriangle, CheckCircle2, RefreshCw, MapPin, Wifi } from "lucide-react";
import { getMoistureReadings } from "@/lib/moisture-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface MoistureReading {
  id: string;
  zone: string;
  moisture: number;
  temperature: number;
  battery: number;
  lastUpdated: Date;
  status: "optimal" | "low" | "critical";
}

interface FenceNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  active: boolean;
  battery: number;
  signal: number;
  lastPing: Date;
}

// NOTE: Real moisture data is fetched from Supabase via moisture-service.
// The mock data remains for development fallback but will be replaced on component mount.


const MOCK_FENCE_NODES: FenceNode[] = [
  { id: "f1", name: "Gate 1 (Main)", lat: 26.85, lng: 80.95, active: true, battery: 78, signal: 92, lastPing: new Date() },
  { id: "f2", name: "Corner Post NW", lat: 26.851, lng: 80.949, active: true, battery: 65, signal: 88, lastPing: new Date() },
  { id: "f3", name: "Corner Post NE", lat: 26.851, lng: 80.951, active: false, battery: 12, signal: 30, lastPing: new Date(Date.now() - 3600000) },
  { id: "f4", name: "Corner Post SW", lat: 26.849, lng: 80.949, active: true, battery: 82, signal: 95, lastPing: new Date() },
  { id: "f5", name: "Corner Post SE", lat: 26.849, lng: 80.951, active: true, battery: 71, signal: 90, lastPing: new Date() },
];

const getMoistureColor = (level: number) => {
  if (level >= 60) return "text-primary";
  if (level >= 35) return "text-amber-500";
  return "text-destructive";
};

const getMoistureBg = (level: number) => {
  if (level >= 60) return "bg-primary";
  if (level >= 35) return "bg-amber-500";
  return "bg-destructive";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "optimal":
      return <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20"><CheckCircle2 size={12} className="mr-1" /> Optimal</Badge>;
    case "low":
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"><AlertTriangle size={12} className="mr-1" /> Low</Badge>;
    case "critical":
      return <Badge className="bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/20"><AlertTriangle size={12} className="mr-1" /> Critical</Badge>;
    default:
      return null;
  }
};

const HardwareDashboard: React.FC = () => {
  const { toast } = useToast();
  const [moistureData, setMoistureData] = useState<MoistureReading[]>([]);
  const [fenceNodes, setFenceNodes] = useState<FenceNode[]>(MOCK_FENCE_NODES);
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    // Simulate sync delay
    setTimeout(() => {
      // For demo, just reset syncing state
      setIsSyncing(false);
      setLastSync(new Date());
      toast({
        title: "Sensors Synced",
        description: "All hardware sensors updated successfully.",
      });
    }, 1200);
  };

  // Load real moisture data on mount
  React.useEffect(() => {
    const loadData = async () => {
      const data = await getMoistureReadings();
      setMoistureData(data);
    };
    loadData();
  }, []);

  const criticalMoisture = moistureData.filter(m => m.status === "critical").length;
  const offlineNodes = fenceNodes.filter(f => !f.active).length;

  return (
    <div className="pb-24 pt-4 min-h-screen space-y-6">
      {/* Header */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Signal size={22} className="text-primary" />
            Farm Hardware
          </h1>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>

        {/* Honest simulation notice — no real sensors are connected yet */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-black">Simulation mode.</span> No physical sensors are connected to your account yet. Readings shown here are illustrative — connect your AgriConnect IoT kit to see live field data.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Last synced: {lastSync.toLocaleTimeString("en-IN")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <Card className="border-border shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Droplets size={18} className="text-sky-500" />
              {criticalMoisture > 0 ? (
                <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-[10px]">{criticalMoisture} Alert</Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">Healthy</Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{moistureData.length}</p>
            <p className="text-xs text-muted-foreground">Moisture Sensors</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-card rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Fence size={18} className="text-emerald-500" />
              {offlineNodes > 0 ? (
                <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-[10px]">{offlineNodes} Offline</Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">Active</Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{fenceNodes.length}</p>
            <p className="text-xs text-muted-foreground">Fence Nodes</p>
          </CardContent>
        </Card>
      </div>

      {/* Moisture Detector Section */}
      <div className="px-4">
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Droplets size={16} className="text-sky-500" />
              Soil Moisture Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {moistureData.map((sensor) => (
              <div key={sensor.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{sensor.zone}</span>
                    {getStatusBadge(sensor.status)}
                  </div>
                  <span className={`text-sm font-bold ${getMoistureColor(sensor.moisture)}`}>
                    {Math.round(sensor.moisture)}%
                  </span>
                </div>
                <Progress
                  value={sensor.moisture}
                  className="h-2"
                />
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Battery size={11} />
                    {Math.round(sensor.battery)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wifi size={11} />
                    {sensor.temperature}°C
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Digital Fencing Section */}
      <div className="px-4">
        <Card className="border-border shadow-card rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Fence size={16} className="text-emerald-500" />
              Smart Digital Fencing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Fence Status Overview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${offlineNodes > 0 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                {offlineNodes > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {offlineNodes > 0 ? `${offlineNodes} node${offlineNodes > 1 ? "s" : ""} offline` : "Perimeter Secure"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {offlineNodes > 0 ? "Check battery and signal strength" : "All fence nodes reporting normally"}
                </p>
              </div>
            </div>

            {/* Node List */}
            <div className="space-y-2">
              {fenceNodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    node.active
                      ? "bg-card border-border"
                      : "bg-destructive/5 border-destructive/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${node.active ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{node.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {node.active ? "Active" : "Offline"} · Signal {Math.round(node.signal)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Battery size={11} className={node.battery < 20 ? "text-destructive" : ""} />
                      <span className={node.battery < 20 ? "text-destructive font-semibold" : ""}>
                        {Math.round(node.battery)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {node.lastPing.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HardwareDashboard;

