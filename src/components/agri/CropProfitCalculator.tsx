import React, { useState, useEffect, useCallback } from "react";
import { AgriButton } from "@/components/ui/agri-button";
import {
  Calculator,
  ChevronDown,
  TrendingUp,
  Leaf,
  IndianRupee,
  Wheat,
  BarChart3,
  Info,
  RefreshCw,
  GitCompare,
  Languages,
  Plus,
  X,
  Trophy,
  Share2,
} from "lucide-react";
import { fetchMandiPrices } from "@/lib/mandi-api";
import { AgriImage } from "@/components/ui/agri-image";

// Bilingual labels
type Lang = "en" | "hi";

const LABELS: Record<Lang, Record<string, string>> = {
  en: {
    title: "Fasal Labh Calculator",
    subtitle: "Crop Profit Estimator",
    cropLabel: "Select Crop",
    landLabel: "Land Size",
    acresUnit: "Acres",
    priceLabel: "Sale Price (₹/quintal)",
    refreshBtn: "Refresh",
    calculateBtn: "Calculate Profit",
    customPricePlaceholder: "Custom price",
    customPriceHint: "Custom / Enter your price",
    liveMandiLabel: "Live Mandi",
    mspLabel: "MSP 2024-25",
    avgYield: "Avg yield",
    inputCostLabel: "Input cost",
    totalYield: "Total Yield",
    revenue: "Revenue",
    inputCost: "Input Cost",
    roi: "ROI (Return)",
    estimatedProfit: "Estimated Profit",
    estimatedLoss: "Estimated Loss",
    netProfit: "Net Profit",
    netLoss: "Net Loss",
    perAcre: "/acre",
    tip: "💡 Tip: These are average estimates. Actual yield may vary by soil quality, irrigation, and weather.",
    compareBtn: "Compare Crops",
    singleBtn: "Single Crop",
    addCrop: "Add Crop",
    removeCrop: "Remove",
    compareTitle: "Side-by-Side Comparison",
    bestCrop: "Best Crop",
    season: "Season",
    price: "Price",
    priceSource: "Source",
    live: "Live",
    msp: "MSP",
  },
  hi: {
    title: "फसल लाभ कैलकुलेटर",
    subtitle: "अनुमानित फसल मुनाफा",
    cropLabel: "फसल चुनें",
    landLabel: "जमीन का आकार",
    acresUnit: "एकड़",
    priceLabel: "बिक्री मूल्य (₹/क्विंटल)",
    refreshBtn: "ताज़ा करें",
    calculateBtn: "लाभ जानें",
    customPricePlaceholder: "अपना मूल्य",
    customPriceHint: "अपना मूल्य दर्ज करें",
    liveMandiLabel: "लाइव मंडी",
    mspLabel: "MSP 2024-25",
    avgYield: "औसत उत्पादन",
    inputCostLabel: "इनपुट लागत",
    totalYield: "कुल उत्पादन",
    revenue: "कुल आमदनी",
    inputCost: "कुल लागत",
    roi: "रिटर्न (ROI)",
    estimatedProfit: "अनुमानित लाभ",
    estimatedLoss: "अनुमानित नुकसान",
    netProfit: "शुद्ध लाभ",
    netLoss: "शुद्ध नुकसान",
    perAcre: "/एकड़",
    tip: "💡 सुझाव: ये औसत अनुमान हैं। वास्तविक उत्पादन मिट्टी, सिंचाई और मौसम पर निर्भर करता है।",
    compareBtn: "फसल तुलना करें",
    singleBtn: "एक फसल",
    addCrop: "फसल जोड़ें",
    removeCrop: "हटाएं",
    compareTitle: "फसल तुलना",
    bestCrop: "सबसे अच्छी फसल",
    season: "मौसम",
    price: "मूल्य",
    priceSource: "स्रोत",
    live: "लाइव",
    msp: "MSP",
  },
};

