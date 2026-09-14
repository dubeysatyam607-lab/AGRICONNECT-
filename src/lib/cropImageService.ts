import { getCropImage } from "./crop-images";
import { searchAgriImages, type PexelsPhoto } from "./pexels-api";

/**
 * Centralized crop photo service for Mandi Bhav and crop marketplaces.
 *
 * Resolution priority:
 *  1. Semantically normalized + verified curated registry (CROP_IMAGE_MAP).
 *  2. Async live Pexels search (server-side edge function) with keyword-based
 *     relevance validation, TTL cache and in-flight de-duplication.
 *  3. Nothing — an honest "image unavailable" state. Generic category photos,
 *     icons, emojis and SVG illustrations are NEVER returned for a crop.
 */

const STORAGE_KEY = "agriconnect_crop_image_cache_v2";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  url?: string;
  fetchedAt: number;
}

export interface NormalizedCrop {
  canonical: string;
  display: string;
  searchName: string;
  keywords: string[];
}

interface CropAlias {
  match: RegExp;
  canonical: string;
  display: string;
  searchName: string;
  keywords: string[];
}

const CROP_ALIASES: CropAlias[] = [
  {
    match: /black\s*gram|blackgram|\b(urad|urd|urud)\b|उड़द|उरद/,
    canonical: "black gram",
    display: "Black Gram",
    searchName: "urad black gram beans",
    keywords: ["urad", "black gram", "urd bean"],
  },
  {
    match: /green\s*gram|greengram|\bmoong\b|mung\s*bean|mung\s*beans|मूंग/,
    canonical: "green gram",
    display: "Green Gram (Moong)",
    searchName: "green mung beans",
    keywords: ["mung", "moong", "green gram"],
  },
  {
    match: /pigeon\s*pea|\barhar\b|\btoor\b|\btur\b|अरहर|तुअर/,
    canonical: "pigeon pea",
    display: "Pigeon Pea (Arhar)",
    searchName: "toor dal pigeon pea",
    keywords: ["toor", "pigeon pea", "arhar", "tur dal"],
  },
  {
    match: /cumin|jeera|जीरा/,
    canonical: "cumin",
    display: "Cumin",
    searchName: "cumin seeds",
    keywords: ["cumin", "jeera", "seed"],
  },
  {
    match: /turmeric|haldi|हल्दी/,
    canonical: "turmeric",
    display: "Turmeric",
    searchName: "turmeric roots",
    keywords: ["turmeric", "haldi", "root"],
  },
  {
    match: /mustard|sarson|sarso|rai|सरसों|राई/,
    canonical: "mustard",
    display: "Mustard",
    searchName: "mustard seeds",
    keywords: ["mustard", "sarson", "seed"],
  },
  {
    match: /wheat|\bgehu(?:n)?\b|गेहूं|गेहू/,
    canonical: "wheat",
    display: "Wheat",
    searchName: "wheat grains",
    keywords: ["wheat", "grain", "gehu"],
  },
  {
    match: /paddy|dhan|चावल|धान/,
    canonical: "paddy",
    display: "Paddy",
    searchName: "paddy rice crop",
    keywords: ["paddy", "rice", "dhan"],
  },
  {
    match: /\brice\b|chawal|चावल/,
    canonical: "rice",
    display: "Rice",
    searchName: "uncooked white rice",
    keywords: ["rice", "chawal", "grain"],
  },
  {
    match: /maize|corn|makka|मक्का/,
    canonical: "maize",
    display: "Maize",
    searchName: "corn cobs",
    keywords: ["maize", "corn", "cob"],
  },
  {
    match: /\bjowar\b|sorghum|ज्वार/,
    canonical: "sorghum",
    display: "Jowar (Sorghum)",
    searchName: "sorghum stalks",
    keywords: ["sorghum", "jowar", "millet"],
  },
  {
    match: /bajra|\bmillet\b|बाजरा/,
    canonical: "bajra",
    display: "Bajra (Pearl Millet)",
    searchName: "pearl millet bajra",
    keywords: ["bajra", "millet", "grain"],
  },
  {
    match: /barley|\bjau\b|जौ/,
    canonical: "barley",
    display: "Barley",
    searchName: "barley grains",
    keywords: ["barley", "grain", "jau"],
  },
  {
    match: /soybean|soyabean|soya|सोयाबीन/,
    canonical: "soybean",
    display: "Soybean",
    searchName: "soybeans harvest",
    keywords: ["soybean", "soya", "bean"],
  },
  {
    match: /groundnut|peanut|mungfali|मूंगफली/,
    canonical: "groundnut",
    display: "Groundnut",
    searchName: "peanuts in shells",
    keywords: ["peanut", "groundnut", "mungfali", "shell"],
  },
  {
    match: /cotton|kapas|कपास/,
    canonical: "cotton",
    display: "Cotton",
    searchName: "cotton plant field",
    keywords: ["cotton", "kapas", "field"],
  },
  {
    match: /potato|\baloo\b|\balu\b|आलू/,
    canonical: "potato",
    display: "Potato",
    searchName: "fresh potatoes",
    keywords: ["potato", "aloo", "sprout"],
  },
  {
    match: /onion|pyaj|pyaaz|\bkanda\b|प्याज/,
    canonical: "onion",
    display: "Onion",
    searchName: "red onions in sacks",
    keywords: ["onion", "pyaz", "bulb"],
  },
  {
    match: /tomato|tamatar|टमाटर/,
    canonical: "tomato",
    display: "Tomato",
    searchName: "ripe red tomatoes",
    keywords: ["tomato", "tamatar"],
  },
  {
    match: /chilli|chili|mirch|mirchi|मिर्च/,
    canonical: "chilli",
    display: "Chilli",
    searchName: "fresh red chillies",
    keywords: ["chilli", "chili", "mirch", "red"],
  },
  {
    match: /garlic|lahsun|lasun|लहसुन/,
    canonical: "garlic",
    display: "Garlic",
    searchName: "garlic bulbs",
    keywords: ["garlic", "lahsun", "bulb", "clove"],
  },
];

