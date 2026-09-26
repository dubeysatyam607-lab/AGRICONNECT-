/**
 * Live Agriculture News Service
 * Real, current, India-relevant agriculture news pipeline.
 *
 * Tier 1: Live Google News RSS (India Agriculture) via rss2json
 * Tier 2: Knowivate Latest News API (Economic Times)
 * Tier 3: Supabase Edge Function `agri-news`
 * Tier 4: Local Storage Cache
 */

import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

const CACHE_KEY = "agri_live_news_cache_v4";
export const NEWS_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 5; // 5 hours

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

// Verified Category Fallback Images (Indian Agriculture & Farming High-Res Visuals)
const CATEGORY_FALLBACK_IMAGES: Record<LiveAgriNewsArticle['category'], string> = {
  'Market & Mandi': 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&q=80&w=800',
  'Weather & Monsoon': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&q=80&w=800',
  'Schemes & Subsidy': 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800',
  'Agritech & Innovation': 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800',
  'Policy & MSP': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800',
};

const AGRI_KEYWORDS = [
  'farmer', 'farmers', 'farming', 'agriculture', 'agricultural', 'crop', 'crops',
  'kisan', 'mandi', 'mandi bhav', 'msp', 'monsoon', 'harvest', 'wheat', 'rice',
  'paddy', 'cotton', 'sugarcane', 'pesticide', 'fertilizer', 'dap', 'urea',
  'irrigation', 'pm-kisan', 'pmfby', 'tractor', 'poultry', 'dairy', 'agritech',
  'horticulture', 'seed', 'seeds', 'soybean', 'mustard', 'maize', 'onion',
  'potato', 'tomato', 'icar', 'pib', 'ministry', 'yield', 'produce', 'rural',
  'agri', 'krishi', 'bhav', 'price', 'market', 'rain', 'weather', 'drought',
  'growth', 'subsidies', 'subsidy', 'scheme', 'yojana', 'nabard', 'apmc'
];

const REJECT_KEYWORDS = [
  'cricket', 'football', 'election', 'bollywood', 'hollywood', 'stock market',
  'nifty', 'sensex', 'ipl', 'movie review', 'box office'
];

export function isAgricultureRelated(title: string, description: string): boolean {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  if (REJECT_KEYWORDS.some((kw) => combined.includes(kw))) return false;
  return AGRI_KEYWORDS.some((kw) => combined.includes(kw));
}

export function getCategoryFromText(title: string, description: string): LiveAgriNewsArticle['category'] {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  if (combined.includes('msp') || combined.includes('policy') || combined.includes('cabinet') || combined.includes('procurement') || combined.includes('law') || combined.includes('act')) {
    return 'Policy & MSP';
  }
  if (combined.includes('weather') || combined.includes('rain') || combined.includes('monsoon') || combined.includes('temperature') || combined.includes('cloud') || combined.includes('flood') || combined.includes('drought')) {
    return 'Weather & Monsoon';
  }
  if (combined.includes('scheme') || combined.includes('subsidy') || combined.includes('pm-kisan') || combined.includes('yojana') || combined.includes('grant') || combined.includes('loan') || combined.includes('kcc') || combined.includes('nabard')) {
    return 'Schemes & Subsidy';
  }
  if (combined.includes('mandi') || combined.includes('bhav') || combined.includes('market') || combined.includes('price') || combined.includes('rate') || combined.includes('trade') || combined.includes('export') || combined.includes('import') || combined.includes('crore') || combined.includes('lakh')) {
    return 'Market & Mandi';
  }
  if (combined.includes('tech') || combined.includes('ai') || combined.includes('drone') || combined.includes('solar') || combined.includes('startup') || combined.includes('robot') || combined.includes('automation') || combined.includes('innovation')) {
    return 'Agritech & Innovation';
  }
  return 'Policy & MSP';
}

