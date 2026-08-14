import React, { useState, useEffect, Suspense, lazy } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Warehouse, MapPin, ThermometerSnowflake, IndianRupee, Phone, Navigation, Star } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const StorageMap = lazy(() => import("./StorageMap"));

interface StorageFacility {
  id: number;
  name: string;
  location: string;
  distance: string;
  temperature: string;
  capacity: string;
  available: string;
  pricePerQuintal: number;
  rating: number;
  phone: string;
  status: 'Available' | 'Limited' | 'Full';
  type: 'Cold Storage' | 'Warehouse' | 'Godown';
  lat: number;
  lng: number;
}

const STORAGE_FACILITIES: StorageFacility[] = [
  {
    id: 1,
    name: 'Kisan Cold Storage',
    location: 'Nashik Road, Maharashtra',
    distance: '3.5 km',
    temperature: '-2°C to 4°C',
    capacity: '5000 MT',
    available: '1200 MT',
    pricePerQuintal: 45,
    rating: 4.5,
    phone: '+91 98765 43210',
    status: 'Available',
    type: 'Cold Storage',
    lat: 19.9975,
    lng: 73.7898
  },
  {
    id: 2,
    name: 'Agri Warehouse Hub',
    location: 'Sinnar, Nashik',
    distance: '8 km',
    temperature: 'Ambient',
    capacity: '3000 MT',
    available: '800 MT',
    pricePerQuintal: 25,
    rating: 4.2,
    phone: '+91 87654 32109',
    status: 'Available',
    type: 'Warehouse',
    lat: 19.8515,
    lng: 73.9946
  },
  {
    id: 3,
    name: 'Fresh Harvest Storage',
    location: 'Pimpalgaon, Nashik',
    distance: '12 km',
    temperature: '0°C to 8°C',
    capacity: '8000 MT',
    available: '200 MT',
    pricePerQuintal: 55,
    rating: 4.8,
    phone: '+91 76543 21098',
    status: 'Limited',
    type: 'Cold Storage',
    lat: 20.0284,
    lng: 73.7854
  },
  {
    id: 4,
    name: 'Sahakari Godown',
    location: 'Dindori, Nashik',
    distance: '15 km',
    temperature: 'Ambient',
    capacity: '2000 MT',
    available: '0 MT',
    pricePerQuintal: 20,
    rating: 3.9,
    phone: '+91 65432 10987',
    status: 'Full',
    type: 'Godown',
    lat: 20.2076,
    lng: 73.8539
  },
  {
    id: 5,
    name: 'Onion Cold Chain',
    location: 'Lasalgaon, Nashik',
    distance: '20 km',
    temperature: '0°C to 2°C',
    capacity: '10000 MT',
    available: '3500 MT',
    pricePerQuintal: 50,
    rating: 4.6,
    phone: '+91 54321 09876',
    status: 'Available',
    type: 'Cold Storage',
    lat: 20.1448,
    lng: 74.2361
  },
];

interface ColdStorageProps {
  onToast: (message: string) => void;
}

const ColdStorage: React.FC<ColdStorageProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [facilities, setFacilities] = useState<StorageFacility[]>(STORAGE_FACILITIES);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const { data, error } = await supabase.from('storage_facilities').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const normalized = data.filter((f: any) => f && typeof f.name === 'string').map((f: any) => ({
            ...f,
            name: f.name || 'Storage Facility',
            location: f.location || '',
            phone: f.phone || '',
            type: f.type || 'General',
            distance: f.distance ?? 'N/A',
            temperature: f.temperature ?? '-',
            rating: f.rating ?? 0,
            pricePerQuintal: f.pricePerQuintal ?? 0,
          }));
          setFacilities(normalized as StorageFacility[]);
        }
      } catch {
        // keep mock fallback on failure
      }
    };
    fetchFacilities();
  }, []);

  const filteredFacilities = facilities.filter(facility => {
    const name = (facility.name || '').toLowerCase();
    const location = (facility.location || '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || location.includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || facility.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleContact = (facility: StorageFacility) => {
    const cleaned = (facility.phone || '').replace(/[^\d+]/g, '');
    // Validate phone format: should be 10+ digits
    if (!/^\+?\d{10,}$/.test(cleaned)) {
      onToast(`Invalid phone number for ${facility.name}`);
      return;
    }
    onToast(`Calling ${facility.name}...`);
    window.location.href = `tel:${cleaned}`;
  };

  const handleNavigate = (facility: StorageFacility) => {
    // Validate coordinates are numbers
    const lat = Number(facility.lat);
    const lng = Number(facility.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      onToast(`Invalid location for ${facility.name}`);
      return;
    }
    onToast(`Opening directions to ${facility.name}...`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Limited': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Full': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Warehouse className="text-primary" /> Cold Storage Finder
        </h2>
        <p className="text-muted-foreground text-sm">
          Find nearby storage & warehousing facilities
        </p>
      </div>

      {/* Mapbox Map */}
      <AgriCard className="mb-4 p-0 overflow-hidden">
        <Suspense fallback={<div className="h-56 w-full animate-pulse bg-muted" />}>
          <StorageMap 
            facilities={filteredFacilities.map(f => ({
              id: f.id,
              name: f.name,
              location: f.location,
              status: f.status,
              lat: f.lat,
              lng: f.lng,
              pricePerQuintal: f.pricePerQuintal,
              available: f.available
            }))}
            onSelectFacility={(f) => onToast(`Selected: ${f.name}`)}
          />
        </Suspense>
      </AgriCard>

      {/* Search & Filters */}
      <div className="mb-4 space-y-3">
        <Input
          type="search"
          placeholder="Search by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'Cold Storage', 'Warehouse', 'Godown'].map((type) => (
            <AgriButton
              key={type}
              size="sm"
              variant={filterType === type ? 'primary' : 'outline'}
              onClick={() => setFilterType(type)}
              className="whitespace-nowrap"
            >
              {type === 'all' ? 'All Types' : type}
            </AgriButton>
          ))}
        </div>
      </div>

      {/* Facilities List */}
      <div className="space-y-3">
        {filteredFacilities.map((facility) => (
          <AgriCard key={facility.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-foreground">{facility.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(facility.status)}`}>
                    {facility.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={10} /> {facility.location} • {facility.distance}
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star size={14} fill="currentColor" />
                <span className="text-sm font-medium text-foreground">{facility.rating}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-muted/50 p-2 rounded-lg">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <ThermometerSnowflake size={12} /> Temperature
                </div>
                <p className="font-medium text-foreground">{facility.temperature}</p>
              </div>
              <div className="bg-muted/50 p-2 rounded-lg">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Warehouse size={12} /> Available
                </div>
                <p className="font-medium text-foreground">{facility.available}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <IndianRupee size={14} className="text-primary" />
                <span className="font-bold text-primary text-lg">{facility.pricePerQuintal}</span>
                <span className="text-xs text-muted-foreground">/quintal/month</span>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {facility.type}
              </span>
            </div>

            <div className="flex gap-2">
              <AgriButton
                size="sm"
                onClick={() => handleContact(facility)}
                disabled={facility.status === 'Full'}
                className="flex-1"
              >
                <Phone size={14} /> Call Now
              </AgriButton>
              <AgriButton
                size="sm"
                variant="outline"
                onClick={() => handleNavigate(facility)}
                className="flex-1"
              >
                <Navigation size={14} /> Directions
              </AgriButton>
            </div>
          </AgriCard>
        ))}

        {filteredFacilities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Warehouse size={48} className="mx-auto mb-2 opacity-50" />
            <p>{t('agr81')}</p>
            <p className="text-sm">{t('agr82')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColdStorage;