export function normalizeCropName(cropName?: string): NormalizedCrop {
  const raw = (cropName || "").toLowerCase().replace(/[()]/g, " ").replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  for (const alias of CROP_ALIASES) {
    if (alias.match.test(raw)) {
      return {
        canonical: alias.canonical,
        display: alias.display,
        searchName: alias.searchName,
        keywords: alias.keywords,
      };
    }
  }
  const canonical = raw || "unknown crop";
  return {
    canonical,
    display: raw || "Unknown Crop",
    searchName: raw ? `${raw} agriculture` : "indian agriculture farming",
    keywords: raw ? raw.split(" ").filter((t) => t.length > 2) : ["agriculture"],
  };
}

export function cleanCropName(cropName?: string): string {
  return (cropName || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

export function getVerifiedCropImage(cropName?: string): string | undefined {
  if (!cropName) return undefined;
  const direct = getCropImage(cropName);
  if (direct) return direct;
  const cleaned = cleanCropName(cropName);
  if (cleaned && cleaned !== cropName) return getCropImage(cleaned);
  return undefined;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeCache(entries: Record<string, CacheEntry>): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // Cache is a best-effort optimization; ignore quota/private-mode failures.
  }
}

const inFlight = new Map<string, Promise<string | undefined>>();

/**
 * Resolves a crop photo live from the secure Pexels edge endpoint, with an
 * in-browser TTL cache and in-flight de-duplication. Returns undefined when no
 * relevant photo could be found so callers render a clean unavailable state.
 */
export async function searchVerifiedCropImage(cropName: string): Promise<string | undefined> {
  const curated = getVerifiedCropImage(cropName);
  if (curated) return curated;

  const normalized = normalizeCropName(cropName);
  const cacheKey = `${normalized.canonical}:${normalized.searchName}`;

  const cache = readCache();
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
    return hit.url;
  }

  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const promise = (async (): Promise<string | undefined> => {
    try {
      const photos = await searchAgriImages(normalized.searchName, 6, "crop");
      const best = selectRelevantPhoto(photos, normalized.keywords);
      const url = best ? best.src.large || best.src.medium || best.src.original : undefined;
      if (url) {
        const next = readCache();
        next[cacheKey] = { url, fetchedAt: Date.now() };
        writeCache(next);
        return url;
      }
      const next = readCache();
      next[cacheKey] = { fetchedAt: Date.now() };
      writeCache(next);
      return undefined;
    } catch {
      return undefined;
    }
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

interface PhotoCandidate {
  id?: number;
  url?: string;
  alt?: string | null;
  width?: number;
  height?: number;
  src?: Partial<Record<"original" | "large" | "medium" | "small" | "large2x" | "portrait" | "landscape" | "tiny", string>>;
}

function selectRelevantPhoto(photos: PexelsPhoto[], keywords: string[]): PexelsPhoto | undefined {
  return photos
    .map((photo) => {
      const alt = (photo.alt || "").toLowerCase();
      const keyHits = keywords.filter((key) => alt.includes(key)).length;
      const squareLike =
        photo.height > 0 && photo.width > 0 && Math.abs(photo.height - photo.width) / Math.max(photo.width, photo.height) < 0.35;
      const score =
        keyHits * 10 +
        (alt.length >= 8 && alt.length <= 120 ? 2 : 0) -
        (squareLike ? 1 : 0);
      return { photo, score };
    })
    .filter(({ score }) => score > 5)
    .sort((a, b) => b.score - a.score)[0]?.photo;
}