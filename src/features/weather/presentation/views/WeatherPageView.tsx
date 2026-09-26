import React, { useState } from 'react';
import { useWeatherViewModel } from '../viewmodels/useWeatherViewModel';
import { FarmWeatherEnvironment } from '../components/FarmWeatherEnvironment';
import { LiveWeatherHeroCard } from '../components/LiveWeatherHeroCard';
import { CropWeatherActionFlow } from '../components/CropWeatherActionFlow';
import { HourlyForecastTimeline } from '../components/HourlyForecastTimeline';
import { SevenDayForecastCard } from '../components/SevenDayForecastCard';
import { WeatherMetricsGrid } from '../components/WeatherMetricsGrid';
import { ShieldAlert, RefreshCw, Sliders, MapPin, Eye, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

/**
 * Complete Agriculture-First Weather Page.
 * Renders a realistic farm environment background with dynamic weather & crop action flow.
 */
export const WeatherPageView: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    data,
    loading,
    refreshing,
    error,
    isFahrenheit,
    refreshLocation,
    toggleTemperatureUnit,
    formatTemp,
  } = useWeatherViewModel();

  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full mb-4" />
        <h2 className="text-lg font-bold text-foreground">Fetching Live Weather Over Your Farm...</h2>
        <p className="text-xs text-muted-foreground mt-1">Connecting to hyperlocal weather sensors & satellite forecast.</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground">Weather Data Temporarily Unavailable</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
        <button
          onClick={refreshLocation}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold transition-transform hover:scale-105"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const today = data.daily?.[0];
  const rainPct = today?.rainProbability ?? 0;

  return (
    <FarmWeatherEnvironment
      condition={data.live.condition}
      temperature={data.live.temp}
      windSpeed={data.live.windSpeed}
      humidity={data.live.humidity}
      rainProbability={rainPct}
      sunriseTime={data.live.sunriseTime}
      sunsetTime={data.live.sunsetTime}
    >
      <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-4xl mx-auto space-y-5">
        {/* Top Control Header */}
        <div className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20 dark:border-border shadow-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-border bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                Live Farm Weather
              </h1>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <MapPin size={12} className="text-emerald-600" />
                {data.location.name}, {data.location.state}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                reducedMotion
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">{reducedMotion ? 'Static View' : 'Live Motion'}</span>
            </button>
            <button
              onClick={refreshLocation}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Advisory Warning Banner if active */}
        {data.advisoryAlert && (
          <div className="p-4 bg-amber-500/20 backdrop-blur-md border border-amber-500/40 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">{data.advisoryAlert.title || 'Agro-Weather Advisory'}</h4>
              <p className="text-xs mt-0.5 font-medium leading-relaxed">{data.advisoryAlert.message}</p>
            </div>
          </div>
        )}

        {/* 1. Live Weather Summary Card */}
        <LiveWeatherHeroCard
          live={data.live}
          location={data.location}
          formatTemp={formatTemp}
          onRefresh={refreshLocation}
          refreshing={refreshing}
          isFahrenheit={isFahrenheit}
          onToggleUnit={toggleTemperatureUnit}
        />

        {/* 2. CROP CONDITION & FARM ACTION FLOW */}
        <CropWeatherActionFlow
          temperature={data.live.temp}
          condition={data.live.condition}
          rainProbability={rainPct}
          formatTemp={formatTemp}
        />

        {/* 3. 24-Hour Timeline */}
        <HourlyForecastTimeline
          hourly={data.hourly}
          formatTemp={formatTemp}
        />

        {/* 4. Detailed Sensor Metrics Grid */}
        <WeatherMetricsGrid
          live={data.live}
          formatTemp={formatTemp}
          rainProbability={rainPct}
        />

        {/* 5. 7-Day Agricultural Outlook */}
        <SevenDayForecastCard
          daily={data.daily}
          formatTemp={formatTemp}
        />
      </div>
    </FarmWeatherEnvironment>
  );
};

export default WeatherPageView;
