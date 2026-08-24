import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Database,
  Layers,
} from 'lucide-react';
import {
  getAllCachedAgriImages,
  refreshAgriImage,
  replaceAgriImage,
  clearAgriImageCache,
  getAgriImageCacheStats,
  searchAgriImages,
  type CachedAgriImage,
  type PexelsPhoto,
} from '@/lib/pexels-api';
import { useToast } from '@/hooks/use-toast';

export const ImageManagementModule: React.FC = () => {
  const { toast } = useToast();
  const [cachedImages, setCachedImages] = useState<CachedAgriImage[]>([]);
  const [stats, setStats] = useState(getAgriImageCacheStats());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Live Pexels Test Search State
  const [testQuery, setTestQuery] = useState<string>('');
  const [testType, setTestType] = useState<string>('crop');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<PexelsPhoto[]>([]);

  // Replacement dialog state
  const [selectedItem, setSelectedItem] = useState<CachedAgriImage | null>(null);
  const [overrideUrl, setOverrideUrl] = useState<string>('');

  const loadCache = () => {
    setCachedImages(getAllCachedAgriImages());
    setStats(getAgriImageCacheStats());
  };

  useEffect(() => {
    loadCache();
  }, []);

  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSearching(true);
    try {
      const photos = await searchAgriImages(testQuery.trim(), 6, testType);
      setSearchResults(photos);
      if (photos.length === 0) {
        toast({
          title: 'No Live Photos Found',
          description: 'Pexels returned zero results for this query.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Search Error',
        description: 'Failed to query Pexels API proxy.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = async (item: CachedAgriImage) => {
    try {
      await refreshAgriImage(item.entityType, item.entityName);
      loadCache();
      toast({
        title: 'Image Refreshed',
        description: `Successfully fetched latest Pexels photo for ${item.entityName}.`,
      });
    } catch {
      toast({
        title: 'Refresh Failed',
        description: 'Could not refresh image from Pexels.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveOverride = () => {
    if (!selectedItem || !overrideUrl.trim()) return;
    replaceAgriImage(selectedItem.entityType, selectedItem.entityName, overrideUrl.trim(), 'Admin Override');
    loadCache();
    setSelectedItem(null);
    setOverrideUrl('');
    toast({
      title: 'Image Replaced',
      description: `New URL saved for ${selectedItem.entityName}.`,
    });
  };

  const handleClearCache = () => {
    clearAgriImageCache();
    loadCache();
    toast({
      title: 'Cache Cleared',
      description: 'Persistent image cache has been reset.',
    });
  };

  const filteredItems = cachedImages.filter((item) => {
    const matchesType = filterType === 'all' || item.entityType === filterType;
    const matchesSearch =
      !searchTerm ||
      item.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.searchQuery.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Sparkles size={14} /> Pexels Photography Engine
          </div>
          <h2 className="text-xl font-black text-white">Image System & Cache Control</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage real-time Pexels image resolution, validation scoring, and persistent CDN caches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCache}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw size={13} /> Refresh List
          </button>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold transition-all active:scale-95"
          >
            <Trash2 size={13} /> Clear Cache
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-white/10 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Cached</span>
          <div className="text-2xl font-black text-white mt-1 flex items-center gap-2">
            <Database size={20} className="text-emerald-400" />
            {stats.totalCached}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/10 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Verified Pexels</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-400" />
            {stats.verifiedCount}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/10 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Curated Hits</span>
          <div className="text-2xl font-black text-teal-400 mt-1 flex items-center gap-2">
            <Layers size={20} className="text-teal-400" />
            {stats.sources.curated}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/10 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fallback Count</span>
          <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-400" />
            {stats.fallbackCount}
          </div>
        </div>
      </div>

      {/* Live Pexels Search & Candidate Tester */}
      <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-extrabold text-white">
          <Search size={15} className="text-emerald-400" /> Test Live Pexels Search Query & Relevance Scoring
        </div>

        <form onSubmit={handleLiveSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3">
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="crop">Crop / Mandi Commodity</option>
              <option value="product">Store Product / Input</option>
              <option value="tractor">Tractor / Machinery</option>
              <option value="seeds">Seed Variety</option>
              <option value="fertilizer">Fertilizer / Nutrient</option>
            </select>
          </div>

          <div className="sm:col-span-7">
            <input
              type="text"
              placeholder="e.g. Soyabean crop, Mahindra 575 DI tractor, Urea fertilizer, Drip irrigation..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full h-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSearching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </div>
        </form>

        {/* Live Search Results Grid */}
        {searchResults.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pexels Candidate Results ({searchResults.length} Candidates Evaluated)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {searchResults.map((photo, i) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-950/60 flex flex-col">
                  <div className="h-28 w-full overflow-hidden">
                    <img
                      src={photo.src.medium || photo.src.large}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2 text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-bold text-emerald-400">Rank #{i + 1}</span>
                      {photo.relevanceScore !== undefined && (
                        <span className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold">
                          Score: {photo.relevanceScore}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 truncate" title={photo.photographer}>
                      By: {photo.photographer}
                    </p>
                    <a
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[9px]"
                    >
                      View on Pexels <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cached Items Filter & Table */}
      <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Filter:</span>
            {['all', 'crop', 'product', 'tractor', 'seeds', 'fertilizer'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-colors ${
                  filterType === t
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search cached images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Cached Images Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.entityType}-${item.entityName}-${idx}`}
              className="bg-slate-950/70 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-emerald-500/40 transition-colors"
            >
              <div className="h-36 w-full relative overflow-hidden bg-slate-900">
                <img
                  src={item.imageUrl}
                  alt={item.entityName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase">
                  {item.entityType}
                </span>
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  item.validationStatus === 'verified' ? 'bg-emerald-500/90 text-slate-950' : 'bg-amber-500/90 text-slate-950'
                }`}>
                  {item.validationStatus}
                </span>
              </div>

              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-white capitalize">{item.entityName}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">Query: {item.searchQuery}</p>
                  <p className="text-[10px] text-slate-400 truncate">Source: {item.source} · {item.photographer}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleRefresh(item)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setOverrideUrl(item.imageUrl);
                    }}
                    className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Replace URL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10 text-slate-400 text-xs">
            No cached images match your filter. Dynamic images are fetched and cached automatically as users browse.
          </div>
        )}
      </div>

      {/* Override URL Dialog */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-base text-white">Override Image URL</h3>
            <p className="text-xs text-slate-400">
              Provide a custom verified Pexels photo URL for <strong className="text-white">{selectedItem.entityName}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">Image URL</label>
              <input
                type="text"
                value={overrideUrl}
                onChange={(e) => setOverrideUrl(e.target.value)}
                className="w-full bg-slate-950 border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
