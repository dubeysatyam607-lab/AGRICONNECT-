/**
 * Centralized Pexels Agricultural Photography Engine for AgriConnect.
 * Dynamically delivers real, authentic agricultural photographs from Pexels API & CDNs.
 *
 * Security:
 * - Never exposes API keys in frontend/client-side bundles.
 * - Routes live searches through secure server-side API `/api/images/search`.
 * - Multi-tier fallback architecture: In-memory cache -> LocalStorage cache -> Curated Pexels Library -> Serverless API -> Category Fallbacks -> Offline SVG.
 */

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url?: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  relevanceScore?: number;
}

export interface CachedAgriImage {
  entityType: string;
  entityName: string;
  searchQuery: string;
  imageUrl: string;
  photographer: string;
  photographerUrl?: string;
  source: "pexels" | "curated_pexels" | "fallback";
  fetchedAt: number;
  expiry: number; // TTL (7 days)
  validationStatus: "verified" | "fallback";
}

// In-memory cache for ultra-fast 0ms rendering
const MEMORY_PEXELS_CACHE = new Map<string, PexelsPhoto[]>();
const MEMORY_ENTITY_IMAGE_CACHE = new Map<string, CachedAgriImage>();

const PEXELS_CACHE_KEY_V4 = "agri_image_cache_v4";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Standard agricultural keywords for relevance scoring.
 */
const AGRI_KEYWORDS = [
  "agriculture", "farming", "farm", "crop", "field", "harvest",
  "produce", "tractor", "soil", "plant", "seed", "fertilizer",
  "pesticide", "grain", "vegetable", "fruit", "irrigation", "cultivation", "rural", "farmer"
];

/**
 * Normalizes entity names (Hindi/English/Hinglish) into clean search terms.
 */