const CROP_DATA: Record<string, {
  labelEn: string;
  labelHi: string;
  emoji: string;
  yieldPerAcre: number;
  inputCost: number;
  mspFallback: number;
  searchKey: string;
  season: string;
  seasonHi: string;
  image: string;
}> = {
  wheat: {
    labelEn: "Wheat", labelHi: "गेहूं", emoji: "🌾",
    yieldPerAcre: 18, inputCost: 8500, mspFallback: 2275,
    searchKey: "wheat", season: "Rabi (Nov–Apr)", seasonHi: "रबी (नव–अप्रैल)",
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=400",
  },
  rice: {
    labelEn: "Rice", labelHi: "चावल", emoji: "🍚",
    yieldPerAcre: 22, inputCost: 11000, mspFallback: 2183,
    searchKey: "rice", season: "Kharif (Jun–Nov)", seasonHi: "खरीफ (जून–नव)",
    image: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=400",
  },
  maize: {
    labelEn: "Maize", labelHi: "मक्का", emoji: "🌽",
    yieldPerAcre: 20, inputCost: 7000, mspFallback: 1962,
    searchKey: "maize", season: "Kharif (Jun–Oct)", seasonHi: "खरीफ (जून–अक्टू)",
    image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400",
  },
  soybean: {
    labelEn: "Soybean", labelHi: "सोयाबीन", emoji: "🫘",
    yieldPerAcre: 12, inputCost: 9000, mspFallback: 4600,
    searchKey: "soybean", season: "Kharif (Jun–Oct)", seasonHi: "खरीफ (जून–अक्टू)",
    image: "https://images.unsplash.com/photo-1631806882628-d72d1c2a8dce?auto=format&fit=crop&q=80&w=400",
  },
  mustard: {
    labelEn: "Mustard", labelHi: "सरसों", emoji: "🌻",
    yieldPerAcre: 10, inputCost: 7500, mspFallback: 5650,
    searchKey: "mustard", season: "Rabi (Oct–Feb)", seasonHi: "रबी (अक्टू–फरवरी)",
    image: "https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&q=80&w=400",
  },
  cotton: {
    labelEn: "Cotton", labelHi: "कपास", emoji: "🫧",
    yieldPerAcre: 8, inputCost: 14000, mspFallback: 6620,
    searchKey: "cotton", season: "Kharif (May–Nov)", seasonHi: "खरीफ (मई–नव)",
    image: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=400",
  },
  onion: {
    labelEn: "Onion", labelHi: "प्याज", emoji: "🧅",
    yieldPerAcre: 80, inputCost: 20000, mspFallback: 800,
    searchKey: "onion", season: "Rabi (Oct–Mar)", seasonHi: "रबी (अक्टू–मार्च)",
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400",
  },
  potato: {
    labelEn: "Potato", labelHi: "आलू", emoji: "🥔",
    yieldPerAcre: 100, inputCost: 25000, mspFallback: 700,
    searchKey: "potato", season: "Rabi (Oct–Feb)", seasonHi: "रबी (अक्टू–फरवरी)",
    image: "https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?auto=format&fit=crop&q=80&w=400",
  },
  gram: {
    labelEn: "Gram (Chana)", labelHi: "चना", emoji: "🫘",
    yieldPerAcre: 9, inputCost: 6000, mspFallback: 5440,
    searchKey: "gram", season: "Rabi (Oct–Feb)", seasonHi: "रबी (अक्टू–फरवरी)",
    image: "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?auto=format&fit=crop&q=80&w=400",
  },
  groundnut: {
    labelEn: "Groundnut", labelHi: "मूंगफली", emoji: "🥜",
    yieldPerAcre: 14, inputCost: 10000, mspFallback: 6377,
    searchKey: "groundnut", season: "Kharif (Jun–Oct)", seasonHi: "खरीफ (जून–अक्टू)",
    image: "https://images.unsplash.com/photo-1567696153798-9111f9cd3d0d?auto=format&fit=crop&q=80&w=400",
  },
};

interface CalcResult {
  totalYield: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitPerAcre: number;
  roi: number;
  priceUsed: number;
  priceSource: "live" | "msp";
}

interface CropProfitCalculatorProps {
  onToast: (message: string) => void;
}

