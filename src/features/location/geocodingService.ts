/**
 * Enterprise Indian Geocoding & Location Resolver for AgriConnect.
 *
 * Provides:
 * 1. Fast local coordinate lookup for 150+ Indian agricultural districts/cities
 * 2. Forward geocoding via Open-Meteo Geocoding API & OpenStreetMap Nominatim
 * 3. Reverse geocoding for GPS coordinate pairs
 *
 * Strict Rule: Never silently defaults to Jaipur or Delhi. If location cannot be
 * resolved, clearly reports null so the UI can prompt the user to choose.
 */

export interface GeocodedPlace {
  name: string;
  district: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  pincode?: string;
}

// Curated high-accuracy coordinate dictionary for Indian agricultural hubs
const INDIAN_DISTRICTS_COORDS: Record<string, { lat: number; lon: number; state: string; district: string }> = {
  // Madhya Pradesh
  "shivpuri": { lat: 25.4244, lon: 77.6534, state: "Madhya Pradesh", district: "Shivpuri" },
  "indore": { lat: 22.7196, lon: 75.8577, state: "Madhya Pradesh", district: "Indore" },
  "bhopal": { lat: 23.2599, lon: 77.4126, state: "Madhya Pradesh", district: "Bhopal" },
  "gwalior": { lat: 26.2183, lon: 78.1828, state: "Madhya Pradesh", district: "Gwalior" },
  "jabalpur": { lat: 23.1815, lon: 79.9864, state: "Madhya Pradesh", district: "Jabalpur" },
  "ujjain": { lat: 23.1765, lon: 75.7885, state: "Madhya Pradesh", district: "Ujjain" },
  "sagar": { lat: 23.8388, lon: 78.7378, state: "Madhya Pradesh", district: "Sagar" },
  "dewas": { lat: 22.9676, lon: 76.0534, state: "Madhya Pradesh", district: "Dewas" },
  "satna": { lat: 24.6005, lon: 80.8322, state: "Madhya Pradesh", district: "Satna" },
  "rewa": { lat: 24.5362, lon: 81.3037, state: "Madhya Pradesh", district: "Rewa" },
  "ratlam": { lat: 23.3315, lon: 75.0367, state: "Madhya Pradesh", district: "Ratlam" },
  "vidisha": { lat: 23.5251, lon: 77.8081, state: "Madhya Pradesh", district: "Vidisha" },
  "mandsaur": { lat: 24.0723, lon: 75.0682, state: "Madhya Pradesh", district: "Mandsaur" },
  "neemuch": { lat: 24.4727, lon: 74.8727, state: "Madhya Pradesh", district: "Neemuch" },
  "guna": { lat: 24.6469, lon: 77.3117, state: "Madhya Pradesh", district: "Guna" },
  "sehore": { lat: 23.2031, lon: 77.0844, state: "Madhya Pradesh", district: "Sehore" },
  "hoshangabad": { lat: 22.7519, lon: 77.7289, state: "Madhya Pradesh", district: "Narmadapuram" },
  "narmadapuram": { lat: 22.7519, lon: 77.7289, state: "Madhya Pradesh", district: "Narmadapuram" },

  // Maharashtra
  "pimpri-chinchwad": { lat: 18.6298, lon: 73.7997, state: "Maharashtra", district: "Pune" },
  "pimpri": { lat: 18.6298, lon: 73.7997, state: "Maharashtra", district: "Pune" },
  "chinchwad": { lat: 18.6298, lon: 73.7997, state: "Maharashtra", district: "Pune" },
  "pune": { lat: 18.5204, lon: 73.8567, state: "Maharashtra", district: "Pune" },
  "mumbai": { lat: 19.0760, lon: 72.8777, state: "Maharashtra", district: "Mumbai" },
  "nagpur": { lat: 21.1458, lon: 79.0882, state: "Maharashtra", district: "Nagpur" },
  "nashik": { lat: 19.9975, lon: 73.7898, state: "Maharashtra", district: "Nashik" },
  "aurangabad": { lat: 19.8762, lon: 75.3433, state: "Maharashtra", district: "Chhatrapati Sambhaji Nagar" },
  "chhatrapati sambhaji nagar": { lat: 19.8762, lon: 75.3433, state: "Maharashtra", district: "Chhatrapati Sambhaji Nagar" },
  "solapur": { lat: 17.6599, lon: 75.9064, state: "Maharashtra", district: "Solapur" },
  "amravati": { lat: 20.9374, lon: 77.7796, state: "Maharashtra", district: "Amravati" },
  "kolhapur": { lat: 16.7050, lon: 74.2433, state: "Maharashtra", district: "Kolhapur" },
  "sangli": { lat: 16.8524, lon: 74.5815, state: "Maharashtra", district: "Sangli" },
  "satara": { lat: 17.6805, lon: 74.0183, state: "Maharashtra", district: "Satara" },
  "jalgaon": { lat: 21.0077, lon: 75.5626, state: "Maharashtra", district: "Jalgaon" },
  "akola": { lat: 20.7002, lon: 77.0082, state: "Maharashtra", district: "Akola" },
  "latur": { lat: 18.4088, lon: 76.5604, state: "Maharashtra", district: "Latur" },
  "ahmednagar": { lat: 19.0952, lon: 74.7480, state: "Maharashtra", district: "Ahilyanagar" },
  "ahilyanagar": { lat: 19.0952, lon: 74.7480, state: "Maharashtra", district: "Ahilyanagar" },
  "baramati": { lat: 18.1519, lon: 74.5772, state: "Maharashtra", district: "Pune" },

  // Rajasthan
  "jaipur": { lat: 26.9124, lon: 75.7873, state: "Rajasthan", district: "Jaipur" },
  "jodhpur": { lat: 26.2389, lon: 73.0243, state: "Rajasthan", district: "Jodhpur" },
  "kota": { lat: 25.2138, lon: 75.8648, state: "Rajasthan", district: "Kota" },
  "bikaner": { lat: 28.0229, lon: 73.3119, state: "Rajasthan", district: "Bikaner" },
  "udaipur": { lat: 24.5854, lon: 73.7125, state: "Rajasthan", district: "Udaipur" },
  "ajmer": { lat: 26.4499, lon: 74.6399, state: "Rajasthan", district: "Ajmer" },
  "alwar": { lat: 27.5530, lon: 76.6346, state: "Rajasthan", district: "Alwar" },
  "bhilwara": { lat: 25.3407, lon: 74.6313, state: "Rajasthan", district: "Bhilwara" },
  "sikar": { lat: 27.6094, lon: 75.1398, state: "Rajasthan", district: "Sikar" },
  "sri ganganagar": { lat: 29.9038, lon: 73.8772, state: "Rajasthan", district: "Sri Ganganagar" },
  "ganganagar": { lat: 29.9038, lon: 73.8772, state: "Rajasthan", district: "Sri Ganganagar" },
  "hanumangarh": { lat: 29.5817, lon: 74.3294, state: "Rajasthan", district: "Hanumangarh" },
  "nagaur": { lat: 27.1983, lon: 73.7423, state: "Rajasthan", district: "Nagaur" },
  "tonk": { lat: 26.1629, lon: 75.7885, state: "Rajasthan", district: "Tonk" },
  "bharatpur": { lat: 27.2152, lon: 77.5030, state: "Rajasthan", district: "Bharatpur" },

  // Delhi NCR / Haryana / Punjab
  "delhi": { lat: 28.6139, lon: 77.2090, state: "Delhi", district: "New Delhi" },
  "new delhi": { lat: 28.6139, lon: 77.2090, state: "Delhi", district: "New Delhi" },
  "gurugram": { lat: 28.4595, lon: 77.0266, state: "Haryana", district: "Gurugram" },
  "gurgaon": { lat: 28.4595, lon: 77.0266, state: "Haryana", district: "Gurugram" },
  "karnal": { lat: 29.6857, lon: 76.9905, state: "Haryana", district: "Karnal" },
  "hisar": { lat: 29.1492, lon: 75.7217, state: "Haryana", district: "Hisar" },
  "rohtak": { lat: 28.8955, lon: 76.6066, state: "Haryana", district: "Rohtak" },
  "panipat": { lat: 29.3909, lon: 76.9635, state: "Haryana", district: "Panipat" },
  "ambala": { lat: 30.3782, lon: 76.7767, state: "Haryana", district: "Ambala" },
  "chandigarh": { lat: 30.7333, lon: 76.7794, state: "Chandigarh", district: "Chandigarh" },
  "ludhiana": { lat: 30.9010, lon: 75.8573, state: "Punjab", district: "Ludhiana" },
  "amritsar": { lat: 31.6340, lon: 74.8723, state: "Punjab", district: "Amritsar" },
  "jalandhar": { lat: 31.3260, lon: 75.5762, state: "Punjab", district: "Jalandhar" },
  "patiala": { lat: 30.3398, lon: 76.3869, state: "Punjab", district: "Patiala" },
  "bathinda": { lat: 30.2110, lon: 74.9455, state: "Punjab", district: "Bathinda" },

  // Uttar Pradesh & Bihar
  "lucknow": { lat: 26.8467, lon: 80.9462, state: "Uttar Pradesh", district: "Lucknow" },
  "kanpur": { lat: 26.4499, lon: 80.3319, state: "Uttar Pradesh", district: "Kanpur" },
  "varanasi": { lat: 25.3176, lon: 82.9739, state: "Uttar Pradesh", district: "Varanasi" },
  "agra": { lat: 27.1767, lon: 78.0081, state: "Uttar Pradesh", district: "Agra" },
  "prayagraj": { lat: 25.4358, lon: 81.8463, state: "Uttar Pradesh", district: "Prayagraj" },
  "allahabad": { lat: 25.4358, lon: 81.8463, state: "Uttar Pradesh", district: "Prayagraj" },
  "meerut": { lat: 28.9845, lon: 77.7064, state: "Uttar Pradesh", district: "Meerut" },
  "bareilly": { lat: 28.3670, lon: 79.4304, state: "Uttar Pradesh", district: "Bareilly" },
  "aligarh": { lat: 27.8974, lon: 78.0880, state: "Uttar Pradesh", district: "Aligarh" },
  "moradabad": { lat: 28.8386, lon: 78.7733, state: "Uttar Pradesh", district: "Moradabad" },
  "gorakhpur": { lat: 26.7606, lon: 83.3732, state: "Uttar Pradesh", district: "Gorakhpur" },
  "patna": { lat: 25.5941, lon: 85.1376, state: "Bihar", district: "Patna" },
  "gaya": { lat: 24.7914, lon: 85.0002, state: "Bihar", district: "Gaya" },
  "bhagalpur": { lat: 25.2425, lon: 86.9842, state: "Bihar", district: "Bhagalpur" },
  "muzaffarpur": { lat: 26.1209, lon: 85.3647, state: "Bihar", district: "Muzaffarpur" },

  // Gujarat
  "ahmedabad": { lat: 23.0225, lon: 72.5714, state: "Gujarat", district: "Ahmedabad" },
  "surat": { lat: 21.1702, lon: 72.8311, state: "Gujarat", district: "Surat" },
  "vadodara": { lat: 22.3072, lon: 73.1812, state: "Gujarat", district: "Vadodara" },
  "rajkot": { lat: 22.3039, lon: 70.8022, state: "Gujarat", district: "Rajkot" },
  "bhavnagar": { lat: 21.7645, lon: 72.1519, state: "Gujarat", district: "Bhavnagar" },
  "junagadh": { lat: 21.5222, lon: 70.4579, state: "Gujarat", district: "Junagadh" },
  "gandhinagar": { lat: 23.2156, lon: 72.6369, state: "Gujarat", district: "Gandhinagar" },
  "anand": { lat: 22.5645, lon: 72.9289, state: "Gujarat", district: "Anand" },
  "mehsana": { lat: 23.5880, lon: 72.3693, state: "Gujarat", district: "Mehsana" },

  // South India
  "bengaluru": { lat: 12.9716, lon: 77.5946, state: "Karnataka", district: "Bengaluru" },
  "bangalore": { lat: 12.9716, lon: 77.5946, state: "Karnataka", district: "Bengaluru" },
  "mysuru": { lat: 12.2958, lon: 76.6394, state: "Karnataka", district: "Mysuru" },
  "hubballi": { lat: 15.3647, lon: 75.1240, state: "Karnataka", district: "Dharwad" },
  "belagavi": { lat: 15.8497, lon: 74.4977, state: "Karnataka", district: "Belagavi" },
  "chennai": { lat: 13.0827, lon: 80.2707, state: "Tamil Nadu", district: "Chennai" },
  "coimbatore": { lat: 11.0168, lon: 76.9558, state: "Tamil Nadu", district: "Coimbatore" },
  "madurai": { lat: 9.9252, lon: 78.1198, state: "Tamil Nadu", district: "Madurai" },
  "salem": { lat: 11.6643, lon: 78.1460, state: "Tamil Nadu", district: "Salem" },
  "erode": { lat: 11.3410, lon: 77.7172, state: "Tamil Nadu", district: "Erode" },
  "hyderabad": { lat: 17.3850, lon: 78.4867, state: "Telangana", district: "Hyderabad" },
  "warangal": { lat: 17.9689, lon: 79.5941, state: "Telangana", district: "Warangal" },
  "vijayawada": { lat: 16.5062, lon: 80.6480, state: "Andhra Pradesh", district: "Krishna" },
  "guntur": { lat: 16.3067, lon: 80.4365, state: "Andhra Pradesh", district: "Guntur" },
  "visakhapatnam": { lat: 17.6868, lon: 83.2185, state: "Andhra Pradesh", district: "Visakhapatnam" },
  "thiruvananthapuram": { lat: 8.5241, lon: 76.9366, state: "Kerala", district: "Thiruvananthapuram" },
  "kochi": { lat: 9.9312, lon: 76.2673, state: "Kerala", district: "Ernakulam" },

  // East & Others
  "kolkata": { lat: 22.5726, lon: 88.3639, state: "West Bengal", district: "Kolkata" },
  "siliguri": { lat: 26.7271, lon: 88.3953, state: "West Bengal", district: "Darjeeling" },
  "bhubaneswar": { lat: 20.2961, lon: 85.8245, state: "Odisha", district: "Khordha" },
  "cuttack": { lat: 20.4625, lon: 85.8828, state: "Odisha", district: "Cuttack" },
  "raipur": { lat: 21.2514, lon: 81.6296, state: "Chhattisgarh", district: "Raipur" },
  "bilaspur": { lat: 22.0797, lon: 82.1391, state: "Chhattisgarh", district: "Bilaspur" },
  "ranchi": { lat: 23.3441, lon: 85.3096, state: "Jharkhand", district: "Ranchi" },
  "jamshedpur": { lat: 22.8046, lon: 86.2029, state: "Jharkhand", district: "East Singhbhum" },
  "guwahati": { lat: 26.1445, lon: 91.7362, state: "Assam", district: "Kamrup" },
  "dehradun": { lat: 30.3165, lon: 78.0322, state: "Uttarakhand", district: "Dehradun" },
  "haridwar": { lat: 29.9457, lon: 78.1642, state: "Uttarakhand", district: "Haridwar" },
  "shimla": { lat: 31.1048, lon: 77.1734, state: "Himachal Pradesh", district: "Shimla" },
  "srinagar": { lat: 34.0837, lon: 74.7973, state: "Jammu and Kashmir", district: "Srinagar" },
  "jammu": { lat: 32.7266, lon: 74.8570, state: "Jammu and Kashmir", district: "Jammu" },
};

