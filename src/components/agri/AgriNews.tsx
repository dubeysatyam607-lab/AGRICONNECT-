import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Newspaper, Radio, ExternalLink, RefreshCw, Search, BadgeCheck, AlertCircle, Clock, FilterX } from "lucide-react";
import { fetchLiveAgriNews, LiveAgriNewsArticle, NEWS_REFRESH_INTERVAL_MS, getNewsLastUpdatedInfo } from "@/lib/news-api";
import { trackAgriEvent } from "@/lib/google-analytics";
import { SafeImage } from "@/components/ui/SafeImage";

const CATEGORIES = ["All", "Policy & MSP", "Weather & Monsoon", "Schemes & Subsidy", "Market & Mandi", "Agritech & Innovation"];

const NewsCard = ({ news, onClick }: { news: LiveAgriNewsArticle; onClick: (n: LiveAgriNewsArticle) => void }) => {
  return (
    <div
      onClick={() => onClick(news)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(news); } }}
      role="button"
      tabIndex={0}
      aria-label={`Read ${news.title}`}
      className="bg-card p-0 rounded-xl border border-border shadow-card hover:shadow-soft transition-all cursor-pointer overflow-hidden flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary group"
    >
      <div className="w-full h-44 relative bg-muted shrink-0 overflow-hidden">
        <SafeImage 
          src={news.imageUrl} 
          alt={news.title}
          category={news.category}
          entityName={news.title}
          resolveType="news"
          loading="lazy"
          className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {news.category}
          </span>
        </div>
      </div>
      
      <div className="p-4 pt-3 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-semibold text-foreground text-base mb-1.5 leading-snug group-hover:text-primary transition-colors">
            {news.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
            {news.description}
          </p>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Radio size={13} className="text-primary animate-pulse" /> {news.source}
          </div>
          <div className="flex items-center gap-1.5">
            <span>{news.formattedTime}</span>
            <ExternalLink size={12} className="text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};

const AgriNews: React.FC = () => {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<LiveAgriNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);

  const loadNews = useCallback(async (force = false) => {
    if (isRetrying) return;
    setLoading(true);
    setError(null);
    setIsRetrying(true);
    try {
      console.log(`[NEWS] Request started (forceRefresh=${force})`);
      const data = await fetchLiveAgriNews(force);
      console.log(`[NEWS] Response received. Parsed article count: ${data.length}`);
      setArticles(data);
      const info = getNewsLastUpdatedInfo();
      if (info.lastUpdatedMs > 0) {
        setLastRefreshedAt(new Date(info.lastUpdatedMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e: any) {
      console.warn('[NEWS] Fetch error:', e);
      setError(e?.message || 'Unable to load latest news.');
      setArticles([]);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [isRetrying]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLiveAgriNews(false);
        if (!cancelled) {
          setArticles(data);
          const info = getNewsLastUpdatedInfo();
          if (info.lastUpdatedMs > 0) {
            setLastRefreshedAt(new Date(info.lastUpdatedMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else {
            setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Unable to load latest news.');
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const timer = setInterval(() => {
      if (!cancelled) {
        void loadNews(true);
      }
    }, NEWS_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchesCategory = activeCategory === "All" || a.category === activeCategory;
      const matchesQuery = !query.trim() || 
        a.title.toLowerCase().includes(query.toLowerCase()) || 
        a.description.toLowerCase().includes(query.toLowerCase()) ||
        a.source.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [articles, activeCategory, query]);

  const handleNewsClick = (news: LiveAgriNewsArticle) => {
    trackAgriEvent('read_agri_news', { news_title: news.title, source: news.source });
    window.open(news.url, '_blank', 'noopener,noreferrer');
  };

  const handleResetFilters = () => {
    setQuery("");
    setActiveCategory("All");
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2 tracking-tight">
            <Newspaper className="text-primary" size={26} /> Kisan Khabar
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <BadgeCheck size={13} /> Live Agriculture News
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-500/20">
              <Clock size={11} className="animate-spin" /> Auto-updates every 5 hours
              {lastRefreshedAt && ` (${lastRefreshedAt})`}
            </span>
          </p>
        </div>
        <button
          onClick={() => loadNews(true)}
          disabled={loading || isRetrying}
          className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          aria-label="Refresh news"
        >
          <RefreshCw size={15} className={loading || isRetrying ? "animate-spin text-primary" : ""} />
          <span>Refresh Now</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wheat, MSP, monsoon, solar pump, mandi news..."
          className="w-full h-11 pl-9 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium "
        />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary "
                : "border-border text-muted-foreground bg-card hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles List or States */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-muted-foreground">
            <RefreshCw size={14} className="animate-spin text-primary" />
            <span>Loading latest agriculture news...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="w-full h-40 bg-muted rounded-xl mb-3" />
              <div className="h-4 w-3/4 bg-muted rounded-full mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border p-6 shadow-sm">
          <AlertCircle className="text-destructive mb-3" size={44} />
          <p className="text-base font-bold text-foreground">Unable to load latest news</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => loadNews(true)}
            disabled={isRetrying}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRetrying ? "animate-spin" : ""} /> Retry
          </button>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="space-y-4">
          {filteredArticles.map((news) => (
            <NewsCard key={news.id} news={news} onClick={handleNewsClick} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border p-6">
          <FilterX className="text-muted-foreground/40 mb-3" size={44} />
          <p className="text-base font-bold text-foreground">No agriculture news is available right now</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your category filter or search query.</p>
          {(query || activeCategory !== "All") && (
            <button
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AgriNews;