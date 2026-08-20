import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { nearbyServicesRequestSchema, parseAndValidate } from "../_shared/validators.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app"
).split(",").map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : null;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const RATE_LIMIT_CONFIG = { maxRequests: 30, windowMs: 60 * 1000 };

interface NearbyPlace {
  id: string;
  name: string;
  nameHi: string;
  type: "market" | "shop";
  city: string;
  state: string;
  lat: number;
  lng: number;
  address: string;
  addressHi: string;
  phone: string;
  timings: string;
  rating: number;
  specialty?: string;
}

// Rich dataset of Indian mandis and agri-input shops spread across states
const PLACES: NearbyPlace[] = [
  // ---- APMCs / Mandis ----
  { id: "m-jaipur", name: "Jaipur Krishi Mandi", nameHi: "जयपुर कृषि मंडी", type: "market", city: "Jaipur", state: "Rajasthan", lat: 26.8929, lng: 75.8254, address: "Muhana Mandi Road, Jaipur", addressHi: "मुहाना मंडी रोड, जयपुर", phone: "+91 141 2712345", timings: "6:00 AM - 8:00 PM", rating: 4.5, specialty: "Wheat, Mustard, Gram" },
  { id: "m-karnal", name: "Karnal Mandi", nameHi: "करनाल मंडी", type: "market", city: "Karnal", state: "Haryana", lat: 29.6857, lng: 76.9905, address: "Old GT Road, Karnal", addressHi: "पुरानी जीटी रोड, करनाल", phone: "+91 184 2234567", timings: "5:00 AM - 6:00 PM", rating: 4.6, specialty: "Basmati Rice, Wheat" },
  { id: "m-nashik", name: "Nashik APMC Market", nameHi: "नाशिक एपीएमसी मंडी", type: "market", city: "Nashik", state: "Maharashtra", lat: 20.0161, lng: 73.7643, address: "Pimpalgaon Road, Nashik", addressHi: "पिंपळगाव रोड, नाशिक", phone: "+91 253 2580100", timings: "5:00 AM - 7:00 PM", rating: 4.4, specialty: "Onion, Grapes, Tomato" },
  { id: "m-azadpur", name: "Azadpur Mandi (Delhi)", nameHi: "आज़ादपुर मंडी (दिल्ली)", type: "market", city: "Delhi", state: "Delhi", lat: 28.7074, lng: 77.1663, address: "GT Karnal Road, Azadpur, Delhi", addressHi: "जीटी करनाल रोड, आज़ादपुर, दिल्ली", phone: "+91 11 27643500", timings: "4:00 AM - 9:00 PM", rating: 4.3, specialty: "Fruits & Vegetables" },
  { id: "m-indore", name: "Indore Mandi", nameHi: "इंदौर मंडी", type: "market", city: "Indore", state: "Madhya Pradesh", lat: 22.7369, lng: 75.8684, address: "Rajwada Mandi Road, Indore", addressHi: "राजवाड़ा मंडी रोड, इंदौर", phone: "+91 731 2425000", timings: "6:00 AM - 8:00 PM", rating: 4.5, specialty: "Soybean, Wheat, Chana" },
  { id: "m-latur", name: "Latur Tur Market", nameHi: "लातूर तूर बाज़ार", type: "market", city: "Latur", state: "Maharashtra", lat: 18.4088, lng: 76.5604, address: "New Mondha Road, Latur", addressHi: "न्यू मोंढा रोड, लातूर", phone: "+91 2382 221100", timings: "6:00 AM - 7:00 PM", rating: 4.2, specialty: "Arhar (Tur), Soybean" },
  { id: "m-rajkot", name: "Rajkot Krishi Mandi", nameHi: "राजकोट कृषि मंडी", type: "market", city: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022, address: "Gondal Road, Rajkot", addressHi: "गोंडल रोड, राजकोट", phone: "+91 281 2476500", timings: "5:30 AM - 7:00 PM", rating: 4.3, specialty: "Groundnut, Garlic" },
  { id: "m-guntur", name: "Guntur Chilli Yard", nameHi: "गुंटूर मिर्च यार्ड", type: "market", city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, address: "Chilli Yard Road, Guntur", addressHi: "मिर्च यार्ड रोड, गुंटूर", phone: "+91 863 2233300", timings: "6:00 AM - 6:00 PM", rating: 4.4, specialty: "Red Chilli, Cotton" },
  { id: "m-gulbarga", name: "Gulbarga Mandi", nameHi: "गुलबर्गा मंडी", type: "market", city: "Kalaburagi", state: "Karnataka", lat: 17.3297, lng: 76.8343, address: "Station Road, Kalaburagi", addressHi: "स्टेशन रोड, कलबुर्गी", phone: "+91 8472 222300", timings: "6:00 AM - 7:00 PM", rating: 4.1, specialty: "Maize, Tur, Cotton" },
  { id: "m-ludhiana", name: "Ludhiana Mandi", nameHi: "लुधियाना मंडी", type: "market", city: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573, address: "Gill Road, Ludhiana", addressHi: "गिल रोड, लुधियाना", phone: "+91 161 2400330", timings: "5:00 AM - 8:00 PM", rating: 4.5, specialty: "Wheat, Paddy, Cotton" },
  { id: "m-varanasi", name: "Varanasi Mandi", nameHi: "वाराणसी मंडी", type: "market", city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, address: "Cantt Mandi, Varanasi", addressHi: "कैंट मंडी, वाराणसी", phone: "+91 542 2200110", timings: "6:00 AM - 7:00 PM", rating: 4.0, specialty: "Vegetables, Brinjal" },
  { id: "m-erode", name: "Erode Turmeric Market", nameHi: "इरोड हल्दी बाज़ार", type: "market", city: "Erode", state: "Tamil Nadu", lat: 11.341, lng: 77.7172, address: "Gobichettipalayam Road, Erode", addressHi: "गोबिचेट्टीपालयम रोड, इरोड", phone: "+91 424 2203000", timings: "6:00 AM - 6:00 PM", rating: 4.3, specialty: "Turmeric, Coconut" },
  { id: "m-jalgaon", name: "Jalgaon Banana Mandi", nameHi: "जलगाँव केला मंडी", type: "market", city: "Jalgaon", state: "Maharashtra", lat: 21.0077, lng: 75.5626, address: "Market Yard, Jalgaon", addressHi: "मार्केट यार्ड, जलगाँव", phone: "+91 257 2200111", timings: "6:00 AM - 8:00 PM", rating: 4.4, specialty: "Banana, Cotton" },
  { id: "m-patna", name: "Patna Sabji Mandi", nameHi: "पटना सब्ज़ी मंडी", type: "market", city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, address: "Karbigahiya Mandi, Patna", addressHi: "कर्बीगहिया मंडी, पटना", phone: "+91 612 2200440", timings: "5:00 AM - 8:00 PM", rating: 4.2, specialty: "Vegetables, Rice" },
  { id: "m-kochi", name: "Kochi Vegetable Market", nameHi: "कोच्चि सब्ज़ी मंडी", type: "market", city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, address: "Gandhi Nagar Market, Kochi", addressHi: "गांधीनगर मार्केट, कोच्चि", phone: "+91 484 2200330", timings: "5:00 AM - 7:00 PM", rating: 4.1, specialty: "Vegetables, Coconut" },
  { id: "m-hyderabad", name: "Bowenpally Market", nameHi: "बोवेनपल्ली मार्केट", type: "market", city: "Hyderabad", state: "Telangana", lat: 17.465, lng: 78.4657, address: "Bowenpally, Secunderabad", addressHi: "बोवेनपल्ली, सिकंदराबाद", phone: "+91 40 27829000", timings: "4:00 AM - 8:00 PM", rating: 4.3, specialty: "Fruits & Vegetables" },

  // ---- Agri-input shops (seeds, fertilizers, pesticides) ----
  { id: "s-jaipur-1", name: "Shri Ganga Seeds & Fertilizers", nameHi: "श्री गंगा बीज एवं उर्वरक", type: "shop", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, address: "Shop 12, Krishi Vihar, Jaipur", addressHi: "शॉप 12, कृषि विहार, जयपुर", phone: "+91 98290 11223", timings: "8:00 AM - 8:00 PM", rating: 4.6, specialty: "Seeds, NPK Fertilizers" },
  { id: "s-ludhiana-1", name: "Khanna Agro Centre", nameHi: "खन्ना एग्रो सेंटर", type: "shop", city: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573, address: "GT Road, Ludhiana", addressHi: "जीटी रोड, लुधियाना", phone: "+91 98141 56789", timings: "8:30 AM - 8:00 PM", rating: 4.7, specialty: "Pesticides, Herbicides" },
  { id: "s-nashik-1", name: "Godavari Agro Inputs", nameHi: "गोदावरी एग्रो इनपुट्स", type: "shop", city: "Nashik", state: "Maharashtra", lat: 20.006, lng: 73.7898, address: "Mumbai Agra Road, Nashik", addressHi: "मुंबई आगरा रोड, नाशिक", phone: "+91 98221 33445", timings: "8:00 AM - 8:30 PM", rating: 4.4, specialty: "Seeds, Bio-fertilizers" },
  { id: "s-indore-1", name: "Malwa Krishi Kendra", nameHi: "मालवा कृषि केंद्र", type: "shop", city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, address: "Bhawarkua, Indore", addressHi: "भवरकुआ, इंदौर", phone: "+91 98270 55667", timings: "8:00 AM - 8:00 PM", rating: 4.5, specialty: "DAP, Urea, Micronutrients" },
  { id: "s-pune-1", name: "Shivaji Agro Services", nameHi: "शिवाजी एग्रो सर्विसेज़", type: "shop", city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, address: "Koregaon Park, Pune", addressHi: "कोरेगांव पार्क, पुणे", phone: "+91 98220 77889", timings: "8:30 AM - 8:00 PM", rating: 4.6, specialty: "Irrigation Equipment" },
  { id: "s-delhi-1", name: "Delhi Agri Seeds Depot", nameHi: "दिल्ली एग्री बीज डिपो", type: "shop", city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025, address: "Khari Baoli, Delhi", addressHi: "खारी बावली, दिल्ली", phone: "+91 98110 22334", timings: "9:00 AM - 7:30 PM", rating: 4.3, specialty: "Vegetable Seeds" },
  { id: "s-varanasi-1", name: "Kashi Krishi Seva", nameHi: "काशी कृषि सेवा", type: "shop", city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, address: "Orderly Bazaar, Varanasi", addressHi: "ऑर्डरली बाज़ार, वाराणसी", phone: "+91 94150 33445", timings: "7:30 AM - 8:00 PM", rating: 4.2, specialty: "Fertilizers, Seeds" },
  { id: "s-coimbatore-1", name: "Kongu Agro Mart", nameHi: "कोंगु एग्रो मार्ट", type: "shop", city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, address: "Avinashi Road, Coimbatore", addressHi: "अविनाशी रोड, कोयंबटूर", phone: "+91 98430 44556", timings: "8:00 AM - 8:00 PM", rating: 4.5, specialty: "Pesticides, Growth Regulators" },
  { id: "s-guntur-1", name: "Krishna Agro Fertilizers", nameHi: "कृष्णा एग्रो उर्वरक", type: "shop", city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, address: "Lakshmipuram, Guntur", addressHi: "लक्ष्मीपुरम, गुंटूर", phone: "+91 98485 66778", timings: "8:00 AM - 8:00 PM", rating: 4.4, specialty: "Cotton & Chilli Inputs" },
  { id: "s-rajkot-1", name: "Saurashtra Agro Store", nameHi: "सौराष्ट्र एग्रो स्टोर", type: "shop", city: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022, address: "Yagnik Road, Rajkot", addressHi: "याज्ञिक रोड, राजकोट", phone: "+91 98250 88990", timings: "8:00 AM - 8:30 PM", rating: 4.3, specialty: "Groundnut Inputs" },
  { id: "s-patna-1", name: "Bihar Krishi Udyog", nameHi: "बिहार कृषि उद्योग", type: "shop", city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, address: "Fraser Road, Patna", addressHi: "फ्रेज़र रोड, पटना", phone: "+91 94310 22334", timings: "8:00 AM - 7:30 PM", rating: 4.1, specialty: "Seeds, Fertilizers" },
  { id: "s-kochi-1", name: "Malabar Agro Traders", nameHi: "मालाबार एग्रो ट्रेडर्स", type: "shop", city: "Kochi", state: "Kerala", lat: 9.9686, lng: 76.2847, address: "Marine Drive, Kochi", addressHi: "मरीन ड्राइव, कोच्चि", phone: "+91 98470 55667", timings: "8:30 AM - 7:00 PM", rating: 4.2, specialty: "Coconut & Spice Inputs" },
  { id: "s-hyderabad-1", name: "Telangana Agro Kendra", nameHi: "तेलंगाना एग्रो केंद्र", type: "shop", city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, address: "Madhapur, Hyderabad", addressHi: "माधापुर, हैदराबाद", phone: "+91 98490 77889", timings: "8:00 AM - 8:00 PM", rating: 4.5, specialty: "Drip Irrigation, Seeds" },
  { id: "s-bangalore-1", name: "GreenField Agro Inputs", nameHi: "ग्रीनफील्ड एग्रो इनपुट्स", type: "shop", city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946, address: "KR Market, Bangalore", addressHi: "केआर मार्केट, बेंगलुरु", phone: "+91 98450 33445", timings: "7:30 AM - 8:30 PM", rating: 4.6, specialty: "Vegetable Seeds, Fertilizers" },
  { id: "s-lucknow-1", name: "Awadh Krishi Bhandar", nameHi: "अवध कृषि भंडार", type: "shop", city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, address: "Hazratganj, Lucknow", addressHi: "हज़रतगंज, लखनऊ", phone: "+91 94150 88990", timings: "8:00 AM - 8:00 PM", rating: 4.3, specialty: "Rice & Wheat Inputs" },
  { id: "s-amritsar-1", name: "Satluj Agro Care", nameHi: "सतलुज एग्रो केयर", type: "shop", city: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723, address: "Majitha Road, Amritsar", addressHi: "मजीठा रोड, अमृतसर", phone: "+91 98144 22345", timings: "8:00 AM - 8:00 PM", rating: 4.4, specialty: "Paddy Inputs, Herbicides" },
  { id: "s-chennai-1", name: "Madras Agri Centre", nameHi: "मद्रास एग्री सेंटर", type: "shop", city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, address: "Koyambedu Market, Chennai", addressHi: "कोयम्बेदु मार्केट, चेन्नई", phone: "+91 98410 44556", timings: "7:30 AM - 8:00 PM", rating: 4.3, specialty: "Vegetable Seeds, Inputs" },
];