export function normalizeNameForPexels(name: string): string {
  if (!name) return "";
  let clean = name.trim().toLowerCase();

  // Common Hindi to English crop translation mappings for search
  const HINDI_MAP: Record<string, string> = {
    "गेहूं": "wheat", "गेहू": "wheat", "gehu": "wheat", "gehun": "wheat",
    "चावल": "rice", "धान": "rice paddy", "chawal": "rice", "dhan": "rice paddy",
    "मक्का": "corn maize", "makka": "corn maize", "makai": "corn maize",
    "सोयाबीन": "soybean", "soyabean": "soybean", "soya": "soybean",
    "कपास": "cotton", "kapas": "cotton",
    "सरसों": "mustard", "sarson": "mustard", "sarso": "mustard", "rai": "mustard",
    "मूंगफली": "groundnut peanut", "mungfali": "groundnut peanut",
    "गन्ना": "sugarcane", "ganna": "sugarcane",
    "प्याज": "onion", "pyaj": "onion", "pyaaz": "onion", "kanda": "onion",
    "आलू": "potato", "aloo": "potato", "aalu": "potato",
    "टमाटर": "tomato", "tamatar": "tomato",
    "मिर्च": "chilli pepper", "mirch": "chilli pepper", "mirchi": "chilli pepper",
    "लहसुन": "garlic", "lahsun": "garlic", "lasun": "garlic",
    "अदरक": "ginger", "adrak": "ginger",
    "चना": "chickpea gram", "chana": "chickpea gram",
    "हल्दी": "turmeric", "haldi": "turmeric",
    "जीरा": "cumin", "jeera": "cumin",
    "धनिया": "coriander", "dhaniya": "coriander",
    "इलायची": "cardamom", "elaichi": "cardamom",
    "काली मिर्च": "black pepper", "kali mirch": "black pepper",
    "लौंग": "clove", "laung": "clove",
    "केला": "banana", "kela": "banana",
    "आम": "mango", "aam": "mango",
    "सेब": "apple", "seb": "apple",
    "नींबू": "lemon", "nimbu": "lemon",
    "अनार": "pomegranate", "anaar": "pomegranate",
    "नारियल": "coconut", "nariyal": "coconut",
    "खाद": "fertilizer", "बीज": "seeds", "कीटनाशक": "pesticide",
    "ट्रैक्टर": "tractor", "हार्वेस्टर": "harvester", "रोटावेटर": "rotavator",
  };

  for (const [hi, en] of Object.entries(HINDI_MAP)) {
    if (clean.includes(hi)) {
      clean = clean.replace(hi, en);
    }
  }

  return clean.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Reads persistent cache from localStorage with TTL expiry check.
 */
function getStoredImageCache(): Record<string, CachedAgriImage> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PEXELS_CACHE_KEY_V4);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CachedAgriImage>;
    const now = Date.now();
    const valid: Record<string, CachedAgriImage> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.expiry > now && v.imageUrl) {
        valid[k] = v;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function setStoredImageCache(key: string, item: CachedAgriImage) {
  if (typeof window === "undefined") return;
  try {
    const cache = getStoredImageCache();
    cache[key] = item;
    localStorage.setItem(PEXELS_CACHE_KEY_V4, JSON.stringify(cache));
  } catch {
    // Quota safeguard
  }
}

/**
 * Curated, verified authentic Pexels photographs for zero-latency instant rendering.
 */
export const PEXELS_PHOTO_LIBRARY: Record<string, PexelsPhoto[]> = {
  farmer: [
    {
      id: 11688197,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/11688197/",
      photographer: "Tamhasip Khan",
      alt: "Indian farmers harvesting crops in field",
      src: {
        original: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg",
        large2x: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    },
    {
      id: 11070641,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/11070641/",
      photographer: "anjan ghosh",
      alt: "Indian farmers harvesting rice in a paddy field",
      src: {
        original: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg",
        large2x: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  wheat: [
    {
      id: 7891849,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/7891849/",
      photographer: "Ali Burhan",
      alt: "Golden wheat crop field ready for agricultural harvest",
      src: {
        original: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg",
        large2x: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  rice: [
    {
      id: 13888402,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/13888402/",
      photographer: "Soubhagya Maharana",
      alt: "Lush green rice paddy field in India",
      src: {
        original: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg",
        large2x: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  soybean: [
    {
      id: 9940116,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/9940116/",
      photographer: "Tom Fisk",
      alt: "Soybean crop field ready for harvesting",
      src: {
        original: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg",
        large2x: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  mustard: [
    {
      id: 1099680,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/1099680/",
      photographer: "Inzmam Khan",
      alt: "Yellow blooming mustard flowers in agricultural fields",
      src: {
        original: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg",
        large2x: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  tractor: [
    {
      id: 18135422,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/18135422/",
      photographer: "RAHUL MAHALIK",
      alt: "A blue tractor plowing a field in rural India",
      src: {
        original: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg",
        large2x: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    },
    {
      id: 163752,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/163752/",
      photographer: "Public Domain",
      alt: "Red agricultural tractor working on farm",
      src: {
        original: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg",
        large2x: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  harvester: [
    {
      id: 27054126,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/27054126/",
      photographer: "Egor Komarov",
      alt: "Combine harvester working on wheat field",
      src: {
        original: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg",
        large2x: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  fertilizer: [
    {
      id: 11337256,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/11337256/",
      photographer: "Greta Hoffman",
      alt: "Organic agriculture fertilizer and enriched soil",
      src: {
        original: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg",
        large2x: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  seeds: [
    {
      id: 30723398,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/30723398/",
      photographer: "Yunus Tuğ",
      alt: "Agricultural crop seeds and grains for sowing",
      src: {
        original: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg",
        large2x: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  mandi: [
    {
      id: 34921704,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/34921704/",
      photographer: "Ghulam Rasool",
      alt: "Seller at a colorful vegetable stall in an agricultural market mandi",
      src: {
        original: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg",
        large2x: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/34921704/pexels-photo-34921704.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    },
    {
      id: 2255801,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/2255801/",
      photographer: "Tom Fisk",
      alt: "Vibrant traditional Indian Mandi market with fresh produce and traders",
      src: {
        original: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg",
        large2x: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/2255801/pexels-photo-2255801.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  chilli: [
    {
      id: 1435735,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/1435735/",
      photographer: "Engin Akyurt",
      alt: "Fresh spicy red and green chilli peppers",
      src: {
        original: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg",
        large2x: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  potato: [
    {
      id: 144248,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/144248/",
      photographer: "Pixabay",
      alt: "Fresh harvest potatoes in rural mandi market",
      src: {
        original: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg",
        large2x: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  onion: [
    {
      id: 533342,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/533342/",
      photographer: "Pixabay",
      alt: "Fresh red onions for market sale",
      src: {
        original: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg",
        large2x: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  tomato: [
    {
      id: 1327838,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/1327838/",
      photographer: "Julia Sakelli",
      alt: "Ripe red tomatoes at vegetable market",
      src: {
        original: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg",
        large2x: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  garlic: [
    {
      id: 928251,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/928251/",
      photographer: "Pixabay",
      alt: "Garlic bulbs and cloves fresh produce",
      src: {
        original: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg",
        large2x: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  ginger: [
    {
      id: 1340116,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/1340116/",
      photographer: "Chokniti Khongchum",
      alt: "Fresh spicy ginger root",
      src: {
        original: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg",
        large2x: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  coconut: [
    {
      id: 2291599,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/2291599/",
      photographer: "Jane Doan",
      alt: "Fresh whole coconuts",
      src: {
        original: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg",
        large2x: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  lemon: [
    {
      id: 1414110,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/1414110/",
      photographer: "Dominika Roseclay",
      alt: "Fresh bright yellow lemons",
      src: {
        original: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg",
        large2x: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ],
  apple: [
    {
      id: 102104,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/photo/102104/",
      photographer: "Mali Maeder",
      alt: "Crisp fresh red apples",
      src: {
        original: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg",
        large2x: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200",
        large: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        medium: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&h=350",
        small: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&h=200",
        portrait: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
        landscape: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
        tiny: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&h=100",
      }
    }
  ]
};

export const PEXELS_CURATED_PHOTOS: Record<string, string> = {
  wheat: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  rice: "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  paddy: "https://images.pexels.com/photos/37012643/pexels-photo-37012643.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  soybean: "https://images.pexels.com/photos/9940116/pexels-photo-9940116.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  cotton: "https://images.pexels.com/photos/5640079/pexels-photo-5640079.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  mustard: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  corn: "https://images.pexels.com/photos/20234940/pexels-photo-20234940.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  maize: "https://images.pexels.com/photos/20234940/pexels-photo-20234940.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  onion: "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  potato: "https://images.pexels.com/photos/144248/pexels-photo-144248.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  tomato: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  chilli: "https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  garlic: "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  ginger: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  sugarcane: "https://images.pexels.com/photos/36976807/pexels-photo-36976807.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  groundnut: "https://images.pexels.com/photos/33501329/pexels-photo-33501329.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  chana: "https://images.pexels.com/photos/9287035/pexels-photo-9287035.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  moong: "https://images.pexels.com/photos/18358654/pexels-photo-18358654.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  urad: "https://images.pexels.com/photos/28674557/pexels-photo-28674557.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  arhar: "https://images.pexels.com/photos/28674557/pexels-photo-28674557.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  cumin: "https://images.pexels.com/photos/12865863/pexels-photo-12865863.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  turmeric: "https://images.pexels.com/photos/6220710/pexels-photo-6220710.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  coriander: "https://images.pexels.com/photos/10329642/pexels-photo-10329642.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  banana: "https://images.pexels.com/photos/20233144/pexels-photo-20233144.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  apple: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  mango: "https://images.pexels.com/photos/28939331/pexels-photo-28939331.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  coconut: "https://images.pexels.com/photos/2291599/pexels-photo-2291599.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  lemon: "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  pomegranate: "https://images.pexels.com/photos/18523341/pexels-photo-18523341.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  carrot: "https://images.pexels.com/photos/33383280/pexels-photo-33383280.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  cabbage: "https://images.pexels.com/photos/6157047/pexels-photo-6157047.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  cauliflower: "https://images.pexels.com/photos/7572005/pexels-photo-7572005.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  brinjal: "https://images.pexels.com/photos/6316542/pexels-photo-6316542.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  bhindi: "https://images.pexels.com/photos/33211276/pexels-photo-33211276.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  peas: "https://images.pexels.com/photos/17975576/pexels-photo-17975576.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  spinach: "https://images.pexels.com/photos/19957370/pexels-photo-19957370.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  radish: "https://images.pexels.com/photos/7129133/pexels-photo-7129133.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  cucumber: "https://images.pexels.com/photos/7543157/pexels-photo-7543157.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  pumpkin: "https://images.pexels.com/photos/10057791/pexels-photo-10057791.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  cardamom: "https://images.pexels.com/photos/8217944/pexels-photo-8217944.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  barley: "https://images.pexels.com/photos/32602419/pexels-photo-32602419.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  jowar: "https://images.pexels.com/photos/16977456/pexels-photo-16977456.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  bajra: "https://images.pexels.com/photos/16977456/pexels-photo-16977456.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  orange: "https://images.pexels.com/photos/13750562/pexels-photo-13750562.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  papaya: "https://images.pexels.com/photos/39374256/pexels-photo-39374256.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  guava: "https://images.pexels.com/photos/8668726/pexels-photo-8668726.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  watermelon: "https://images.pexels.com/photos/25482631/pexels-photo-25482631.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  grapes: "https://images.pexels.com/photos/7303409/pexels-photo-7303409.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  betel: "https://images.pexels.com/photos/17356851/pexels-photo-17356851.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  tractor: "https://images.pexels.com/photos/18135422/pexels-photo-18135422.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  harvester: "https://images.pexels.com/photos/27054126/pexels-photo-27054126.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  farmer: "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  fertilizer: "https://images.pexels.com/photos/11337256/pexels-photo-11337256.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  seeds: "https://images.pexels.com/photos/30723398/pexels-photo-30723398.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  rotavator: "https://images.pexels.com/photos/10206561/pexels-photo-10206561.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  sprayer: "https://images.pexels.com/photos/2889442/pexels-photo-2889442.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
  irrigation: "https://images.pexels.com/photos/11678428/pexels-photo-11678428.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
};

export function getStableIndex(key: string, max: number): number {
  if (max <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

/**
 * Searches Pexels via secure server-side endpoint `/api/images/search`.
 */
export async function searchAgriImages(
  query: string = "indian agriculture farming",
  perPage: number = 5,
  type: string = "crop"
): Promise<PexelsPhoto[]> {
  const cleanQuery = normalizeNameForPexels(query);
  const cacheKey = `${type}:${cleanQuery}`;

  // 1. Memory cache
  if (MEMORY_PEXELS_CACHE.has(cacheKey)) {
    const cached = MEMORY_PEXELS_CACHE.get(cacheKey)!;
    if (cached.length > 0) return cached.slice(0, perPage);
  }

  // 2. Fetch via secure serverless Edge Function or server API
  try {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://yrebxnpilkfeaofykvhq.supabase.co").replace(/\/$/, "");
    const edgeEndpoint = `${supabaseUrl}/functions/v1/pexels-search?query=${encodeURIComponent(cleanQuery)}&per_page=${perPage}`;
    const res = await fetch(edgeEndpoint, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      const photos: PexelsPhoto[] = data.photos || [];
      if (photos.length > 0) {
        MEMORY_PEXELS_CACHE.set(cacheKey, photos);
        return photos;
      }
    }
  } catch (err) {
    // Gracefully handle offline or test runner environment
  }

  // 3. Fallback to curated library
  const stem = cleanQuery.split(/\s+/)[0];
  if (PEXELS_PHOTO_LIBRARY[stem]) {
    return PEXELS_PHOTO_LIBRARY[stem];
  }
  for (const [key, photos] of Object.entries(PEXELS_PHOTO_LIBRARY)) {
    if (cleanQuery.includes(key)) {
      return photos;
    }
  }

  if (PEXELS_PHOTO_LIBRARY[type]) {
    return PEXELS_PHOTO_LIBRARY[type];
  }

  return PEXELS_PHOTO_LIBRARY.farmer;
}

/**
 * Request parameter options for centralized image resolver.
 */
export interface AgricultureImageOptions {
  type:
    | "crop"
    | "mandi_crop"
    | "product"
    | "fertilizer"
    | "seed"
    | "pesticide"
    | "machinery"
    | "tractor"
    | "harvester"
    | "cultivator"
    | "rotavator"
    | "seeder"
    | "sprayer"
    | "marketplace"
    | "farmer"
    | "cattle"
    | "cow"
    | "buffalo"
    | "general";
  name: string;
  category?: string;
  brand?: string;
  forceRefresh?: boolean;
}

/**
 * Main Agricultural Image Resolver with multi-tier caching and exact-category fallbacks.
 */
export async function getAgricultureImage(
  opts: AgricultureImageOptions
): Promise<CachedAgriImage> {
  const { type = "general", name = "", category, brand, forceRefresh = false } = opts;
  const rawKey = `${type}:${name.trim().toLowerCase()}`;
  const now = Date.now();

  // 1. Check in-memory cache
  if (!forceRefresh && MEMORY_ENTITY_IMAGE_CACHE.has(rawKey)) {
    const mem = MEMORY_ENTITY_IMAGE_CACHE.get(rawKey)!;
    if (mem.expiry > now) return mem;
  }

  // 2. Check localStorage cache
  if (!forceRefresh) {
    const stored = getStoredImageCache();
    if (stored[rawKey] && stored[rawKey].expiry > now) {
      MEMORY_ENTITY_IMAGE_CACHE.set(rawKey, stored[rawKey]);
      return stored[rawKey];
    }
  }

  // 3. Check curated dictionary for immediate zero-latency hits
  const normalized = normalizeNameForPexels(name);
  const stem = normalized.split(/\s+/)[0];
  if (!forceRefresh && PEXELS_CURATED_PHOTOS[stem]) {
    const result: CachedAgriImage = {
      entityType: type,
      entityName: name,
      searchQuery: normalized,
      imageUrl: PEXELS_CURATED_PHOTOS[stem],
      photographer: "Verified Pexels Contributor",
      source: "curated_pexels",
      fetchedAt: now,
      expiry: now + CACHE_TTL_MS,
      validationStatus: "verified",
    };
    MEMORY_ENTITY_IMAGE_CACHE.set(rawKey, result);
    setStoredImageCache(rawKey, result);
    return result;
  }

  // 4. Construct search query with exact entity specificity
  let searchQuery = normalized;
  if (type === "crop" || type === "mandi_crop") {
    searchQuery = `${searchQuery} fruit crop agriculture`;
  } else if (type === "tractor") {
    searchQuery = `${searchQuery} tractor farm agriculture`;
  } else if (type === "cattle" || type === "cow" || type === "buffalo") {
    searchQuery = `${searchQuery} farm cattle`;
  }
  if (brand) searchQuery = `${brand} ${searchQuery}`;
  if (category && !searchQuery.includes(category.toLowerCase())) {
    searchQuery = `${searchQuery} ${category}`;
  }

  // 5. Query candidate images from serverless Pexels proxy
  try {
    const candidates = await searchAgriImages(searchQuery, 5, type);
    if (candidates.length > 0) {
      const topPick = candidates[0];
      const result: CachedAgriImage = {
        entityType: type,
        entityName: name,
        searchQuery,
        imageUrl: topPick.src.large || topPick.src.medium || topPick.src.original,
        photographer: topPick.photographer,
        photographerUrl: topPick.photographer_url || topPick.url,
        source: "pexels",
        fetchedAt: now,
        expiry: now + CACHE_TTL_MS,
        validationStatus: "verified",
      };

      MEMORY_ENTITY_IMAGE_CACHE.set(rawKey, result);
      setStoredImageCache(rawKey, result);
      return result;
    }
  } catch {
    // handled by fallback below
  }

  // 6. Safe category-specific fallback (NEVER cross categories!)
  let fallbackUrl = "";
  if (type === "crop" || type === "mandi_crop") {
    const { getCropImage } = await import("./crop-images");
    fallbackUrl = getCropImage(name);
  } else if (type === "tractor" || type === "machinery" || type === "harvester" || type === "rotavator" || type === "cultivator" || type === "seeder") {
    const { getMachineImage } = await import("./machine-images");
    fallbackUrl = getMachineImage(name, type);
  } else if (type === "cattle" || type === "cow" || type === "buffalo") {
    const { getCattleImage } = await import("./cattle-images");
    fallbackUrl = getCattleImage(name);
  } else if (type === "product" || type === "fertilizer" || type === "seed" || type === "pesticide") {
    const { getStoreProductImage } = await import("./image-resolver");
    fallbackUrl = getStoreProductImage(name, category);
  } else {
    fallbackUrl = PEXELS_PHOTO_LIBRARY.farmer[0].src.large;
  }

  const fallbackResult: CachedAgriImage = {
    entityType: type,
    entityName: name,
    searchQuery,
    imageUrl: fallbackUrl,
    photographer: "AgriConnect Verified Photography",
    photographerUrl: "https://pexels.com",
    source: "fallback",
    fetchedAt: now,
    expiry: now + CACHE_TTL_MS,
    validationStatus: "fallback",
  };

  MEMORY_ENTITY_IMAGE_CACHE.set(rawKey, fallbackResult);
  return fallbackResult;
}

/**
 * Admin Panel functions for Image Management.
 */
export function getAllCachedAgriImages(): CachedAgriImage[] {
  const stored = getStoredImageCache();
  return Object.values(stored);
}

export function refreshAgriImage(entityType: string, entityName: string): Promise<CachedAgriImage> {
  return getAgricultureImage({
    type: entityType as any,
    name: entityName,
    forceRefresh: true,
  });
}

export function replaceAgriImage(
  entityType: string,
  entityName: string,
  newImageUrl: string,
  photographer = "Admin Overridden"
): CachedAgriImage {
  const rawKey = `${entityType}:${entityName.trim().toLowerCase()}`;
  const now = Date.now();
  const override: CachedAgriImage = {
    entityType,
    entityName,
    searchQuery: entityName,
    imageUrl: newImageUrl,
    photographer,
    source: "pexels",
    fetchedAt: now,
    expiry: now + CACHE_TTL_MS * 2, // 14 days
    validationStatus: "verified",
  };

  MEMORY_ENTITY_IMAGE_CACHE.set(rawKey, override);
  setStoredImageCache(rawKey, override);
  return override;
}

export function clearAgriImageCache(): void {
  MEMORY_ENTITY_IMAGE_CACHE.clear();
  MEMORY_PEXELS_CACHE.clear();
  if (typeof window !== "undefined") {
    localStorage.removeItem(PEXELS_CACHE_KEY_V4);
  }
}

export function getAgriImageCacheStats() {
  const stored = getStoredImageCache();
  const items = Object.values(stored);
  return {
    totalCached: items.length,
    verifiedCount: items.filter((i) => i.validationStatus === "verified").length,
    fallbackCount: items.filter((i) => i.validationStatus === "fallback").length,
    sources: {
      pexels: items.filter((i) => i.source === "pexels").length,
      curated: items.filter((i) => i.source === "curated_pexels").length,
      fallback: items.filter((i) => i.source === "fallback").length,
    },
  };
}

/** Legacy signature adapter for backward compatibility */
export async function fetchPexelsPhoto(
  nameOrCategory: string,
  type: string = "general",
  stableKey?: string
): Promise<{ url: string; alt: string; photographer: string } | null> {
  const img = await getAgricultureImage({
    type: type as any,
    name: nameOrCategory,
  });
  return {
    url: img.imageUrl,
    alt: `${img.entityName} agriculture photograph`,
    photographer: img.photographer,
  };
}

export async function fetchPexelsImageForName(
  name: string,
  type: string = "crop"
): Promise<string | null> {
  const res = await getAgricultureImage({ type: type as any, name });
  return res.imageUrl;
}

export async function getPexelsPhotoForCrop(cropName: string): Promise<string | null> {
  return fetchPexelsImageForName(cropName, "crop");
}

export async function getPexelsPhotoForProduct(productName: string, category?: string): Promise<string | null> {
  const res = await getAgricultureImage({ type: "product", name: productName, category });
  return res.imageUrl;
}

export function getFallbackAgriPhotos(): PexelsPhoto[] {
  return PEXELS_PHOTO_LIBRARY.farmer;
}
