import React from 'react';
import { MapPin, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StorageFacility {
  id: number;
  name: string;
  location: string;
  status: 'Available' | 'Limited' | 'Full';
  lat: number;
  lng: number;
  pricePerQuintal: number;
  available: string;
}

interface StorageMapProps {
  facilities: StorageFacility[];
  onSelectFacility?: (facility: StorageFacility) => void;
}

const statusIcon = {
  Available: <CheckCircle2 size={14} className="text-green-600" />,
  Limited: <AlertTriangle size={14} className="text-yellow-600" />,
  Full: <XCircle size={14} className="text-red-500" />,
} as const;

const statusColor = {
  Available: 'bg-green-50 border-green-200',
  Limited: 'bg-yellow-50 border-yellow-200',
  Full: 'bg-red-50 border-red-200',
} as const;

const statusBadge = {
  Available: 'bg-green-100 text-green-700',
  Limited: 'bg-yellow-100 text-yellow-700',
  Full: 'bg-red-100 text-red-600',
} as const;

const StorageMap: React.FC<StorageMapProps> = ({ facilities, onSelectFacility }) => {
  if (!facilities.length) {
    return (
      <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg text-sm text-muted-foreground">
        No storage facilities found nearby.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {facilities.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelectFacility?.(f)}
          className={`w-full text-left rounded-lg border p-3 transition hover:shadow-md cursor-pointer ${statusColor[f.status]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="shrink-0" />
                {f.location}
              </p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[f.status]}`}>
              {statusIcon[f.status]}
              {f.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-green-700 font-bold">
              ₹{Number.isFinite(f.pricePerQuintal) ? f.pricePerQuintal : 0}/quintal
            </span>
            <span className="text-muted-foreground">{f.available}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default StorageMap;
