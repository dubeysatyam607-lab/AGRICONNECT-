/**
 * Live Agriculture News Service
 * Fetches via the Supabase edge function `agri-news`, which calls the news API
 * server-side (keeps the API key secret and avoids browser CORS errors).
 * STRICT REQUIREMENT: Only verified agriculture, farming, MSP, weather impact,
 * and crop news is surfaced — filtered on the server AND again here on the client.
 */

import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

const CACHE_KEY = "agri_live_news_cache_v2";

export interface LiveAgriNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  author: string;
  publishedAt: string;
  formattedTime: string;
  category: 'Policy & MSP' | 'Weather & Monsoon' | 'Schemes & Subsidy' | 'Market & Mandi' | 'Agritech & Innovation';
  url: string;
  imageUrl: string;
  isAgricultureVerified: boolean;
}

// Second line of defense: anything that slips past the server filter but is
// clearly NOT farming-related is still dropped here.
const AGRI_KEYWORDS = [
  'farmer', 'farmers', 'farming', 'agriculture', 'agricultural', 'crop', 'crops',
  'kisan', 'mandi', 'mandi bhav', 'msp', 'monsoon', 'harvest', 'wheat', 'rice',
  'paddy', 'cotton', 'sugarcane', 'pesticide', 'fertilizer', 'dap', 'urea',
  'irrigation', 'pm-kisan', 'pmfby', 'tractor', 'poultry', 'dairy', 'agritech'
];

const REJECT_KEYWORDS = [
  'cricket', 'football', 'election', 'bollywood', 'hollywood', 'stock market',
  'nifty', 'sensex', 'ipl',
];

function isAgricultureRelated(title: string, description: string): boolean {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  if (REJECT_KEYWORDS.some((kw) => combined.includes(kw))) return false;
  return AGRI_KEYWORDS.some((kw) => combined.includes(kw));
}

export async function fetchLiveAgriNews(): Promise<LiveAgriNewsArticle[]> {
  // Check local cache first for instant load
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 1000 * 60 * 30 && parsed.articles?.length > 0) { // 30 min cache
        return parsed.articles;
      }
    }
  } catch {
    // continue to fetch
  }

  try {
    const { data, error } = await invokeEdgeWithTimeout<{ articles: LiveAgriNewsArticle[] }>(
      "agri-news",
      {},
    );
    if (error || !data?.articles) {
      throw new Error(error || "Could not load the news feed.");
    }

    const verifiedArticles = data.articles.filter(
      (a: LiveAgriNewsArticle) => isAgricultureRelated(a.title, a.description),
    );

    if (verifiedArticles.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), articles: verifiedArticles }));
    }

    return verifiedArticles;
  } catch (err) {
    // Surface the failure so the UI can show a friendly error + retry.
    console.warn('[AgriNews Service] Live API request failed:', err);
    throw err;
  }
}