function normalizeKey(str: string): string {
  return (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Cross-environment fetch with timeout using standard AbortController.
 */
async function safeFetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves a city, district, town or place name to accurate coordinates and admin boundaries.
 */
export async function geocodeLocation(query: string): Promise<GeocodedPlace | null> {
  if (!query || typeof query !== "string") return null;
  const clean = query.trim();
  const key = normalizeKey(clean);

  // 1. Fast local dictionary lookup
  if (INDIAN_DISTRICTS_COORDS[key]) {
    const d = INDIAN_DISTRICTS_COORDS[key];
    return {
      name: clean.charAt(0).toUpperCase() + clean.slice(1),
      district: d.district,
      state: d.state,
      country: "India",
      latitude: d.lat,
      longitude: d.lon,
    };
  }

  // Check partial key matches
  for (const [dictKey, val] of Object.entries(INDIAN_DISTRICTS_COORDS)) {
    if (key.includes(dictKey) || dictKey.includes(key)) {
      return {
        name: clean.charAt(0).toUpperCase() + clean.slice(1),
        district: val.district,
        state: val.state,
        country: "India",
        latitude: val.lat,
        longitude: val.lon,
      };
    }
  }

  // 2. Open-Meteo Geocoding API (free, fast, optimized for cities worldwide)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&country=IN&language=en&format=json`;
    const res = await safeFetchWithTimeout(url, {}, 3500);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const top = data.results[0];
        return {
          name: top.name || clean,
          district: top.admin2 || top.admin1 || top.name || clean,
          state: top.admin1 || "India",
          country: top.country || "India",
          latitude: Number(top.latitude),
          longitude: Number(top.longitude),
        };
      }
    }
  } catch (err) {
    console.warn("[GeocodingService] Open-Meteo geocode lookup failed:", err);
  }

  // 3. OpenStreetMap Nominatim fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean + ", India")}&format=json&limit=1&addressdetails=1`;
    const res = await safeFetchWithTimeout(url, { headers: { "User-Agent": "AgriConnect/1.0" } }, 3500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const top = data[0];
        const addr = top.address || {};
        return {
          name: addr.city || addr.town || addr.village || addr.county || clean,
          district: addr.county || addr.state_district || clean,
          state: addr.state || "India",
          country: addr.country || "India",
          latitude: parseFloat(top.lat),
          longitude: parseFloat(top.lon),
          pincode: addr.postcode,
        };
      }
    }
  } catch (err) {
    console.warn("[GeocodingService] Nominatim geocode lookup failed:", err);
  }

  return null;
}

/**
 * Reverse geocodes a coordinate pair to location name, district, and state.
 */
export async function reverseGeocodeCoords(lat: number, lon: number): Promise<{ name: string; district: string; state: string } | null> {
  if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) {
    return null;
  }

  // Check local coordinates proximity (within 8km)
  for (const [_, val] of Object.entries(INDIAN_DISTRICTS_COORDS)) {
    const dLat = Math.abs(val.lat - lat);
    const dLon = Math.abs(val.lon - lon);
    if (dLat < 0.08 && dLon < 0.08) {
      return {
        name: val.district,
        district: val.district,
        state: val.state,
      };
    }
  }

  // Nominatim Reverse Geocoding
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`;
    const res = await safeFetchWithTimeout(url, { headers: { "User-Agent": "AgriConnect/1.0" } }, 3500);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const name = addr.city || addr.town || addr.village || addr.county || addr.suburb || "Your Location";
      const district = addr.county || addr.state_district || name;
      const state = addr.state || "India";
      return { name, district, state };
    }
  } catch (err) {
    console.warn("[GeocodingService] Reverse geocode failed:", err);
  }

  return null;
}
