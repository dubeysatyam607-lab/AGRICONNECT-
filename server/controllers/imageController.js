const axios = require('axios');

const PEXELS_API_KEY =
  process.env.PEXELS_API_KEY ||
  'mXrkYO63IBrFxZssu12QmnQNPVoxBdzyacNLcYAedDKh2Wu9n29npl34';

const AGRI_KEYWORDS = [
  'agriculture', 'farming', 'farm', 'crop', 'field', 'harvest',
  'produce', 'tractor', 'soil', 'plant', 'seed', 'fertilizer',
  'pesticide', 'grain', 'vegetable', 'fruit', 'irrigation', 'cultivation'
];

function sanitizeQuery(q) {
  if (typeof q !== 'string') return 'agriculture farming';
  let clean = q.replace(/[^a-zA-Z0-9\s\u0900-\u097F-]/gu, ' ').trim();
  clean = clean.replace(/\s+/g, ' ');
  return clean.slice(0, 100) || 'agriculture farming';
}

function scoreRelevance(photo, entityName) {
  let score = 0;
  const textToScan = `${photo.alt || ''} ${photo.url || ''}`.toLowerCase();
  const entityTerms = entityName.toLowerCase().split(/\s+/).filter(Boolean);

  for (const term of entityTerms) {
    if (term.length >= 3 && textToScan.includes(term)) {
      score += 40;
    }
  }

  for (const kw of AGRI_KEYWORDS) {
    if (textToScan.includes(kw)) {
      score += 10;
    }
  }

  if (photo.width >= 1200 && photo.height >= 800) {
    score += 10;
  }

  return score;
}

exports.searchImages = async (req, res) => {
  try {
    const rawQuery = req.query.query || req.query.q || 'agriculture';
    const entityType = req.query.type || 'crop';
    const perPage = Math.min(Math.max(parseInt(req.query.perPage || req.query.limit || '5', 10), 1), 15);

    const cleanQuery = sanitizeQuery(rawQuery);
    const searchQuery = `${cleanQuery} agriculture farming`;

    if (!PEXELS_API_KEY) {
      return res.status(503).json({ error: 'Pexels API Key is missing on server' });
    }

    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
      params: {
        query: searchQuery,
        per_page: Math.max(perPage, 5),
        orientation: 'landscape',
      },
      timeout: 6000,
    });

    const rawPhotos = response.data?.photos || [];

    const scoredPhotos = rawPhotos.map((p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      url: p.url,
      photographer: p.photographer,
      photographer_url: p.photographer_url,
      src: p.src,
      alt: p.alt || `${cleanQuery} agricultural photograph`,
      relevanceScore: scoreRelevance(p, cleanQuery),
    }));

    scoredPhotos.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).json({
      query: cleanQuery,
      type: entityType,
      total: scoredPhotos.length,
      photos: scoredPhotos.slice(0, perPage),
      bestMatch: scoredPhotos[0] || null,
    });
  } catch (error) {
    console.error('Pexels Controller Error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch images from Pexels',
      details: error.message,
    });
  }
};
