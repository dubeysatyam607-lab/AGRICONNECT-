import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { timeAgo } from '../../domain/adminStore';
import type { WeatherReading } from '../../domain/adminTypes';
import { cn } from '@/lib/utils';

const conditionClass = (c: string) =>
  cn(
    'font-medium',
    c === 'Sunny' && 'text-amber-600 dark:text-amber-400',
    c === 'Cloudy' && 'text-muted-foreground',
    (c.includes('Rain') || c.includes('Storm')) && 'text-blue-600 dark:text-blue-400',
    c === 'Hazy' && 'text-orange-600 dark:text-orange-400',
  );

const COLUMNS: DataColumn<WeatherReading>[] = [
  { key: 'station', header: 'Station', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.station}</p>
        <p className="text-xs text-muted-foreground">{r.district}, {r.state}</p>
      </div>
    ) },
  { key: 'temp', header: 'Temp °C', align: 'right', sortValue: (r) => r.temp, render: (r) => <span className="font-medium">{r.temp}°</span> },
  { key: 'humidity', header: 'Humidity', align: 'right', sortValue: (r) => r.humidity, render: (r) => <span>{r.humidity}%</span> },
  { key: 'rainfall', header: 'Rainfall mm', align: 'right', sortValue: (r) => r.rainfall, render: (r) => <span>{r.rainfall}</span> },
  { key: 'wind', header: 'Wind km/h', align: 'right', sortValue: (r) => r.wind, render: (r) => <span>{r.wind}</span> },
  { key: 'condition', header: 'Condition', render: (r) => <span className={conditionClass(r.condition)}>{r.condition}</span> },
  { key: 'updated', header: 'Updated', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{timeAgo(r.updated)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'state', label: 'State', options: ['Rajasthan', 'Punjab', 'Maharashtra', 'Madhya Pradesh', 'Tamil Nadu', 'Uttar Pradesh', 'Andhra Pradesh', 'Bihar'].map((v) => ({ value: v, label: v })) },
  { key: 'condition', label: 'Condition', options: ['Sunny', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Thunderstorm', 'Hazy'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'station', label: 'Station ID', type: 'text', required: true },
  { name: 'district', label: 'District', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'temp', label: 'Temp (°C)', type: 'number' },
  { name: 'humidity', label: 'Humidity %', type: 'number' },
  { name: 'rainfall', label: 'Rainfall (mm)', type: 'number' },
  { name: 'wind', label: 'Wind (km/h)', type: 'number' },
  { name: 'condition', label: 'Condition', type: 'select', options: ['Sunny', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Thunderstorm', 'Hazy'].map((v) => ({ value: v, label: v })) },
];

export function WeatherModule() {
  const { rows, create, update, remove, removeMany } = useAdminCrud({ key: 'weatherReadings', label: 'Weather Reading', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WeatherReading | null>(null);

  const bulkActions: BulkAction<WeatherReading>[] = [
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected readings?', onClick: removeMany },
  ];

  const avgTemp = rows.length ? Math.round(rows.reduce((s, r) => s + r.temp, 0) / rows.length) : 0;
  const rainStations = rows.filter((r) => r.rainfall > 0).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Weather Data Monitoring"
        subtitle={`${rows.length} stations · avg ${avgTemp}°C · ${rainStations} stations reporting rain`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Reading</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['station', 'district', 'state', 'condition']}
        searchPlaceholder="Search station, district…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="weather-readings"
        onExport={(c) => logAdminExport('Weather Reading', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Reading' : 'Add Reading'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Reading'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
