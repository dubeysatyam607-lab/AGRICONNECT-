import React, { useState } from 'react';
import { useWeatherViewModel } from '@/features/weather/presentation/viewmodels/useWeatherViewModel';
import { LiveWeatherHeroCard } from '@/features/weather/presentation/components/LiveWeatherHeroCard';
import { WeatherDashboardModal } from '@/features/weather/presentation/views/WeatherDashboardModal';
import { ErrorState } from '@/components/ui/error-state';
import WeatherSkeleton from './skeletons/WeatherSkeleton';

/**
 * Enterprise Google Weather Inspired Dashboard Widget.
 * Renders the animated Live Hero Card on the home screen and launches the full 7-Day Radar dashboard modal upon interaction.
 */
const WeatherWidget: React.FC = () => {
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

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading && !data) {
    return (
      <div className="mx-4 my-2">
        <WeatherSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-4 my-2">
        <ErrorState message={error} onRetry={refreshLocation} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-4 my-2">
      {data.isOfflineCached && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <span className="text-amber-300 text-xs font-bold leading-snug">
            ⚠️ Estimated weather — readings are not live. Connect to the weather service for real-time data.
          </span>
        </div>
      )}
      {/* 1. Dashboard Hero Card */}
      <LiveWeatherHeroCard
        live={data.live}
        location={data.location}
        formatTemp={formatTemp}
        onRefresh={refreshLocation}
        onOpenDetails={() => setIsModalOpen(true)}
        refreshing={refreshing}
        isFahrenheit={isFahrenheit}
        onToggleUnit={toggleTemperatureUnit}
      />

      {/* 2. Interactive Weather Dashboard Modal */}
      <WeatherDashboardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={data}
        formatTemp={formatTemp}
        onRefresh={refreshLocation}
        refreshing={refreshing}
        isFahrenheit={isFahrenheit}
        onToggleUnit={toggleTemperatureUnit}
      />
    </div>
  );
};

export default WeatherWidget;
