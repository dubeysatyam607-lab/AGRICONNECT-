import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";

const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY");
const NEWSDATA_API_KEY = Deno.env.get("NEWSDATA_API_KEY") || "";
const FREE_NEWS_BASE = "https://saurav.tech/NewsAPI";
const NEWS_CACHE_MINUTES = 10;

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'GET, POST, OPTIONS');
}

export interface AgriNewsArticle {
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

// Strict whitelist: a story must match one of these to be shown. Anything else
// (sports, politics, entertainment, etc.) is dropped even if it also mentions
// "farmer" or "crop" as a passing keyword.
const AGRI_KEYWORDS = [
  'farmer', 'farmers', 'farming', 'agriculture', 'agricultural', 'agri-',
  'crop', 'crops', 'kisan', 'kisan credit', 'mandi', 'mandi bhav', 'msp',
  'monsoon', 'harvest', 'wheat', 'rice', 'paddy', 'cotton', 'sugarcane',
  'soybean', 'maize', 'millets', 'horticulture', 'pulses', 'oilseeds',
  'pesticide', 'fertilizer', 'dap', 'urea', 'npk', 'irrigation', 'pm-kisan',
  'pmfby', 'kcc', 'kisan credit card', 'soil health card', 'tractor',
  'poultry', 'dairy', 'livestock', 'animal husbandry', 'agritech', 'fpo',
];

const REJECT_KEYWORDS = [
  'cricket', 'football', 'election', 'loksabha', 'parliament', 'supreme court',
  'bollywood', 'hollywood', 'stock market', 'nifty', 'sensex', 'ipl',
];

function isAgricultureRelated(title: string, description: string): boolean {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  if (REJECT_KEYWORDS.some((kw) => combined.includes(kw))) return false;
  return AGRI_KEYWORDS.some((kw) => combined.includes(kw));
}

function getCategory(title: string, description: string): AgriNewsArticle['category'] {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('weather') || text.includes('rain') || text.includes('monsoon') || text.includes('temperature') || text.includes('imd')) {
    return 'Weather & Monsoon';
  }
  if (text.includes('scheme') || text.includes('subsidy') || text.includes('pm-kisan') || text.includes('kusum') || text.includes('grant')) {
    return 'Schemes & Subsidy';
  }
  if (text.includes('mandi') || text.includes('bhav') || text.includes('market') || text.includes('price') || text.includes('export') || text.includes('trade')) {
    return 'Market & Mandi';
  }
  if (text.includes('tech') || text.includes('drone') || text.includes('ai ') || text.includes('innovation') || text.includes('solar') || text.includes('startup')) {
    return 'Agritech & Innovation';
  }
  return 'Policy & MSP';
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) return 'Just now';
    if (diffHours < 24) return `${diffHours} hrs ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

function buildHtml(news: AgriNewsArticle): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${news.title}</title></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
        <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">🌾 AgriConnect News</h1>
          <p style="color:rgba(255,255,255,.9);margin:6px 0 0;font-size:13px;">${news.category}</p>
        </div>
        <div style="padding:24px;">
          ${news.imageUrl ? `<img src="${news.imageUrl}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin-bottom:16px;">` : ''}
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">${news.title}</h2>
          <p style="color:#4b5563;font-size:14px;line-height:1.6;">${news.description}</p>
          <a href="${news.url}" style="display:inline-block;margin-top:16px;background:#16a34a;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Read full story</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">${news.source} · ${news.formattedTime}</p>
        </div>
      </div>
    </body>
    </html>`;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Cheap per-IP rate limit (read-only feed).
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkRateLimit(`ip:${clientIp}`, 'agri-news', {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limited: too many news requests. Please wait a minute.' }),
        { status: 429, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    let rawArticles: any[] = [];

    if (NEWSDATA_API_KEY) {
      try {
        const newsDataUrl = `https://newsdata.io/api/1/latest?apikey=${NEWSDATA_API_KEY}&country=in&q=agriculture%20OR%20farming%20OR%20kisan%20OR%20mandi%20OR%20crop`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(newsDataUrl, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
          const j = await res.json();
          if (Array.isArray(j.results)) {
            rawArticles = j.results.map((r: any) => ({
              title: r.title,
              description: r.description || r.content || '',
              source: { name: r.source_name || r.source_id || 'News' },
              author: Array.isArray(r.creator) ? r.creator.join(', ') : (r.creator || 'Agri Reporter'),
              publishedAt: r.pubDate || new Date().toISOString(),
              url: r.link,
              urlToImage: r.image_url || '',
            }));
          }
        }
      } catch (err) {
        console.warn('[agri-news] NewsData.io fetch failed, trying fallbacks:', err);
      }
    }

    if (rawArticles.length === 0 && NEWS_API_KEY) {
      const query = encodeURIComponent('agriculture OR "farming" OR farmers OR "mandi bhav" OR "MSP" OR "crop insurance" OR "PM-KISAN"');
      const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=40&apiKey=${NEWS_API_KEY}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'AgriConnect/1.0' },
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          rawArticles = data.articles || [];
        }
      } catch (e) {
        console.warn('[agri-news] NewsAPI fetch failed:', e);
      } finally {
        clearTimeout(timer);
      }
    }

    if (!NEWS_API_KEY) {
      // Enrich the free feed by fetching a few more categories in parallel,
      // then merge + dedupe so the agriculture filter has more to work with.
      const extraCategories = ['science', 'business', 'technology'];
      const extraFeeds = await Promise.allSettled(
        extraCategories.map(async (cat) => {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 10000);
          try {
            const res = await fetch(`${FREE_NEWS_BASE}/top-headlines/category/${cat}/in.json`, {
              headers: { 'User-Agent': 'AgriConnect/1.0' },
              signal: c.signal,
            });
            if (!res.ok) return [] as any[];
            const j = await res.json();
            return (j.articles || []) as any[];
          } finally {
            clearTimeout(t);
          }
        }),
      );
      const seen = new Set<string>();
      for (const feed of extraFeeds) {
        if (feed.status !== 'fulfilled') continue;
        for (const a of feed.value) {
          if (!a?.title || seen.has(a.title)) continue;
          seen.add(a.title);
          rawArticles.push(a);
        }
      }
    }

    const articles: AgriNewsArticle[] = rawArticles
      .filter((a) => a.title && a.title !== '[Removed]' && isAgricultureRelated(a.title, a.description || ''))
      .map((a, idx) => ({
        id: `news-${idx}-${Date.now()}`,
        title: a.title,
        description: a.description || 'Latest agricultural updates from verified Indian news sources.',
        source: a.source?.name || 'Agri News',
        author: a.author || 'Agri Reporter',
        publishedAt: a.publishedAt,
        formattedTime: formatRelativeTime(a.publishedAt),
        category: getCategory(a.title, a.description || ''),
        url: a.url,
        imageUrl: a.urlToImage || '',
        isAgricultureVerified: false,
      }))
      .slice(0, 20);

    return new Response(JSON.stringify({ articles, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${NEWS_CACHE_MINUTES * 60}` },
    });
  } catch (error: any) {
    console.error('[agri-news] error:', error?.message || error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong while fetching the news feed.' }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
