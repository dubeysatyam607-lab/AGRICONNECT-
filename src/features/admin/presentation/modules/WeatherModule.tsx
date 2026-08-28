import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  CloudRain,
  Activity,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

interface WeatherStation {
  id: string;
  name: string;
  state: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  rainProbability: number;
  sprayCondition: 'Safe' | 'Moderate' | 'Unsafe';
  advisory: string;
  updatedAt: string;
}

interface StationAnchor {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  city: string;
}

const STATION_ANCHORS: StationAnchor[] = [
  { id: 'ws-indore', name: 'Indore Malwa Agro-Station', state: 'Madhya Pradesh', lat: 22.7196, lon: 75.8577, city: 'Indore' },
  { id: 'ws-ludhiana', name: 'PAU Ludhiana Agro-Met Center', state: 'Punjab', lat: 30.901, lon: 75.8573, city: 'Ludhiana' },
  { id: 'ws-karnal', name: 'CSSRI Karnal Weather Station', state: 'Haryana', lat: 29.6857, lon: 76.9905, city: 'Karnal' },
  { id: 'ws-nashik', name: 'Nashik Grape & Onion Zone', state: 'Maharashtra', lat: 19.9975, lon: 73.7898, city: 'Nashik' },
  { id: 'ws-varanasi', name: 'Varanasi Gangetic Plains', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739, city: 'Varanasi' },
  { id: 'ws-jaipur', name: 'Jaipur Agro-Met Observatory', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, city: 'Jaipur' },
];

type SprayCondition = WeatherStation['sprayCondition'];

function computeSprayCondition(rainProb: number, windSpeed: number, humidity: number, temp: number): SprayCondition {
  if (windSpeed > 20 || rainProb >= 60 || temp >= 40) return 'Unsafe';
  if (rainProb >= 35 || humidity >= 75) return 'Moderate';
  return 'Safe';
}

function formatUpdatedAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WeatherModule() {
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const loadStations = useCallback(async () => {
    setIsRefreshing(true);
    const results = await Promise.all(
      STATION_ANCHORS.map(async (anchor) => {
        try {
          const url = `/api/weather?lat=${anchor.lat}&lon=${anchor.lon}&city=${encodeURIComponent(anchor.city)}`;
          const res = await fetch(url);
          if (!res.ok) return null;
          const data = await res.json();
          const live = data?.live;
          if (!live || typeof live.temp !== 'number' || isNaN(live.temp)) return null;
          const s = data?.daily?.[0]?.agriAdvisory || data?.advisoryAlert?.message;
          return {
            id: anchor.id,
            name: anchor.name,
            state: anchor.state,
            temp: Math.round(live.temp),
            humidity: Math.round(live.humidity ?? 0),
            windSpeed: Math.round(live.windSpeed ?? 0),
            condition: live.conditionDesc || live.conditionDescription || live.condition || 'Unknown',
            rainProbability: Math.round(data?.daily?.[0]?.rainProbability ?? 0),
            sprayCondition: computeSprayCondition(
              data?.daily?.[0]?.rainProbability ?? 0,
              live.windSpeed ?? 0,
              live.humidity ?? 0,
              live.temp,
            ),
            advisory: typeof s === 'string' && s ? s : 'Live weather received. Advisory will update with the latest forecast data.',
            updatedAt: formatUpdatedAt(data?.lastUpdated),
          } as WeatherStation;
        } catch {
          return null;
        }
      }),
    );

    const loaded = results.filter((r): r is WeatherStation => r !== null);
    setFailedCount(STATION_ANCHORS.length - loaded.length);
    setStations(loaded);
    setSelectedStationId((prev) => (prev && loaded.some((s) => s.id === prev) ? prev : (loaded[0]?.id ?? null)));
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null;

  const filtered = stations.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.state.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weather & Agro-Meteorological Monitoring"
        subtitle="Live agricultural weather from Open-Meteo via the AgriConnect API — no simulated readings"
        actions={
          <Button variant="outline" onClick={loadStations} disabled={isRefreshing} className="rounded-xl">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Stations
          </Button>
        }
      />

      {failedCount > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-300">
          <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {failedCount} of {STATION_ANCHORS.length} stations could not be reached. Showing only live readings; offline
            stations will reappear on refresh.
          </span>
        </div>
      )}

      {isRefreshing && stations.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading live weather from Open-Meteo…
        </div>
      )}

      {stations.length > 0 && !isRefreshing ? (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <StatCard
              label="Live Weather Stations"
              value={stations.length}
              icon={Activity}
              tone="emerald"
              caption="Streaming Open-Meteo"
            />
            <StatCard
              label="Average Regional Temp"
              value={`${Math.round(stations.reduce((s, x) => s + x.temp, 0) / stations.length)}°C`}
              icon={Thermometer}
              tone="amber"
              caption={`Across ${stations.length} stations`}
            />
            <StatCard
              label="Safe Spray Zones"
              value={stations.filter((s) => s.sprayCondition === 'Safe').length}
              icon={ShieldCheck}
              tone="blue"
              caption="Safe for agro-chemicals"
            />
            <StatCard
              label="Weather Warning Zones"
              value={stations.filter((s) => s.sprayCondition === 'Unsafe').length}
              icon={AlertTriangle}
              tone="rose"
              caption="High wind / Rain risk"
            />
          </div>

          {selectedStation ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Search & Stations List */}
              <div className="lg:col-span-1 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search station or state…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-border bg-card"
                  />
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filtered.map((station) => {
                    const isSelected = selectedStation.id === station.id;
                    return (
                      <div
                        key={station.id}
                        onClick={() => setSelectedStationId(station.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                            : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold text-foreground">{station.name}</p>
                            <p className="text-xs text-muted-foreground">{station.state}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              station.sprayCondition === 'Safe'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : station.sprayCondition === 'Moderate'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {station.sprayCondition} Spray
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                          <span className="font-semibold text-foreground">{station.temp}°C · {station.condition}</span>
                          <span>Updated {station.updatedAt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Station Live telemetry */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CloudSun className="h-6 w-6 text-amber-500" />
                      <h3 className="text-lg font-black text-foreground">{selectedStation.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedStation.state} · Live Agricultural Telemetry</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Open-Meteo Live</span>
                  </div>
                </div>

                {/* Environmental Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-center">
                    <Thermometer className="mx-auto h-5 w-5 text-amber-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{selectedStation.temp}°C</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">Ambient Temp</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-center">
                    <Droplets className="mx-auto h-5 w-5 text-blue-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{selectedStation.humidity}%</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">Relative Humidity</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-center">
                    <Wind className="mx-auto h-5 w-5 text-slate-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{selectedStation.windSpeed} km/h</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">Wind Velocity</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-center">
                    <CloudRain className="mx-auto h-5 w-5 text-indigo-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{selectedStation.rainProbability}%</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">Rain Probability</p>
                  </div>
                </div>

                {/* Spray & Agronomy Advisory */}
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Agrometeorological Spray & Field Advisory:</span>
                  </div>
                  <p className="mt-2 text-xs text-foreground/90 leading-relaxed font-medium">
                    {selectedStation.advisory}
                  </p>
                </div>

                {/* Protocol Standards */}
                <div className="mt-6 border-t pt-4 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
                  <span>Data source: Open-Meteo via AgriConnect /api/weather</span>
                  <span>Protocol: WMO-Agromet-19 / WGS84</span>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}