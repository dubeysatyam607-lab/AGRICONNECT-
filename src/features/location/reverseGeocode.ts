/**
 * Reverse geocoding via OpenStreetMap Nominatim (free, no API key).
 * Resolves lat/lng to Indian admin fields (city/district/state/pincode).
 * All calls include a proper User-Agent (Nominatim usage policy).
 */

export interface ReverseGeocodeResult {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

const extractAddress = (raw: any): ReverseGeocodeResult => {
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

export default async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&` +
    `lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&zoom=10`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AgriConnect/1.0 (https://agriconnect-navy-six.vercel.app)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);
    const data = await res.json();
    return extractAddress(data);
  } finally {
    clearTimeout(timer);
  }
}
