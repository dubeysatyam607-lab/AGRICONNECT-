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
  Camera,
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
import { SafeImage } from '@/components/ui/SafeImage';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border border-border ">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Camera size={14} /> Pexels Photography Engine
          </div>
          <h2 className="text-xl font-semibold text-foreground">Image System & Cache Control</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage real-time Pexels image resolution, validation scoring, and persistent CDN caches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCache}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw size={13} /> Refresh List
          </button>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 text-xs font-bold transition-all active:scale-95"
          >
            <Trash2 size={13} /> Clear Cache
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Cached</span>
          <div className="text-2xl font-semibold text-foreground mt-1 flex items-center gap-2">
            <Database size={20} className="text-primary" />
            {stats.totalCached}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Verified Pexels</span>
          <div className="text-2xl font-semibold text-primary mt-1 flex items-center gap-2">
            <CheckCircle size={20} className="text-primary" />
            {stats.verifiedCount}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Curated Hits</span>
          <div className="text-2xl font-semibold text-teal-600 mt-1 flex items-center gap-2">
            <Layers size={20} className="text-teal-600" />
            {stats.sources.curated}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Fallback Count</span>
          <div className="text-2xl font-semibold text-amber-600 mt-1 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-600" />
            {stats.fallbackCount}
          </div>
        </div>
      </div>

      {/* Live Pexels Search & Candidate Tester */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Search size={15} className="text-primary" /> Test Live Pexels Search Query & Relevance Scoring
        </div>

        <form onSubmit={handleLiveSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3">
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground font-medium focus:outline-none focus:border-primary"
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
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground font-medium focus:outline-none focus:border-primary"
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
          <div className="pt-2 border-t border-border space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Pexels Candidate Results ({searchResults.length} Candidates Evaluated)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {searchResults.map((photo, i) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border bg-card flex flex-col">
                  <div className="h-28 w-full overflow-hidden">
                    <SafeImage
                      src={photo.src.medium || photo.src.large}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-bold text-primary">Rank #{i + 1}</span>
                      {photo.relevanceScore !== undefined && (
                        <span className="bg-emerald-500/10 text-primary px-1.5 py-0.5 rounded text-xs font-semibold">
                          Score: {photo.relevanceScore}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate" title={photo.photographer}>
                      By: {photo.photographer}
                    </p>
                    <a
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs"
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
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Filter:</span>
            {['all', 'crop', 'product', 'tractor', 'seeds', 'fertilizer'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-colors ${
                  filterType === t
                    ? 'bg-emerald-600 text-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
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
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground font-medium focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Cached Images Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.entityType}-${item.entityName}-${idx}`}
              className="bg-background border border-border rounded-xl overflow-hidden flex flex-col justify-between group hover:border-primary/40 transition-colors"
            >
              <div className="h-36 w-full relative overflow-hidden bg-card">
                <SafeImage
                  src={item.imageUrl}
                  alt={item.entityName}
                  entityName={item.entityName}
                  resolveType={item.entityType as any}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded-md text-xs font-bold text-white uppercase">
                  {item.entityType}
                </span>
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-semibold ${
                  item.validationStatus === 'verified' ? 'bg-emerald-500/90 text-slate-950' : 'bg-amber-500/90 text-slate-950'
                }`}>
                  {item.validationStatus}
                </span>
              </div>

              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground capitalize">{item.entityName}</h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">Query: {item.searchQuery}</p>
                  <p className="text-xs text-muted-foreground truncate">Source: {item.source} · {item.photographer}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <button
                    onClick={() => handleRefresh(item)}
                    className="text-xs font-bold text-primary hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setOverrideUrl(item.imageUrl);
                    }}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    Replace URL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-muted rounded-xl border border-dashed border-border text-muted-foreground text-xs">
            No cached images match your filter. Dynamic images are fetched and cached automatically as users browse.
          </div>
        )}
      </div>

      {/* Override URL Dialog */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4 ">
            <h3 className="font-semibold text-base text-foreground">Override Image URL</h3>
            <p className="text-xs text-muted-foreground">
              Provide a custom verified Pexels photo URL for <strong className="text-foreground">{selectedItem.entityName}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Image URL</label>
              <input
                type="text"
                value={overrideUrl}
                onChange={(e) => setOverrideUrl(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-foreground transition-colors"
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