// Single crop calculator panel
const CropPanel: React.FC<{
  cropKey: string;
  landSize: string;
  lang: string;
  onChangeCrop: (k: string) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  highlight?: boolean;
  onProfit?: (profit: number) => void;
}> = ({ cropKey, landSize, lang, onChangeCrop, onRemove, showRemove, highlight, onProfit }) => {
  const L = LABELS[lang];
  const crop = CROP_DATA[cropKey];
  const [showDropdown, setShowDropdown] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);

  const fetchLivePrice = useCallback(async () => {
    setLoadingPrice(true);
    setLivePrice(null);
    try {
      const { prices } = await fetchMandiPrices();
      const query = crop.searchKey.toLowerCase();
      const matches = prices.filter((p) =>
        p.crop.toLowerCase().includes(query) ||
        (p.cropHi || "").toLowerCase().includes(query)
      );
      const validPrices = matches.map((p) => p.price).filter((price) => price > 0);
      if (validPrices.length > 0) {
        const avgPrice = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
        setLivePrice(Math.round(avgPrice));
      }
    } catch (error) {
      console.error("Failed to fetch live price:", error);
    }
    finally { setLoadingPrice(false); }
  }, [crop.searchKey]);

  useEffect(() => { fetchLivePrice(); }, [fetchLivePrice, cropKey]);

  const calculate = () => {
    const acres = parseFloat(landSize);
    if (!acres || acres <= 0) return;
    const priceUsed = customPrice ? parseFloat(customPrice) : (livePrice || crop.mspFallback);
    const priceSource: "live" | "msp" = (customPrice || livePrice) ? "live" : "msp";
    const totalYield = crop.yieldPerAcre * acres;
    const totalRevenue = totalYield * priceUsed;
    const totalCost = crop.inputCost * acres;
    const profit = totalRevenue - totalCost;
    setResult({ totalYield, totalRevenue, totalCost, profit, profitPerAcre: profit / acres, roi: (profit / totalCost) * 100, priceUsed, priceSource });
    onProfit?.(profit);
  };

  const fmt = (v: number) => "₹" + Math.abs(v).toLocaleString("en-IN");

  return (
    <div className={`bg-card rounded-2xl border-2 ${highlight ? "border-primary" : "border-border"} overflow-hidden shadow-card`}>
      {/* crop image header */}
      <div className="relative h-28 overflow-hidden">
        <AgriImage
          type="crop"
          crop={cropKey}
          contextName={crop.labelEn}
          alt={`${crop.labelEn} agricultural crop farming`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-white font-bold text-sm">{lang === "hi" ? crop.labelHi : crop.labelEn} {crop.emoji}</p>
            <p className="text-white/70 text-xs">{lang === "hi" ? crop.seasonHi : crop.season}</p>
          </div>
          {showRemove && onRemove && (
            <button onClick={onRemove} className="bg-white/20 rounded-full p-1">
              <X size={12} className="text-white" />
            </button>
          )}
          {highlight && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Trophy size={10} /> {L.bestCrop}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Crop dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-sm"
          >
            <span className="font-medium text-foreground">
              {lang === "hi" ? crop.labelHi : crop.labelEn}
            </span>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>
          {showDropdown && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
              {Object.entries(CROP_DATA).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => { onChangeCrop(key); setShowDropdown(false); setResult(null); setCustomPrice(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left text-sm ${cropKey === key ? "bg-primary/10" : ""}`}
                >
                  <span>{data.emoji}</span>
                  <span>{lang === "hi" ? data.labelHi : data.labelEn}</span>
                  {cropKey === key && <span className="ml-auto text-primary text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price row */}
        <div className="flex gap-2">
          <div
            className={`flex-1 p-2 rounded-xl border-2 text-center cursor-pointer transition-colors ${!customPrice ? "border-primary bg-primary/5" : "border-border bg-background"}`}
            onClick={() => setCustomPrice("")}
          >
            {loadingPrice
              ? <div className="h-5 bg-muted animate-pulse rounded" />
              : <p className="font-bold text-primary text-sm">₹{(livePrice || crop.mspFallback).toLocaleString("en-IN")}</p>}
            <p className="text-xs text-muted-foreground">{livePrice ? `🟢 ${L.liveMandiLabel}` : `📋 ${L.mspLabel}`}</p>
          </div>
          <input
            type="number"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder={L.customPricePlaceholder}
            className="flex-1 p-2 rounded-xl border border-border bg-background text-foreground text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center"
          />
        </div>

        {/* Calculate */}
        <AgriButton
          onClick={calculate}
          className="w-full"
        >
          <BarChart3 size={16} /> {L.calculateBtn}
        </AgriButton>

        {/* Result */}
        {result && (
          <div className={`rounded-xl p-3 ${result.profit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
            <p className={`text-2xl font-bold text-center ${result.profit >= 0 ? "text-primary" : "text-destructive"}`}>
              {result.profit >= 0 ? "+" : "-"}{fmt(result.profit)}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {result.profit >= 0 ? L.netProfit : L.netLoss} · {fmt(result.profitPerAcre)}{L.perAcre}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{L.totalYield}</span>
                <span className="font-medium text-foreground">{result.totalYield.toLocaleString("en-IN")} qtl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{L.revenue}</span>
                <span className="font-medium text-primary">{fmt(result.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{L.inputCost}</span>
                <span className="font-medium text-destructive">-{fmt(result.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{L.roi}</span>
                <span className={`font-bold ${result.roi >= 0 ? "text-primary" : "text-destructive"}`}>
                  {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(1)}%
                </span>
              </div>
            </div>
            {/* WhatsApp Share */}
            <button
              onClick={() => {
                const cropName = lang === "hi" ? crop.labelHi : crop.labelEn;
                const landLabel = lang === "hi" ? "एकड़" : "acres";
                const profit = Math.abs(result.profit).toLocaleString("en-IN");
                const msg = lang === "hi"
                  ? `🌾 मैं इस सीजन ${landSize} ${landLabel} ${cropName} से ₹${profit} कमा सकता हूं! 📊 किसान साथी ऐप से जोड़ें।`
                  : `🌾 I can earn ₹${profit} from ${landSize} ${landLabel} of ${cropName} this season! 📊 Calculated via Kisan Sathi app.`;
                const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="mt-3 w-full py-2 rounded-xl bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <Share2 size={13} />
              {lang === "hi" ? "WhatsApp पर शेयर करें" : "Share on WhatsApp"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CropProfitCalculator: React.FC<CropProfitCalculatorProps> = ({ onToast }) => {
  const [lang, setLang] = useState<Lang>("en");
  const [landSize, setLandSize] = useState("2");
  const [compareMode, setCompareMode] = useState(false);
  const [cropKeys, setCropKeys] = useState(["wheat"]);
  const [profits, setProfits] = useState<Record<number, number>>({});

  const L = LABELS[lang];

  const addCrop = () => {
    if (cropKeys.length >= 3) { onToast("Maximum 3 crops for comparison"); return; }
    const unused = Object.keys(CROP_DATA).find((k) => !cropKeys.includes(k));
    if (unused) setCropKeys([...cropKeys, unused]);
  };

  const removeCrop = (idx: number) => {
    if (cropKeys.length <= 2) { onToast("Need at least 2 crops to compare"); return; }
    setCropKeys(cropKeys.filter((_, i) => i !== idx));
  };

  const changeCrop = (idx: number, newKey: string) => {
    const updated = [...cropKeys];
    updated[idx] = newKey;
    setCropKeys(updated);
  };

  return (
    <div className="pb-24 pt-4 min-h-screen">
      {/* Hero */}
      <div className="relative mx-4 mb-5 rounded-2xl overflow-hidden h-36 shadow-lg">
        <AgriImage
          type="crops"
          contextName="Crop profit calculator"
          alt="Agricultural crop field farming profit calculation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div>
            <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
              <Calculator size={20} /> {L.title}
            </h2>
            <p className="text-primary-foreground/80 text-sm">{L.subtitle}</p>
          </div>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="flex items-center gap-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors"
          >
            <Languages size={14} />
            {lang === "en" ? "हिंदी" : "English"}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Land size */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            {L.landLabel}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={landSize}
              onChange={(e) => setLandSize(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-border bg-background text-foreground text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="bg-primary/10 px-4 py-3 rounded-xl">
              <span className="text-primary font-semibold text-sm">{L.acresUnit}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {["0.5", "1", "2", "3", "5", "10"].map((v) => (
              <button
                key={v}
                onClick={() => setLandSize(v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${landSize === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setCompareMode(false); setCropKeys([cropKeys[0]]); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${!compareMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Calculator size={16} /> {L.singleBtn}
          </button>
          <button
            onClick={() => { setCompareMode(true); if (cropKeys.length < 2) setCropKeys([cropKeys[0], "mustard"]); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${compareMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <GitCompare size={16} /> {L.compareBtn}
          </button>
        </div>

        {/* Crop panels */}
        {compareMode ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <GitCompare size={16} className="text-primary" /> {L.compareTitle}
            </h3>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {cropKeys.map((key, idx) => {
                const profitEntries = Object.entries(profits).filter(([, p]) => Number.isFinite(p));
                const bestIdx = profitEntries.length > 0
                  ? Number(profitEntries.sort((a, b) => b[1] - a[1])[0][0])
                  : -1;
                return (
                  <CropPanel
                    key={`${key}-${idx}`}
                    cropKey={key}
                    landSize={landSize}
                    lang={lang}
                    onChangeCrop={(k) => changeCrop(idx, k)}
                    onRemove={() => removeCrop(idx)}
                    showRemove={cropKeys.length > 2}
                    highlight={profitEntries.length > 0 && bestIdx === idx}
                    onProfit={(p) => setProfits((prev) => ({ ...prev, [idx]: p }))}
                  />
                );
              })}
            </div>
            {cropKeys.length < 3 && (
              <button
                onClick={addCrop}
                className="w-full py-3 border-2 border-dashed border-primary/40 rounded-2xl text-primary text-sm font-medium flex items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus size={16} /> {L.addCrop}
              </button>
            )}
            <div className="bg-muted/40 rounded-xl p-3 flex items-start gap-2">
              <Info size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{L.tip}</p>
            </div>
          </div>
        ) : (
          <CropPanel
            cropKey={cropKeys[0]}
            landSize={landSize}
            lang={lang}
            onChangeCrop={(k) => setCropKeys([k])}
          />
        )}
      </div>
    </div>
  );
};

export default CropProfitCalculator;
