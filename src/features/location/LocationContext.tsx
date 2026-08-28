import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
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

// No silent default city — live weather must never fabricate a location.
// When no explicit/manual/GPS/farm location exists, coords stay undefined and
// consumers show a "set your location" prompt instead of a fake default city.
function initialLocation(): NormalizedLocation & { status: LocationStatus; error?: string } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NormalizedLocation;
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return { ...parsed, status: 'ready', source: 'saved' };
      }
    }
  } catch {
    // Storage can be unavailable in private browsing or constrained webviews.
  }
  return { status: 'idle' };
}

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [location, setLocation] = useState<NormalizedLocation & { status: LocationStatus; error?: string }>(initialLocation);

  const [farms, setFarms] = useState<FarmLocation[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const persistInFlight = useRef(false);

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
      // Serialize writes to prevent race conditions on rapid updates.
      if (user && !persistInFlight.current) {
        persistInFlight.current = true;
                (async () => {
          try {
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
          } finally {
            persistInFlight.current = false;
          }
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

    const handleSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      let revInfo = {};
      try {
        const rev = await import('./reverseGeocode');
        revInfo = await rev.default(latitude, longitude);
      } catch (e) {
        console.warn('[LocationContext] Reverse geocoding fallback:', e);
      }

      const loc: NormalizedLocation = {
        latitude,
        longitude,
        accuracy,
        city: 'Current Location',
        ...revInfo,
        source: 'gps',
      };
      updateLocation(loc, 'ready');
    };

    const handleError = (err: GeolocationPositionError) => {
      // If high accuracy failed, try standard accuracy once before reporting error
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (finalErr) => {
          let msg = '';
          switch (finalErr.code) {
            case finalErr.PERMISSION_DENIED:
              msg = 'Location permission denied. Please allow location access.';
              break;
            case finalErr.POSITION_UNAVAILABLE:
              msg = 'Location unavailable. Turn on device GPS or choose city manually.';
              break;
            case finalErr.TIMEOUT:
              msg = 'Location request timed out. Please try again.';
              break;
            default:
              msg = finalErr.message || 'Unable to detect location.';
          }
          // Keep whatever coords we already had (never fabricate a default city).
          const hasCoords = !!location.latitude;
          updateLocation(hasCoords ? location : ({} as NormalizedLocation), hasCoords ? 'ready' : 'error', msg);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
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
      const mapped = rows.map((r) => ({
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
      }));
      setFarms(mapped);
      // If the user never explicitly set a location but has a farm saved, adopt
      // the active farm location so farm advisories are hyperlocal (never a fake city).
      setLocation((prev) => {
        if (prev.latitude || prev.status === 'error' && (prev as NormalizedLocation).latitude) return prev;
        const active = mapped.find((f) => f.is_active) || mapped[0];
        if (!active) return prev;
        if (prev.latitude) return prev;
        return {
          latitude: active.latitude,
          longitude: active.longitude,
          city: active.village || active.district,
          district: active.district,
          state: active.state,
          village: active.village,
          pincode: active.pincode,
          source: 'manual',
          status: 'ready',
          updatedAt: Date.now(),
        } as typeof prev;
      });
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

  // Safety timeout: if location is still 'loading' after 20s (user ignored the GPS prompt),
  // transition to 'error' so weather/other features don't spin forever.
  useEffect(() => {
    if (location.status === 'loading') {
      const t = setTimeout(() => {
        setLocation((prev) => {
          if (prev.status === 'loading') {
            return { ...prev, status: 'error', error: 'Location permission is disabled. Please enable it in your browser settings or set your location manually.' };
          }
          return prev;
        });
      }, 20000);
      return () => clearTimeout(t);
    }
  }, [location.status]);

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
