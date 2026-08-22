import { CloudRain } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function WeatherModule() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Weather Data Monitoring"
        subtitle="Real-time weather data for agricultural planning"
      />
      <div className="rounded-xl border bg-card p-8 text-center">
        <CloudRain className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">Weather data not yet connected</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          To display weather station data here, create a <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">weather_readings</code> table in your Supabase database
          and connect it to an external weather API (e.g., OpenWeatherMap, IMD).
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Users can already view weather forecasts in the app via the <strong>Weather</strong> module on the farmer home screen.
        </p>
      </div>
    </div>
  );
}
