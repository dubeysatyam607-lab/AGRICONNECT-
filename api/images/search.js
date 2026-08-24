/**
 * Vercel Serverless Function — Secure Pexels Image Search API for AgriConnect.
 *
 * Handles GET /api/images/search?query=...&perPage=...&type=...
 *
 * Security:
 * - Keeps PEXELS_API_KEY secure on the server side.
 * - Sanitizes user query to prevent SSRF and injection.
 * - Scores candidates for agricultural relevance.
 * - Implements HTTP CDN caching headers.
 */

const PEXELS_API_KEY = (process.env.PEXELS_API_KEY || "").trim();

const AGRI_KEYWORDS = [
  "agriculture", "farming", "farm", "crop", "field", "harvest",
  "produce", "tractor", "soil", "plant", "seed", "fertilizer",
  "pesticide", "grain", "vegetable", "fruit", "irrigation", "cultivation"
];

function sanitizeQuery(q) {
  if (typeof q !== "string") return "agriculture farming";
  let clean = q.replace(/[^a-zA-Z0-9\s\u0900-\u097F-]/gu, " ").trim();
  clean = clean.replace(/\s+/g, " ");
  return clean.slice(0, 100) || "agriculture farming";
}

function scoreRelevance(photo, entityName, type) {
  let score = 0;
  const textToScan = `${photo.alt || ""} ${photo.url || ""}`.toLowerCase();
  const entityTerms = entityName.toLowerCase().split(/\s+/).filter(Boolean);

  // Exact entity term matches
  for (const term of entityTerms) {
    if (term.length >= 3 && textToScan.includes(term)) {
      score += 40;
    }
  }

  // Agriculture context matches
  for (const kw of AGRI_KEYWORDS) {
    if (textToScan.includes(kw)) {
      score += 10;
    }
  }

  // Dimension & orientation suitability (prefer landscape/high resolution)
  if (photo.width >= 1200 && photo.height >= 800) {
    score += 10;
  }

  return score;
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
  const searchQuery = `${cleanQuery} agriculture farming`;

  if (!PEXELS_API_KEY) {
    return res.status(503).json({ error: "Pexels API Key is not configured on server" });
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=${Math.max(perPage, 5)}&orientation=landscape`;
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`[Pexels API] HTTP ${response.status} for query: "${searchQuery}"`);
      return res.status(response.status).json({ error: "Failed to fetch images from Pexels" });
    }

    const data = await response.json();
    const rawPhotos = data.photos || [];

    // Score & sort candidates by agricultural relevance
    const scoredPhotos = rawPhotos.map((p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      url: p.url,
      photographer: p.photographer,
      photographer_url: p.photographer_url,
      src: p.src,
      alt: p.alt || `${cleanQuery} agricultural photograph`,
      relevanceScore: scoreRelevance(p, cleanQuery, entityType),
    }));

    scoredPhotos.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return res.status(200).json({
      query: cleanQuery,
      type: entityType,
      total: scoredPhotos.length,
      photos: scoredPhotos.slice(0, perPage),
      bestMatch: scoredPhotos[0] || null,
    });
  } catch (error) {
    console.error("[Pexels API Error]:", error);
    return res.status(500).json({ error: "Internal server error searching images" });
  }
}
