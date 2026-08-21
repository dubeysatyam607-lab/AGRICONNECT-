/**
 * Pexels Agricultural Image Integration Service
 * Serves high-resolution, verified farming & agricultural photos dynamically
 * from Pexels API and curated high-definition Pexels CDNs.
 */

const PEXELS_API_KEY = (import.meta.env.VITE_PEXELS_API_KEY as string | undefined)?.trim();

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
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
}

const PEXELS_CACHE_KEY = 'agri_pexels_cache_v2';

/**
 * Curated high-resolution Pexels CDN photographs for Indian crops and store products.
 * Guaranteed instant real photography from Pexels CDN with no rate limits.
 */
export const PEXELS_CURATED_PHOTOS: Record<string, string> = {
  // Cereals & Grains
  wheat: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
  rice: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800",
  paddy: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800",
  maize: "https://images.pexels.com/photos/547263/pexels-photo-547263.jpeg?auto=compress&cs=tinysrgb&w=800",
  corn: "https://images.pexels.com/photos/547263/pexels-photo-547263.jpeg?auto=compress&cs=tinysrgb&w=800",
  barley: "https://images.pexels.com/photos/1459505/pexels-photo-1459505.jpeg?auto=compress&cs=tinysrgb&w=800",
  bajra: "https://images.pexels.com/photos/1459505/pexels-photo-1459505.jpeg?auto=compress&cs=tinysrgb&w=800",
  jowar: "https://images.pexels.com/photos/1459505/pexels-photo-1459505.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Commercial & Cash Crops
  cotton: "https://images.pexels.com/photos/6044266/pexels-photo-6044266.jpeg?auto=compress&cs=tinysrgb&w=800",
  sugarcane: "https://images.pexels.com/photos/1684880/pexels-photo-1684880.jpeg?auto=compress&cs=tinysrgb&w=800",
  tea: "https://images.pexels.com/photos/1487834/pexels-photo-1487834.jpeg?auto=compress&cs=tinysrgb&w=800",
  coffee: "https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Oilseeds & Pulses
  soybean: "https://images.pexels.com/photos/3735169/pexels-photo-3735169.jpeg?auto=compress&cs=tinysrgb&w=800",
  mustard: "https://images.pexels.com/photos/461428/pexels-photo-461428.jpeg?auto=compress&cs=tinysrgb&w=800",
  groundnut: "https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=800",
  peanut: "https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=800",
  gram: "https://images.pexels.com/photos/3735169/pexels-photo-3735169.jpeg?auto=compress&cs=tinysrgb&w=800",
  chana: "https://images.pexels.com/photos/3735169/pexels-photo-3735169.jpeg?auto=compress&cs=tinysrgb&w=800",
  moong: "https://images.pexels.com/photos/3735169/pexels-photo-3735169.jpeg?auto=compress&cs=tinysrgb&w=800",
  arhar: "https://images.pexels.com/photos/3735169/pexels-photo-3735169.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Vegetables
  onion: "https://images.pexels.com/photos/144206/pexels-photo-144206.jpeg?auto=compress&cs=tinysrgb&w=800",
  potato: "https://images.pexels.com/photos/2286776/pexels-photo-2286776.jpeg?auto=compress&cs=tinysrgb&w=800",
  tomato: "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=800",
  chilli: "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800",
  chili: "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800",
  garlic: "https://images.pexels.com/photos/139259/pexels-photo-139259.jpeg?auto=compress&cs=tinysrgb&w=800",
  ginger: "https://images.pexels.com/photos/161556/ginger-plant-asia-rhizome-161556.jpeg?auto=compress&cs=tinysrgb&w=800",
  cauliflower: "https://images.pexels.com/photos/1359326/pexels-photo-1359326.jpeg?auto=compress&cs=tinysrgb&w=800",
  cabbage: "https://images.pexels.com/photos/1359326/pexels-photo-1359326.jpeg?auto=compress&cs=tinysrgb&w=800",
  brinjal: "https://images.pexels.com/photos/321551/pexels-photo-321551.jpeg?auto=compress&cs=tinysrgb&w=800",
  eggplant: "https://images.pexels.com/photos/321551/pexels-photo-321551.jpeg?auto=compress&cs=tinysrgb&w=800",
  ladyfinger: "https://images.pexels.com/photos/321551/pexels-photo-321551.jpeg?auto=compress&cs=tinysrgb&w=800",
  okra: "https://images.pexels.com/photos/321551/pexels-photo-321551.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Fruits
  apple: "https://images.pexels.com/photos/209439/pexels-photo-209439.jpeg?auto=compress&cs=tinysrgb&w=800",
  mango: "https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=800",
  banana: "https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg?auto=compress&cs=tinysrgb&w=800",
  orange: "https://images.pexels.com/photos/161559/orange-citrus-fruit-ripe-161559.jpeg?auto=compress&cs=tinysrgb&w=800",
  pomegranate: "https://images.pexels.com/photos/65256/pomegranate-open-cores-fruit-65256.jpeg?auto=compress&cs=tinysrgb&w=800",
  grapes: "https://images.pexels.com/photos/708777/pexels-photo-708777.jpeg?auto=compress&cs=tinysrgb&w=800",
  papaya: "https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg?auto=compress&cs=tinysrgb&w=800",
  guava: "https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Spices
  turmeric: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800",
  cumin: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800",
  coriander: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800",
  cardamom: "https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800",

  // Products & Agricultural inputs
  fertilizer: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
  urea: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
  dap: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
  npk: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
  potash: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
  seed: "https://images.pexels.com/photos/1459505/pexels-photo-1459505.jpeg?auto=compress&cs=tinysrgb&w=800",
  seeds: "https://images.pexels.com/photos/1459505/pexels-photo-1459505.jpeg?auto=compress&cs=tinysrgb&w=800",
  pesticide: "https://images.pexels.com/photos/2165688/pexels-photo-2165688.jpeg?auto=compress&cs=tinysrgb&w=800",
  sprayer: "https://images.pexels.com/photos/2165688/pexels-photo-2165688.jpeg?auto=compress&cs=tinysrgb&w=800",
  tractor: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&w=800",
  machinery: "https://images.pexels.com/photos/163752/tractor-agriculture-machine-field-163752.jpeg?auto=compress&cs=tinysrgb&w=800",
  irrigation: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800",
  drip: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800",
  tools: "https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=800",
};