// Haversine distance in kilometers
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  const rateLimitResult = await checkRateLimit(clientIP, "nearby-services", RATE_LIMIT_CONFIG);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString()
        }
      }
    );
  }

  const parseResult = await parseAndValidate(req, nearbyServicesRequestSchema, corsHeaders);
  if (!parseResult.success) {
    return parseResult.response;
  }

  const { latitude, longitude, type = "all" } = parseResult.data;

  try {
    let pool = PLACES;
    if (type === "markets") pool = PLACES.filter(p => p.type === "market");
    if (type === "shops") pool = PLACES.filter(p => p.type === "shop");

    let results = pool;

    if (typeof latitude === "number" && typeof longitude === "number") {
      results = pool
        .map(p => ({
          ...p,
          distanceKm: haversineKm(latitude, longitude, p.lat, p.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      // No location: return a featured, region-balanced sample
      results = pool
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .map(p => ({ ...p, distanceKm: null }));
    }

    const places = results.slice(0, 8).map(p => ({
      id: p.id,
      name: p.name,
      nameHi: p.nameHi,
      type: p.type,
      city: p.city,
      state: p.state,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      addressHi: p.addressHi,
      phone: p.phone,
      timings: p.timings,
      rating: p.rating,
      specialty: p.specialty,
      distance: p.distanceKm === null ? null : formatDistance(p.distanceKm),
      distanceKm: p.distanceKm,
    }));

    const markets = places.filter(p => p.type === "market");
    const shops = places.filter(p => p.type === "shop");

    return new Response(
      JSON.stringify({
        places,
        markets,
        shops,
        hasLocation: typeof latitude === "number" && typeof longitude === "number",
        lastUpdated: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Nearby services function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch nearby places";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
