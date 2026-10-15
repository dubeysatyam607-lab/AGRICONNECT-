import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Newspaper,
  Radio,
  ExternalLink,
  RefreshCw,
  Search,
  BadgeCheck,
  AlertCircle,
  Clock,
  FilterX,
  ChevronDown,
  Globe2,
} from "lucide-react";
import {
  fetchLiveAgriNews,
  NEWS_REFRESH_INTERVAL_MS,
  getNewsLastUpdatedInfo,
} from "@/lib/news-api";
import type { LiveAgriNewsArticle } from "@/lib/news-api";
import {
  localizeArticle,
  CATEGORY_LOCALIZED,
} from "@/lib/news-translator";
import type { LocalizedAgriArticle } from "@/lib/news-translator";
import { trackAgriEvent } from "@/lib/google-analytics";
import { SafeImage } from "@/components/ui/SafeImage";

const CATEGORIES = [
  "All",
  "Policy & MSP",
  "Weather & Monsoon",
  "Schemes & Subsidy",
  "Market & Mandi",
  "Agritech & Innovation",
];

const NewsCard = ({
  news,
  currentLanguage,
  onClick,
}: {
  news: LocalizedAgriArticle;
  currentLanguage: string;
  onClick: (n: LocalizedAgriArticle) => void;
}) => {
  const publishedDate = useMemo(() => {
    try {
      const d = new Date(news.publishedAt);
      if (isNaN(d.getTime())) return news.formattedTime;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return news.formattedTime;
    }
  }, [news.publishedAt, news.formattedTime]);

  return (
    <div
      onClick={() => onClick(news)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(news);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Read ${news.displayTitle}`}
      className="bg-card p-0 rounded-2xl border border-border shadow-card hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary group"
    >
      <div className="w-full h-44 relative bg-muted shrink-0 overflow-hidden">
        <SafeImage
          src={news.imageUrl}
          alt={news.displayTitle}
          category={news.category}
          entityName={news.displayTitle}
          resolveType="news"
          loading="lazy"
          className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {news.displayCategory || news.category}
          </span>
          {news.isOriginalLanguage && currentLanguage !== "en" && (
            <span className="bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <Globe2 size={10} /> Original English
            </span>
          )}
        </div>
      </div>

      <div className="p-4 pt-3 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-semibold text-foreground text-base mb-1.5 leading-snug group-hover:text-primary transition-colors">
            {news.displayTitle || news.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
            {news.displayDescription || news.description}
          </p>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2.5 border-t border-border/60 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Radio size={13} className="text-primary animate-pulse" /> {news.source}
          </div>
          <div className="flex items-center gap-2">
            <span>{publishedDate}</span>
            <span>·</span>
            <span className="text-primary font-medium flex items-center gap-1">
              Read Original <ExternalLink size={11} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AgriNews: React.FC = () => {
  const { language } = useLanguage();
  const [rawArticles, setRawArticles] = useState<LiveAgriNewsArticle[]>([]);
  const [localizedArticles, setLocalizedArticles] = useState<LocalizedAgriArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  const loadNews = useCallback(
    async (force = false) => {
      if (isRetrying) return;
      setLoading(true);
      setError(null);
      setIsRetrying(true);
      try {
        const data = await fetchLiveAgriNews(force);
        setRawArticles(data);
        const info = getNewsLastUpdatedInfo();
        if (info.lastUpdatedMs > 0) {
          setLastRefreshedAt(
            new Date(info.lastUpdatedMs).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        } else {
          setLastRefreshedAt(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
      } catch (e: any) {
        console.warn("[NEWS] Fetch error:", e);
        setError(e?.message || "Unable to load latest agricultural news.");
        setRawArticles([]);
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    },
    [isRetrying]
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLiveAgriNews(false);
        if (!cancelled) {
          setRawArticles(data);
          const info = getNewsLastUpdatedInfo();
          if (info.lastUpdatedMs > 0) {
            setLastRefreshedAt(
              new Date(info.lastUpdatedMs).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
          } else {
            setLastRefreshedAt(
              new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Unable to load latest agricultural news.");
          setRawArticles([]);
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
  }, [loadNews]);

  // Multilingual translation effect when articles or language change
  useEffect(() => {
    let active = true;
    if (rawArticles.length === 0) {
      setLocalizedArticles([]);
      return;
    }

    if (language === "en") {
      setLocalizedArticles(
        rawArticles.map((a) => ({
          ...a,
          displayTitle: a.title,
          displayDescription: a.description,
          displayCategory: a.category,
          isOriginalLanguage: true,
        }))
      );
      return;
    }

    setIsTranslating(true);
    // Translate articles in parallel using the cached pipeline
    Promise.all(rawArticles.map((article) => localizeArticle(article, language)))
      .then((translated) => {
        if (active) {
          setLocalizedArticles(translated);
        }
      })
      .catch(() => {
        if (active) {
          setLocalizedArticles(
            rawArticles.map((a) => ({
              ...a,
              displayTitle: a.title,
              displayDescription: a.description,
              displayCategory: a.category,
              isOriginalLanguage: true,
            }))
          );
        }
      })
      .finally(() => {
        if (active) setIsTranslating(false);
      });

    return () => {
      active = false;
    };
  }, [rawArticles, language]);

  const filteredArticles = useMemo(() => {
    return localizedArticles.filter((a) => {
      const matchesCategory = activeCategory === "All" || a.category === activeCategory;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        a.displayTitle.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.displayDescription.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [localizedArticles, activeCategory, query]);

  const displayedArticles = useMemo(() => {
    return filteredArticles.slice(0, visibleCount);
  }, [filteredArticles, visibleCount]);

  const handleNewsClick = (news: LocalizedAgriArticle) => {
    trackAgriEvent("read_agri_news", {
      news_title: news.title,
      source: news.source,
      language,
    });
    window.open(news.url, "_blank", "noopener,noreferrer");
  };

  const handleResetFilters = () => {
    setQuery("");
    setActiveCategory("All");
    setVisibleCount(6);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Newspaper className="text-primary" size={26} /> Kisan Khabar · AgriNews
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <BadgeCheck size={14} /> Verified Indian Agriculture Intelligence
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-500/20">
              <Clock size={11} /> Auto-synced
              {lastRefreshedAt && ` (${lastRefreshedAt})`}
            </span>
            {isTranslating && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-medium animate-pulse">
                <Globe2 size={11} /> Translating to your language...
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadNews(true)}
          disabled={loading || isRetrying}
          className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 shadow-sm"
          aria-label="Refresh news"
        >
          <RefreshCw size={14} className={loading || isRetrying ? "animate-spin text-primary" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(6);
          }}
          placeholder="Search MSP announcements, weather advisories, mandi rates, subsidies, farming tech..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium shadow-card"
        />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const localizedLabel =
            cat === "All"
              ? language === "hi"
                ? "सभी समाचार"
                : "All News"
              : CATEGORY_LOCALIZED[cat]?.[language] || cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setVisibleCount(6);
              }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border text-muted-foreground bg-card hover:border-primary/40"
              }`}
            >
              {localizedLabel}
            </button>
          );
        })}
      </div>

      {/* Articles List or States */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-6 text-xs font-medium text-muted-foreground">
            <RefreshCw size={15} className="animate-spin text-primary" />
            <span>Loading verified Indian agricultural news...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="w-full h-40 bg-muted rounded-xl mb-3" />
              <div className="h-4 w-3/4 bg-muted rounded-full mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6 shadow-sm">
          <AlertCircle className="text-destructive mb-3" size={44} />
          <p className="text-base font-bold text-foreground">Unable to load latest agricultural news</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => loadNews(true)}
            disabled={isRetrying}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRetrying ? "animate-spin" : ""} /> Retry Fetch
          </button>
        </div>
      ) : displayedArticles.length > 0 ? (
        <div className="space-y-4">
          {displayedArticles.map((news) => (
            <NewsCard
              key={news.id}
              news={news}
              currentLanguage={language}
              onClick={handleNewsClick}
            />
          ))}

          {/* Load More Pagination */}
          {filteredArticles.length > visibleCount && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted hover:border-primary/40 transition-all shadow-sm active:scale-95"
              >
                <ChevronDown size={15} /> Load More News ({filteredArticles.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6">
          <FilterX className="text-muted-foreground/40 mb-3" size={44} />
          <p className="text-base font-bold text-foreground">No agricultural news found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search keywords or switching category filters.
          </p>
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