/**
 * Normalizes user/API crop or product name into a clean search keyword
 */
export function normalizeNameForPexels(name: string): string {
  if (!name) return "indian agriculture farming";
  let clean = name.toLowerCase().trim();

  // Strip weights, pack sizes, parentheses
  clean = clean.replace(/\([^)]*\)/g, "");
  clean = clean.replace(/\d+\s*(kg|g|l|ml|hp|ton|acre|pack|gm|ltr|litre|liter)/gi, "");
  // eslint-disable-next-line no-misleading-character-class
  clean = clean.replace(/[^a-zA-Z\u0900-\u097F\s]/gu, " ").trim();

  // Hindi aliases
  const hindiToEnglish: Record<string, string> = {
    गेहूं: "wheat", गेहू: "wheat", धान: "rice", चावल: "rice", कपास: "cotton",
    सोयाबीन: "soybean", सरसों: "mustard", मक्का: "maize", प्याज: "onion",
    आलू: "potato", टमाटर: "tomato", लहसुन: "garlic", अदरक: "ginger",
    हल्दी: "turmeric", मिर्च: "chilli", मूंगफली: "groundnut", चना: "gram",
    गन्ना: "sugarcane", जीरा: "cumin", सेब: "apple", आम: "mango", केला: "banana",
    अनार: "pomegranate", यूरिया: "urea fertilizer", डीएपी: "dap fertilizer",
    खाद: "fertilizer", बीज: "seeds", ट्रैक्टर: "tractor",
  };

  for (const [hi, en] of Object.entries(hindiToEnglish)) {
    if (clean.includes(hi)) {
      return en;
    }
  }

  // Transliteration aliases
  const translit: Record<string, string> = {
    gehu: "wheat", gehun: "wheat", dhan: "rice", chawal: "rice", kapas: "cotton",
    soya: "soybean", sarson: "mustard", rai: "mustard", makka: "maize", makai: "maize",
    pyaj: "onion", pyaz: "onion", kanda: "onion", aloo: "potato", aalu: "potato",
    tamatar: "tomato", tamatr: "tomato", lahsun: "garlic", adrak: "ginger",
    haldi: "turmeric", mirch: "chilli", mirchi: "chilli", mungfali: "groundnut",
    chana: "gram", ganna: "sugarcane", jeera: "cumin", kela: "banana", aam: "mango",
  };

  for (const [tr, en] of Object.entries(translit)) {
    if (clean.includes(tr)) {
      return en;
    }
  }

  return clean.split(/\s+/).slice(0, 3).join(" ") || "indian agriculture";
}

