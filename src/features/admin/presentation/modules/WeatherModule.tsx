import React, { useState, useEffect } from 'react';
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
  Sun,
  Activity,
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

const REGIONAL_STATIONS: WeatherStation[] = [
  {
    id: 'ws-indore',
    name: 'Indore Malwa Agro-Station',
    state: 'Madhya Pradesh',
    temp: 28,
    humidity: 62,
    windSpeed: 11,
    condition: 'Partly Cloudy',
    rainProbability: 20,
    sprayCondition: 'Safe',
    advisory: 'Optimal weather for foliar nutrient sprays. Soil moisture is adequate.',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'ws-ludhiana',
    name: 'PAU Ludhiana Agro-Met Center',
    state: 'Punjab',
    temp: 31,
    humidity: 55,
    windSpeed: 9,
    condition: 'Sunny',
    rainProbability: 10,
    sprayCondition: 'Safe',
    advisory: 'Clear skies. Wheat crop jointing stage requires light irrigation.',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'ws-karnal',
    name: 'CSSRI Karnal Weather Station',
    state: 'Haryana',
    temp: 30,
    humidity: 58,
    windSpeed: 14,
    condition: 'Clear',
    rainProbability: 15,
    sprayCondition: 'Safe',
    advisory: 'Moderate wind speeds. Perform spraying before 11:00 AM.',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'ws-nashik',
    name: 'Nashik Grape & Onion Zone',
    state: 'Maharashtra',
    temp: 27,
    humidity: 74,
    windSpeed: 16,
    condition: 'Overcast',
    rainProbability: 45,
    sprayCondition: 'Moderate',
    advisory: 'High humidity risk for fungal downy mildew. Monitor onion foliage.',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'ws-varanasi',
    name: 'Varanasi Gangetic Plains',
    state: 'Uttar Pradesh',
    temp: 32,
    humidity: 50,
    windSpeed: 8,
    condition: 'Sunny',
    rainProbability: 5,
    sprayCondition: 'Safe',
    advisory: 'Hot and dry conditions. Maintain moisture in vegetable nurseries.',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'ws-jaipur',
    name: 'Jaipur Agro-Met Observatory',
    state: 'Rajasthan',
    temp: 34,
    humidity: 38,
    windSpeed: 18,
    condition: 'Breezy / Hot',
    rainProbability: 0,
    sprayCondition: 'Unsafe',
    advisory: 'High wind velocity (18 km/h). Postpone herbicide/pesticide sprays.',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export function WeatherModule() {
  const [stations, setStations] = useState<WeatherStation[]>(REGIONAL_STATIONS);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<WeatherStation>(REGIONAL_STATIONS[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = stations.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.state.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setStations((prev) =>
        prev.map((s) => ({
          ...s,
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })),
      );
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weather & Agro-Meteorological Monitoring"
        subtitle="Real-time agricultural weather stations, spray advisories, and climate alerts"
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="rounded-xl">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Stations
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatCard
          label="Active Weather Stations"
          value={stations.length}
          icon={Activity}
          tone="emerald"
          caption="Online & Streaming"
        />
        <StatCard
          label="Average Regional Temp"
          value={`${Math.round(stations.reduce((s, x) => s + x.temp, 0) / stations.length)}°C`}
          icon={Thermometer}
          tone="amber"
          caption="Across 6 states"
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

      {/* Main Grid: Station Selector + Detail Card */}
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
                  onClick={() => setSelectedStation(station)}
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
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Stream Connected</span>
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
            <span>IMD Automated Agro-Station Standard Sync</span>
            <span>Protocol: WMO-Agromet-19 / WGS84</span>
          </div>
        </div>
      </div>
    </div>
  );
}
