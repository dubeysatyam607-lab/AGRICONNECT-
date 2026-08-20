import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Newspaper, Radio, ExternalLink, ImageOff, RefreshCw, Search, BadgeCheck } from "lucide-react";
import { fetchLiveAgriNews, LiveAgriNewsArticle } from "@/lib/news-api";
import { trackAgriEvent } from "@/lib/google-analytics";

const CATEGORIES = ["All", "Policy & MSP", "Weather & Monsoon", "Schemes & Subsidy", "Market & Mandi", "Agritech & Innovation"];

const NewsCard = ({ news, onClick }: { news: LiveAgriNewsArticle; onClick: (n: LiveAgriNewsArticle) => void }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      onClick={() => onClick(news)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(news); } }}
      role="button"
      tabIndex={0}
      aria-label={`Read ${news.title}`}
      className="bg-card p-0 rounded-2xl border border-border shadow-card hover:shadow-soft transition-all cursor-pointer overflow-hidden flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary group"
    >
      <div className="w-full h-44 relative bg-muted shrink-0 overflow-hidden">
        {!imgError ? (
          <img 
            src={news.imageUrl} 
            alt={news.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            <ImageOff size={32} />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-primary text-primary-foreground shadow-xs text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {news.category}
          </span>
        </div>
      </div>
      
      <div className="p-4 pt-3 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-extrabold text-foreground text-base mb-1.5 leading-snug group-hover:text-primary transition-colors">
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

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveAgriNews();
      setArticles(data);
    } catch (e: any) {
      setError(e?.message || 'Could not load the latest news.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLiveAgriNews();
        if (!cancelled) {
          setArticles(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Could not load the latest news.');
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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

  return (
    <div className="pb-28 pt-4 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight">
            <Newspaper className="text-primary" size={26} /> Kisan Khabar
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
            <BadgeCheck size={13} className="text-emerald-600" /> Live Agriculture & MSP News Portal
          </p>
        </div>
        <button
          onClick={loadNews}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shadow-xs"
          aria-label="Refresh news"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wheat, MSP, monsoon, solar pump, mandi news..."
          className="w-full h-11 pl-9 pr-4 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium shadow-xs"
        />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "border-border text-muted-foreground bg-card hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="w-full h-40 bg-muted rounded-xl mb-3" />
              <div className="h-4 w-3/4 bg-muted rounded-full mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((news) => (
            <NewsCard key={news.id} news={news} onClick={handleNewsClick} />
          ))}

          {filteredArticles.length === 0 && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6">
              <Newspaper className="text-muted-foreground/40 mb-3" size={44} />
              <p className="text-base font-bold text-foreground">{t('agr0')}</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button
                onClick={loadNews}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {filteredArticles.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6">
              <Newspaper className="text-muted-foreground/40 mb-3" size={44} />
              <p className="text-base font-bold text-foreground">{t('agr1')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('agr2')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgriNews;