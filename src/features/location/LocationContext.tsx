import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NormalizedLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  village?: string;
  source?: 'gps' | 'manual' | 'ip' | 'saved';
  updatedAt?: number;
}

export interface FarmLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
  village?: string;
  pincode?: string;
  area?: number;
  crop?: string;
  is_active: boolean;
}

type LocationStatus = 'idle' | 'loading' | 'error' | 'ready';

interface LocationContextValue {
  location: NormalizedLocation & { status: LocationStatus; error?: string };
  farms: FarmLocation[];
  farmsLoading: boolean;
  setActiveFarm: (farm: FarmLocation) => void;
  addFarm: (farm: Omit<FarmLocation, 'id' | 'is_active'>) => Promise<FarmLocation | null>;
  removeFarm: (id: number) => Promise<void>;
  requestGps: () => void;
  setManual: (loc: Omit<NormalizedLocation, 'source' | 'updatedAt'>) => void;
  refresh: () => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

const STORAGE_KEY = 'agriLocation';

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [location, setLocation] = useState<NormalizedLocation & { status: LocationStatus; error?: string }>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NormalizedLocation;
        return { ...parsed, status: 'ready', source: 'saved' };
      }
    } catch {
      // Storage can be unavailable in private browsing or constrained webviews.
    }
    return { status: 'idle' };
  });

  const [farms, setFarms] = useState<FarmLocation[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);

  const saveLocation = (loc: NormalizedLocation) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Location persistence is best-effort.
    }
  };

  const updateLocation = (loc: NormalizedLocation, status: LocationStatus = 'ready', error?: string) => {
    const updated = { ...loc, status, error, updatedAt: Date.now() } as typeof location;
    setLocation(updated);
    if (status === 'ready') {
      saveLocation(loc);
      // Persist to Supabase so the location survives devices (best-effort).
      if (user) {
                (async () => {
          // Find existing location for this user (if any)
          const { data: existing } = await supabase
            .from('user_locations')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          const payload = {
            user_id: user.id,
            latitude: loc.latitude ?? null,
            longitude: loc.longitude ?? null,
            city: loc.city || null,
            district: loc.district || null,
            state: loc.state || null,
            country: loc.country || null,
            pincode: loc.pincode || null,
            village: loc.village || null,
            accuracy: loc.accuracy ?? null,
            location_source: loc.source || 'manual',
            updated_at: new Date().toISOString(),
          };
          const { error } = existing
            ? await supabase.from('user_locations').update(payload).eq('id', existing.id)
            : await supabase.from('user_locations').insert(payload);
          if (error) console.warn('[LocationContext] Failed to persist location:', error.message);
        })();
      }
    }
  };

  const requestGps = async () => {
    if (!navigator.geolocation) {
      updateLocation({}, 'error', 'Geolocation not supported');
      return;
    }
    updateLocation(location, 'loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 200) {
          updateLocation({ latitude, longitude, accuracy, source: 'gps' }, 'error', 'Location accuracy is low. Try again.');
          return;
        }
        try {
          const rev = await import('./reverseGeocode');
          const revInfo = await rev.default(latitude, longitude);
          const loc: NormalizedLocation = {
            latitude,
            longitude,
            accuracy,
            ...revInfo,
            source: 'gps',
          };
          updateLocation(loc, 'ready');
        } catch (e: any) {
          updateLocation({ latitude, longitude, accuracy, source: 'gps' }, 'error', e.message || 'Reverse geocoding failed');
        }
      },
      (err) => {
        let msg = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission denied';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Location unavailable';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out';
            break;
          default:
            msg = err.message;
        }
        updateLocation({}, 'error', msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const setManual = (loc: Omit<NormalizedLocation, 'source' | 'updatedAt'>) => {
    const manualLoc: NormalizedLocation = { ...loc, source: 'manual' };
    updateLocation(manualLoc, 'ready');
  };

  const refresh = () => {
    requestGps();
  };

  // Load farm locations from Supabase for the signed-in user.
  const loadFarms = useCallback(async () => {
    if (!user) {
      setFarms([]);
      return;
    }
    setFarmsLoading(true);
    try {
      const { data, error } = await supabase
        .from('farm_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as any[];
      setFarms(rows.map((r) => ({
        id: r.id,
        name: r.name,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        state: r.state || undefined,
        district: r.district || undefined,
        village: r.village || undefined,
        pincode: r.pincode || undefined,
        area: r.area != null ? Number(r.area) : undefined,
        crop: r.crop || undefined,
        is_active: !!r.is_active,
      })));
    } catch (e: any) {
      console.warn('[LocationContext] Failed to load farms:', e?.message);
      setFarms([]);
    } finally {
      setFarmsLoading(false);
    }
  }, [user]);

  const setActiveFarm = (farm: FarmLocation) => {
    setFarms((prev) => prev.map((f) => ({ ...f, is_active: f.id === farm.id })));
    setManual({
      latitude: farm.latitude,
      longitude: farm.longitude,
      city: farm.village || farm.district,
      district: farm.district,
      state: farm.state,
      pincode: farm.pincode,
      village: farm.village,
      source: 'manual',
    });
    if (user) {
      supabase.from('farm_locations')
        .update({ is_active: false }).eq('user_id', user.id)
        .then(() => supabase.from('farm_locations').update({ is_active: true }).eq('id', farm.id))
        .then(({ error }) => { if (error) console.warn('[LocationContext] Farm activation failed:', error.message); });
    }
  };

  const addFarm = async (farm: Omit<FarmLocation, 'id' | 'is_active'>): Promise<FarmLocation | null> => {
    if (!user) return null;
    const { data, error } = await supabase.from('farm_locations').insert({
      user_id: user.id,
      name: farm.name,
      latitude: farm.latitude,
      longitude: farm.longitude,
      state: farm.state || null,
      district: farm.district || null,
      village: farm.village || null,
      pincode: farm.pincode || null,
      area: farm.area ?? null,
      crop: farm.crop || null,
      is_active: farms.length === 0,
    }).select().single();
    if (error) {
      console.warn('[LocationContext] Failed to add farm:', error.message);
      return null;
    }
    await loadFarms();
    return {
      id: data.id,
      name: data.name,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      state: data.state || undefined,
      district: data.district || undefined,
      village: data.village || undefined,
      pincode: data.pincode || undefined,
      area: data.area != null ? Number(data.area) : undefined,
      crop: data.crop || undefined,
      is_active: !!data.is_active,
    };
  };

  const removeFarm = async (id: number) => {
    if (!user) return;
    const { error } = await supabase.from('farm_locations').delete().eq('id', id).eq('user_id', user.id);
    if (error) console.warn('[LocationContext] Failed to remove farm:', error.message);
    await loadFarms();
  };

  // Load farms when auth state changes.
  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  // On mount: try GPS if no saved location
  useEffect(() => {
    if (!location.latitude && location.status === 'idle') {
      requestGps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider
      value={{ location, farms, farmsLoading, setActiveFarm, addFarm, removeFarm, requestGps, setManual, refresh }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within a LocationProvider');
  return ctx;
};