function getPexelsCache(): Record<string, PexelsPhoto[]> {
  try {
    return JSON.parse(localStorage.getItem(PEXELS_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setPexelsCache(query: string, photos: PexelsPhoto[]) {
  try {
    const cache = getPexelsCache();
    cache[query] = photos;
    localStorage.setItem(PEXELS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage quota safeguard
  }
}

/**
 * Searches Pexels API for farming/crop/product photography
 */
export async function searchAgriImages(query: string = "indian agriculture farming", perPage: number = 10): Promise<PexelsPhoto[]> {
  const cleanQuery = query.trim();
  const cache = getPexelsCache();
  if (cache[cleanQuery] && cache[cleanQuery].length >= perPage) {
    return cache[cleanQuery].slice(0, perPage);
  }

  try {
    if (!PEXELS_API_KEY) {
      return getFallbackAgriPhotos();
    }
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanQuery)}&per_page=${perPage}&orientation=landscape`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Pexels API error: ${res.statusText}`);
    }

    const data = await res.json();
    const photos: PexelsPhoto[] = data.photos || [];
    if (photos.length > 0) {
      setPexelsCache(cleanQuery, photos);
      return photos;
    }
    return getFallbackAgriPhotos();
  } catch (err) {
    console.warn('[Pexels Service] Search request failed, using curated fallback:', err);
    return getFallbackAgriPhotos();
  }
}

/**
 * Dynamically finds a high-definition real Pexels image when given only a crop or product name.
 */
export async function fetchPexelsImageForName(
  name: string,
  type: "crop" | "product" | "tractor" | "general" = "crop"
): Promise<string | null> {
  if (!name || typeof name !== "string") return null;

  const normalized = normalizeNameForPexels(name);
  const stem = normalized.toLowerCase().split(/\s+/)[0];

  // 1. Check curated instant Pexels CDN image map first
  if (PEXELS_CURATED_PHOTOS[stem]) {
    return PEXELS_CURATED_PHOTOS[stem];
  }
  for (const [key, url] of Object.entries(PEXELS_CURATED_PHOTOS)) {
    if (normalized.includes(key) || stem.includes(key)) {
      return url;
    }
  }

  // 2. Search Pexels API with contextual agriculture query
  const searchQuery = type === "product"
    ? `${normalized} agriculture farming product`
    : type === "tractor"
    ? `${normalized} tractor farm machinery`
    : `${normalized} crop farm agriculture harvest`;

  try {
    const photos = await searchAgriImages(searchQuery, 1);
    const photo = photos[0];
    if (photo && photo.src) {
      return photo.src.large || photo.src.medium || photo.src.original || null;
    }
  } catch {
    // fallback
  }

  return PEXELS_CURATED_PHOTOS.wheat || null;
}

export async function getPexelsPhotoForCrop(cropName: string): Promise<string | null> {
  return fetchPexelsImageForName(cropName, "crop");
}

export async function getPexelsPhotoForProduct(productName: string, category?: string): Promise<string | null> {
  const query = category ? `${productName} ${category}` : productName;
  return fetchPexelsImageForName(query, "product");
}

export function getFallbackAgriPhotos(): PexelsPhoto[] {
  return [
    {
      id: 101,
      width: 1200,
      height: 800,
      url: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
      photographer: "AgriConnect Media",
      src: {
        original: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        large2x: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=800",
        large: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=600",
        medium: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=400",
        small: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=200",
        portrait: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        landscape: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        tiny: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg?auto=compress&cs=tinysrgb&w=100",
      },
      alt: "Green Wheat Field Agriculture"
    },
    {
      id: 102,
      width: 1200,
      height: 800,
      url: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
      photographer: "AgriConnect Media",
      src: {
        original: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
        large2x: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800",
        large: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=600",
        medium: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=400",
        small: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=200",
        portrait: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
        landscape: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg",
        tiny: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=100",
      },
      alt: "Indian Farmer Harvesting Crop"
    }
  ];
}
