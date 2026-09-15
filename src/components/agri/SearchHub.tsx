import React, { useState, useRef, useEffect } from "react";
import {
  Search, X, Newspaper, Landmark, Shield, Banknote, TrendingUp,
  ExternalLink, Info, BadgeCheck, Landmark as SchemeIcon
} from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import {
  searchAgri,
  AgriSearchResults,
  formatVerifiedLabel,
  formatSourceLabel,
  formatRupees,
  formatPercent,
  AgriScheme,
  AgriNews,
  AgriMsp,
  AgriInsurance,
  AgriLoan
} from "@/lib/agri-info";

const QUICK_CHIPS = ["PM-KISAN", "MSP", "Loan", "Insurance", "Fasal Bima", "Wheat", "Drip"];

interface SearchHubProps {
  onToast: (message: string) => void;
  onNavigate: (tab: string) => void;
}

function openOfficial(url: string | null | undefined): string | undefined {
  return url && url.trim() ? url.trim() : undefined;
}

const SchemeRow = ({ row, onToast }: { row: AgriScheme; onToast: (m: string) => void }) => {
  const url = openOfficial(row.application_url) || openOfficial(row.official_url) || openOfficial(row.source_url);
  return (
    <AgriCard className="p-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <SchemeIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-foreground leading-snug">{row.name}</p>
          {row.short_name && <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase">{row.short_name}</span>}
        </div>
        {row.benefit_amount && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{row.benefit_amount}</p>}
        {row.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
            <BadgeCheck size={11} className="text-emerald-600" /> {formatVerifiedLabel(row.last_verified_at)}
          </span>
          {row.source_name && (
            <span className="text-[10px] font-semibold text-muted-foreground">{formatSourceLabel(row.source_name)}</span>
          )}
        </div>
        {url && (
          <button
            onClick={() => { onToast("Opening official portal..."); window.open(url, "_blank", "noopener,noreferrer"); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
          >
            <ExternalLink size={12} /> Official Portal
          </button>
        )}
      </div>
    </AgriCard>
  );
};

const NewsRow = ({ row, onToast }: { row: AgriNews; onToast: (m: string) => void }) => {
  const url = openOfficial(row.canonical_url) || openOfficial(row.source_url);
  return (
    <AgriCard className="p-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Newspaper size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug">{row.title}</p>
        {row.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.summary}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
            <RadioBadge /> {row.source_name || "Government Press"}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground">{formatVerifiedLabel(row.last_verified_at)}</span>
        </div>
        {url && (
          <button
            onClick={() => { onToast("Opening article..."); window.open(url, "_blank", "noopener,noreferrer"); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
          >
            <ExternalLink size={12} /> Read Full Release
          </button>
        )}
      </div>
    </AgriCard>
  );
};

const MspRow = ({ row }: { row: AgriMsp }) => (
  <AgriCard className="p-3.5 flex items-start gap-3">
    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <TrendingUp size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-bold text-foreground">{row.crop}</p>
        {row.grade && <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase">{row.grade}</span>}
      </div>
      <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{formatRupees(row.msp)}{row.unit ? ` /${row.unit}` : ""}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {row.season && <span className="text-[10px] font-semibold text-muted-foreground">{row.season}</span>}
        {row.marketing_year && <span className="text-[10px] font-semibold text-muted-foreground">MY {row.marketing_year}</span>}
      </div>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-[10px] font-semibold text-muted-foreground">{formatVerifiedLabel(row.last_verified_at)}</span>
        {row.source_name && <span className="text-[10px] font-semibold text-muted-foreground">{formatSourceLabel(row.source_name)}</span>}
      </div>
    </div>
  </AgriCard>
);

const InsuranceRow = ({ row, onToast }: { row: AgriInsurance; onToast: (m: string) => void }) => {
  const url = openOfficial(row.guidelines_url) || openOfficial(row.official_url) || openOfficial(row.source_url);
  return (
    <AgriCard className="p-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Shield size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug">{row.scheme_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {row.premium_cap_percent !== null && row.premium_cap_percent !== undefined && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Premium cap {formatPercent(row.premium_cap_percent)}</span>
          )}
          {row.farmer_premium_rate !== null && row.farmer_premium_rate !== undefined && (
            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Farmer rate {formatPercent(row.farmer_premium_rate)}</span>
          )}
        </div>
        {row.season && row.crop && <p className="text-xs text-muted-foreground mt-1.5">{row.season}{row.crop ? ` · ${row.crop}` : ""}</p>}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground">{formatVerifiedLabel(row.last_verified_at)}</span>
          {row.source_name && <span className="text-[10px] font-semibold text-muted-foreground">{formatSourceLabel(row.source_name)}</span>}
        </div>
        {url && (
          <button
            onClick={() => { onToast("Opening official guidelines..."); window.open(url, "_blank", "noopener,noreferrer"); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
          >
            <ExternalLink size={12} /> Official Guidelines
          </button>
        )}
      </div>
    </AgriCard>
  );
};

const LoanRow = ({ row, onToast }: { row: AgriLoan; onToast: (m: string) => void }) => {
  const url = openOfficial(row.official_url) || openOfficial(row.source_url);
  return (
    <AgriCard className="p-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Banknote size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug">{row.scheme_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {row.effective_rate !== null && row.effective_rate !== undefined && (
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Effective {formatPercent(row.effective_rate)}</span>
          )}
          {row.interest_rate !== null && row.interest_rate !== undefined && (
            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Base {formatPercent(row.interest_rate)}</span>
          )}
          {row.loan_type && <span className="text-[10px] font-semibold text-muted-foreground">{row.loan_type}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground">{formatVerifiedLabel(row.last_verified_at)}</span>
          {row.source_name && <span className="text-[10px] font-semibold text-muted-foreground">{formatSourceLabel(row.source_name)}</span>}
        </div>
        {url && (
          <button
            onClick={() => { onToast("Opening official source..."); window.open(url, "_blank", "noopener,noreferrer"); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
          >
            <ExternalLink size={12} /> Official Source
          </button>
        )}
      </div>
    </AgriCard>
  );
};

function RadioBadge() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

const SearchHub: React.FC<SearchHubProps> = ({ onToast, onNavigate }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgriSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const runSearch = async (term: string) => {
    if (!term.trim() || term.trim().length < 2) {
      setResults(null);
      setSearched(false);
      setError(null);
      return;
    }
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const data = await searchAgri(term);
      setResults(data);
      if (data && data.total === 0) setError("No matching verified information found.");
    } catch {
      setResults(null);
      setError("Verified information currently unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const term = value.trim();
    if (term.length >= 2) {
      timer.current = setTimeout(() => runSearch(term), 350);
    } else {
      setResults(null);
      setSearched(false);
      setError(null);
    }
  };

  const total = results?.total || 0;

  return (
    <div className="pb-28 pt-4 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight">
            <Search className="text-primary" size={26} /> Global Agri Search
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium mt-0.5">
            <BadgeCheck size={13} className="text-emerald-600" /> Verified schemes, news, MSP, insurance & loans data
          </p>
        </div>
        <button
          onClick={() => onNavigate("home")}
          className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          Close
        </button>
      </div>

      {/* Search input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") runSearch(query); }}
          placeholder="Search PM-KISAN, MSP, wheat, fasal bima, KCC loan..."
          className="w-full h-11 pl-9 pr-9 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium shadow-xs"
        />
        {query && (
          <button onClick={() => onQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick chips */}
      {!searched && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => { setQuery(chip); runSearch(chip); }}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border border-border text-muted-foreground bg-card hover:border-primary/40 hover:text-primary transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="h-4 w-2/3 bg-muted rounded-full mb-2" />
              <div className="h-3 w-full bg-muted rounded-full mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && searched && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6">
          <Info className="text-muted-foreground/40 mb-3" size={40} />
          <p className="text-base font-bold text-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {total === 0 ? "Try a different crop, scheme name, or keyword." : "Live data may not have synced yet."}
          </p>
        </div>
      )}

      {!loading && results && total > 0 && (
        <div className="space-y-6">
          <p className="text-xs font-semibold text-muted-foreground">{total} verified result{total === 1 ? "" : "s"} for "{query}"</p>

          {results.schemes.length > 0 && (
            <section>
              <SectionTitle icon={<Landmark size={14} className="text-primary" />} label="Government Schemes" count={results.schemes.length} />
              <div className="space-y-2.5">
                {results.schemes.map(s => <SchemeRow key={s.id} row={s} onToast={onToast} />)}
              </div>
            </section>
          )}

          {results.news.length > 0 && (
            <section>
              <SectionTitle icon={<Newspaper size={14} className="text-primary" />} label="Agri News" count={results.news.length} />
              <div className="space-y-2.5">
                {results.news.map(n => <NewsRow key={n.id} row={n} onToast={onToast} />)}
              </div>
            </section>
          )}

          {results.msp.length > 0 && (
            <section>
              <SectionTitle icon={<TrendingUp size={14} className="text-primary" />} label="MSP Prices" count={results.msp.length} />
              <div className="space-y-2.5">
                {results.msp.map(m => <MspRow key={m.id} row={m} />)}
              </div>
            </section>
          )}

          {results.insurance.length > 0 && (
            <section>
              <SectionTitle icon={<Shield size={14} className="text-primary" />} label="Crop Insurance" count={results.insurance.length} />
              <div className="space-y-2.5">
                {results.insurance.map(i => <InsuranceRow key={i.id} row={i} onToast={onToast} />)}
              </div>
            </section>
          )}

          {results.loans.length > 0 && (
            <section>
              <SectionTitle icon={<Banknote size={14} className="text-primary" />} label="Farm Loans" count={results.loans.length} />
              <div className="space-y-2.5">
                {results.loans.map(l => <LoanRow key={l.id} row={l} onToast={onToast} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) => (
  <div className="flex items-center gap-1.5 mb-2.5">
    {icon}
    <h3 className="text-xs font-extrabold uppercase tracking-wide text-foreground">{label}</h3>
    <span className="text-[10px] font-semibold text-muted-foreground">· {count}</span>
  </div>
);

export default SearchHub;