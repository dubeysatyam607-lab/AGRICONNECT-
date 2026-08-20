/**
 * Forward geocoding via OpenStreetMap Nominatim (free, no API key).
 * Resolves a free-text Indian location query to lat/lng + admin fields.
 */

export interface ForwardGeocodeResult {
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  displayName: string;
}

const extractAddress = (raw: any): { city?: string; district?: string; state?: string; country?: string; pincode?: string } => {
  const a = raw?.address || {};
  const fallback = (v: any) => (typeof v === 'string' ? v : undefined);
  const state = fallback(a.state) || fallback(a.state_district);
  const city =
    fallback(a.city) ||
    fallback(a.town) ||
    fallback(a.village) ||
    fallback(a.municipality) ||
    fallback(a.county) ||
    fallback(a.hamlet);
  return {
    city,
    district: fallback(a.district) || fallback(a.county),
    state,
    country: fallback(a.country),
    pincode: fallback(a.postcode),
  };
};

export async function forwardGeocode(query: string, limit = 5): Promise<ForwardGeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&` +
    `q=${encodeURIComponent(trimmed + ', India')}` +
    `&countrycodes=in&accept-language=en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AgriConnect/1.0 (https://agriconnect-navy-six.vercel.app)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .filter((item: any) => item?.lat && item?.lon)
      .map((item: any) => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        ...extractAddress(item),
        displayName: item.display_name || trimmed,
      }));
  } finally {
    clearTimeout(timer);
  }
}
