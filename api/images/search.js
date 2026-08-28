/**
 * Vercel Serverless Function — Secure Pexels Image Search API for AgriConnect.
 *
 * GET /api/images/search?query=...&perPage=...&type=...
 *
 * Security:
 * - Keeps PEXELS_API_KEY secure on the server side.
 * - Sanitizes user query to prevent SSRF and injection.
 * - Exact-entity precision search (e.g., "coconut fruit", "garlic bulb", "Mahindra tractor").
 * - In-memory cache + HTTP CDN edge caching (24h).
 */

const PEXELS_API_KEY = (process.env.PEXELS_API_KEY || "").trim();

const memoryCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(key) {
  const item = memoryCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

function setCached(key, data) {
  memoryCache.set(key, { timestamp: Date.now(), data });
  if (memoryCache.size > 1000) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
}

function sanitizeQuery(q) {
  if (typeof q !== "string") return "agriculture";
  let clean = q.replace(/[^a-zA-Z0-9\s\u0900-\u097F-]/gu, " ").trim();
  clean = clean.replace(/\s+/g, " ");
  return clean.slice(0, 80) || "agriculture";
}

function buildSearchQuery(query, type) {
  const q = query.toLowerCase();

  if (type === "crop" || type === "fruit" || type === "vegetable" || type === "spice") {
    if (q.includes("coconut") || q.includes("nariyal")) return "coconut fruit";
    if (q.includes("lemon") || q.includes("nimbu")) return "lemon fruit";
    if (q.includes("garlic") || q.includes("lahsun")) return "garlic bulb";
    if (q.includes("ginger") || q.includes("adrak")) return "ginger root";
    if (q.includes("apple") || q.includes("seb")) return "red apple fruit";
    if (q.includes("tomato") || q.includes("tamatar")) return "ripe tomato";
    if (q.includes("potato") || q.includes("aloo")) return "fresh potato";
    if (q.includes("onion") || q.includes("pyaj")) return "red onion";
    if (q.includes("mustard") || q.includes("sarson")) return "mustard seeds agriculture";
    if (q.includes("soybean") || q.includes("soya")) return "soybean crop agriculture";
    if (q.includes("wheat") || q.includes("gehu")) return "wheat grain field";
    if (q.includes("rice") || q.includes("paddy") || q.includes("dhan")) return "paddy rice crop";
    if (q.includes("cotton") || q.includes("kapas")) return "cotton plant field";
    if (q.includes("sugarcane") || q.includes("ganna")) return "sugarcane crop field";
    return `${query} crop agriculture`;
  }

  if (type === "tractor" || type === "machinery" || type === "equipment") {
    if (q.includes("rotavator")) return "rotavator tractor implement agriculture";
    if (q.includes("harvester") || q.includes("combine")) return "combine harvester agriculture";
    if (q.includes("seeder") || q.includes("seed drill")) return "seed drill planter agriculture";
    if (q.includes("cultivator") || q.includes("plough")) return "tractor cultivator plough agriculture";
    if (q.includes("sprayer")) return "agricultural sprayer pump";
    return `${query} farm tractor agriculture`;
  }

  if (type === "cattle" || type === "cow" || type === "buffalo") {
    if (q.includes("buffalo") || q.includes("bhains") || q.includes("murrah")) return "water buffalo farm cattle";
    if (q.includes("cow") || q.includes("gai") || q.includes("gir") || q.includes("sahiwal")) return "dairy cow farm cattle";
    if (q.includes("goat") || q.includes("bakri")) return "goat farm livestock";
    return `${query} livestock cattle`;
  }

  return `${query} agriculture`;
}

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawQuery = req.query.query || req.query.q || "agriculture";
  const entityType = req.query.type || "crop";
  const perPage = Math.min(Math.max(parseInt(req.query.perPage || req.query.limit || "5", 10), 1), 15);

  const cleanQuery = sanitizeQuery(rawQuery);
  const cacheKey = `${cleanQuery.toLowerCase()}_${entityType}_${perPage}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  if (!PEXELS_API_KEY) {
    return res.status(503).json({ error: "Pexels API Key is not configured on server" });
  }

  const searchQuery = buildSearchQuery(cleanQuery, entityType);

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=${Math.max(perPage, 5)}&orientation=landscape`;
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch images from Pexels" });
    }

    const data = await response.json();
    const rawPhotos = data.photos || [];

    const photos = rawPhotos.map((p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      url: p.url,
      photographer: p.photographer,
      src: p.src,
      alt: p.alt || `${cleanQuery} agricultural photograph`,
    }));

    const result = {
      query: cleanQuery,
      searchQuery,
      type: entityType,
      total: photos.length,
      photos: photos.slice(0, perPage),
      bestMatch: photos[0] || null,
    };

    setCached(cacheKey, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[Pexels API Error]:", error);
    return res.status(500).json({ error: "Internal server error searching images" });
  }
}
