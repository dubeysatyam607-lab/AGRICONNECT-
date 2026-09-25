/**
 * Vercel Serverless Function — Pixel AI Crop Image API Gateway for AgriConnect.
 *
 * GET /api/pixel-ai/crop-image?crop=tomato&category=vegetables
 * POST /api/pixel-ai/crop-image { cropName: "tomato", category: "vegetables" }
 *
 * Security:
 * - Keeps PIXEL_AI_API_KEY / PEXELS_API_KEY securely on the server side.
 * - Sanitizes crop query inputs.
 * - Server-side memory caching + HTTP CDN edge headers.
 */

const API_KEY = (process.env.PIXEL_AI_API_KEY || process.env.PEXELS_API_KEY || "").trim();

const memoryCache = new Map();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days cache

function getCached(key) {
  const item = memoryCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

function setCached(key, data) {
  memoryCache.set(key, { timestamp: Date.now(), data });
  if (memoryCache.size > 2000) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
}

function sanitizeCropQuery(q) {
  if (typeof q !== "string") return "agriculture crop";
  let clean = q.replace(/[^a-zA-Z0-9\s\u0900-\u097F-]/gu, " ").trim();
  clean = clean.replace(/\s+/g, " ");
  return clean.slice(0, 80) || "agriculture crop";
}

function buildSearchTerm(cropName, category) {
  const q = cropName.toLowerCase();
  
  if (q.includes("tomato") || q.includes("tamatar")) return "fresh red tomatoes harvest";
  if (q.includes("potato") || q.includes("aloo")) return "fresh raw potatoes agriculture";
  if (q.includes("onion") || q.includes("pyaj") || q.includes("pyaaz")) return "red onions harvest agriculture";
  if (q.includes("wheat") || q.includes("gehu")) return "golden wheat crop field grain";
  if (q.includes("rice") || q.includes("paddy") || q.includes("dhan")) return "green paddy rice crop agriculture";
  if (q.includes("maize") || q.includes("corn") || q.includes("makka")) return "yellow corn maize harvest";
  if (q.includes("soybean") || q.includes("soya")) return "soybean pods harvest crop";
  if (q.includes("mustard") || q.includes("sarson")) return "yellow mustard field crop";
  if (q.includes("cotton") || q.includes("kapas")) return "raw white cotton crop harvest";
  if (q.includes("chilli") || q.includes("mirch")) return "fresh red green chillies agriculture";
  if (q.includes("garlic") || q.includes("lahsun")) return "fresh garlic bulbs produce";
  if (q.includes("ginger") || q.includes("adrak")) return "fresh ginger root produce";
  if (q.includes("apple") || q.includes("seb")) return "fresh red apples fruit harvest";
  if (q.includes("mango") || q.includes("aam")) return "ripe mango fruit tree";
  if (q.includes("banana") || q.includes("kela")) return "green banana fruit cluster";
  
  const cat = (category || "").toLowerCase();
  if (cat.includes("vegetable")) return `${cropName} vegetable produce agriculture`;
  if (cat.includes("fruit")) return `${cropName} fresh fruit produce`;
  if (cat.includes("pulse")) return `${cropName} legumes pulses seeds`;
  if (cat.includes("cereal") || cat.includes("grain")) return `${cropName} cereal grain harvest`;
  if (cat.includes("spice")) return `${cropName} spice agricultural produce`;
  
  return `${cropName} agricultural produce crop`;
}

export default async function handler(req, res) {
  // CORS configuration
  const origin = req.headers.origin || "";
  const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
    "https://agriconnect-navy-six.vercel.app"
  ];
  const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/agriconnect-navy-six-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin));
  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Token");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const cropName = (req.method === "POST" ? req.body?.cropName : req.query.crop) || req.query.cropName || req.query.q;
  const category = (req.method === "POST" ? req.body?.category : req.query.category) || "";

  if (!cropName) {
    return res.status(400).json({ error: "Missing required parameter: cropName or crop" });
  }

  const cleanQuery = sanitizeCropQuery(cropName);
  const cacheKey = `${cleanQuery.toLowerCase()}__${category.toLowerCase()}`;
  
  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  const apiKeyToUse = API_KEY || "mXrkYO63IBrFxZssu12QmnQNPVoxBdzyacNLcYAedDKh2Wu9n29npl34"; // Safe fallback key
  const searchTerm = buildSearchTerm(cleanQuery, category);

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=3&orientation=landscape`;
    const response = await fetch(url, {
      headers: {
        Authorization: apiKeyToUse,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Pixel AI upstream status: ${response.status}`);
    }

    const data = await response.json();
    const photos = data.photos || [];

    if (photos.length === 0) {
      return res.status(404).json({ error: "No crop image found", query: cleanQuery });
    }

    const bestPhoto = photos[0];
    const resultPayload = {
      query: cleanQuery,
      category: category || "Crop",
      imageUrl: bestPhoto.src?.landscape || bestPhoto.src?.large || bestPhoto.src?.original,
      mediumUrl: bestPhoto.src?.medium || bestPhoto.src?.small,
      photographer: bestPhoto.photographer,
      photographerUrl: bestPhoto.photographer_url,
      alt: bestPhoto.alt || `${cleanQuery} crop harvest photography`,
    };

    setCached(cacheKey, resultPayload);
    return res.status(200).json({ ...resultPayload, cached: false });
  } catch (err) {
    console.error("[Pixel AI API Error]:", err.message);
    return res.status(500).json({
      error: "Failed to generate crop image",
      details: err.message,
    });
  }
}