export function formatRelativeTime(isoString: string): string {
  try {
    const timeMs = new Date(isoString).getTime();
    if (isNaN(timeMs)) return 'Recently';
    const diffMs = Date.now() - timeMs;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

/**
 * Normalizes raw news item from any source into clean LiveAgriNewsArticle
 */
export function normalizeNewsArticle(raw: Record<string, unknown>, index: number): LiveAgriNewsArticle | null {
  const title = String(raw.title || "").replace(/<[^>]*>?/gm, "").trim();
  if (!title) return null;

  let description = String(raw.description || raw.summary || raw.content || "").replace(/<[^>]*>?/gm, "").trim();
  if (!description || description.length < 10) {
    description = `Latest Indian agricultural update: ${title}`;
  }

  const url = String(raw.url || raw.link || raw.canonical_url || "#").trim();
  let source = "AgriNews India";
  if (typeof raw.source === "string" && raw.source) {
    source = raw.source;
  } else if (typeof raw.source === "object" && raw.source && "name" in raw.source) {
    source = String((raw.source as { name?: string }).name || "AgriNews");
  } else if (raw.author) {
    source = String(raw.author);
  }

  const publishedAt = String(raw.publishedAt || raw.pubDate || raw.created_at || new Date().toISOString());
  const category = getCategoryFromText(title, description);

  // Extract or fallback image URL
  let imageUrl = String(raw.imageUrl || raw.image || raw.urlToImage || raw.thumbnail || "").trim();
  if (!imageUrl || imageUrl.includes('placeholder') || !imageUrl.startsWith('http')) {
    imageUrl = CATEGORY_FALLBACK_IMAGES[category];
  }

  const id = String(raw.id || raw.guid || `news-item-${index}-${Date.now()}`);

  return {
    id,
    title,
    description,
    source,
    author: source,
    publishedAt,
    formattedTime: formatRelativeTime(publishedAt),
    category,
    url,
    imageUrl,
    isAgricultureVerified: true,
  };
}

/**
 * Tier 1: Fetch Google News RSS Feed (India Agriculture) via rss2json
 */
async function fetchGoogleNewsRss(): Promise<LiveAgriNewsArticle[]> {
  try {
    const rssUrl = encodeURIComponent("https://news.google.com/rss/search?q=agriculture+india+OR+farmer+OR+mandi+OR+msp+OR+kisan&hl=en-IN&gl=IN&ceid=IN:en");
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
    
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return [];

    const data = await response.json();
    if (!data || data.status !== 'ok' || !Array.isArray(data.items)) return [];

    const articles: LiveAgriNewsArticle[] = [];
    data.items.forEach((item: Record<string, unknown>, idx: number) => {
      const normalized = normalizeNewsArticle(item, idx);
      if (normalized && isAgricultureRelated(normalized.title, normalized.description)) {
        articles.push(normalized);
      }
    });

    return articles;
  } catch (err) {
    console.warn('[News API] Google News RSS fetch failed:', err);
    return [];
  }
}

/**
 * Tier 2: Direct fetcher for Knowivate Live News API
 */
export async function fetchKnowivateNewsDirectly(): Promise<LiveAgriNewsArticle[]> {
  try {
    const response = await fetch("https://news.knowivate.com/api/latest", {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    const rawList = Array.isArray(data) ? data : (data.news || data.articles || data.results || data.items || []) as Record<string, unknown>[];

    const articles: LiveAgriNewsArticle[] = [];
    rawList.forEach((item, idx) => {
      const normalized = normalizeNewsArticle(item, idx);
      if (normalized && isAgricultureRelated(normalized.title, normalized.description)) {
        articles.push(normalized);
      }
    });

    return articles;
  } catch (err) {
    console.warn('[News API] Knowivate direct fetch failed:', err);
    return [];
  }
}

export function getNewsLastUpdatedInfo(): { lastUpdatedMs: number; isStaleFiveHours: boolean } {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof parsed.timestamp === 'number') {
        const age = Date.now() - parsed.timestamp;
        return {
          lastUpdatedMs: parsed.timestamp,
          isStaleFiveHours: age >= NEWS_REFRESH_INTERVAL_MS,
        };
      }
    }
  } catch {
    // ignore parse error
  }
  return { lastUpdatedMs: 0, isStaleFiveHours: true };
}

/**
 * Main Live Agriculture News fetcher pipeline
 */
export async function fetchLiveAgriNews(forceRefresh = false): Promise<LiveAgriNewsArticle[]> {
  // Check local cache first unless forced
  let cachedArticles: LiveAgriNewsArticle[] | null = null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.articles?.length > 0) {
        cachedArticles = parsed.articles;
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        if (!forceRefresh && cacheAge < NEWS_REFRESH_INTERVAL_MS) {
          return parsed.articles;
        }
      }
    }
  } catch {
    // continue
  }

  // Tier 1: Try Google News India Agriculture RSS Feed
  let articles = await fetchGoogleNewsRss();

  // Tier 2: Try Knowivate News API if Tier 1 returned no articles
  if (articles.length === 0) {
    articles = await fetchKnowivateNewsDirectly();
  }

  // Tier 3: Try Supabase Edge Function if Tier 1 & 2 returned no articles
  if (articles.length === 0) {
    try {
      const { data, error } = await invokeEdgeWithTimeout<{ articles: LiveAgriNewsArticle[] }>(
        "agri-news",
        {},
      );
      if (!error && data?.articles?.length) {
        articles = data.articles;
      }
    } catch (err) {
      console.warn('[AgriNews Service] Edge function fetch skipped:', err);
    }
  }

  // Save successful fetch to local storage cache
  if (articles.length > 0) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), articles }));
    return articles;
  }

  // Tier 4: Fallback to cached articles if available
  if (cachedArticles && cachedArticles.length > 0) {
    return cachedArticles;
  }

  throw new Error("Unable to fetch latest agriculture news. Please check your network connection and try again.");
}
