import React, { useState } from "react";
import { AgriButton } from "@/components/ui/agri-button";
import { SafeImage } from "@/components/ui/SafeImage";
import { Shield, ArrowLeft, ChevronDown, ExternalLink, Calculator, IndianRupee, Info } from "lucide-react";

interface FasalBimaProps {
  onClose: () => void;
}

type Lang = "en" | "hi";

const CROPS = [
  { key: "wheat", en: "Wheat", hi: "गेहूं", emoji: "🌾", sumInsured: 25000, premiumRate: 1.5, season: "Rabi", seasonHi: "रबी", minArea: 0.1 },
  { key: "rice", en: "Rice", hi: "चावल", emoji: "🍚", sumInsured: 35000, premiumRate: 2.0, season: "Kharif", seasonHi: "खरीफ", minArea: 0.1 },
  { key: "maize", en: "Maize", hi: "मक्का", emoji: "🌽", sumInsured: 20000, premiumRate: 2.0, season: "Kharif", seasonHi: "खरीफ", minArea: 0.1 },
  { key: "soybean", en: "Soybean", hi: "सोयाबीन", emoji: "🫘", sumInsured: 30000, premiumRate: 2.0, season: "Kharif", seasonHi: "खरीफ", minArea: 0.1 },
  { key: "mustard", en: "Mustard", hi: "सरसों", emoji: "🌻", sumInsured: 28000, premiumRate: 1.5, season: "Rabi", seasonHi: "रबी", minArea: 0.1 },
  { key: "cotton", en: "Cotton", hi: "कपास", emoji: "🫧", sumInsured: 40000, premiumRate: 5.0, season: "Kharif", seasonHi: "खरीफ", minArea: 0.1 },
  { key: "onion", en: "Onion", hi: "प्याज", emoji: "🧅", sumInsured: 60000, premiumRate: 5.0, season: "Rabi", seasonHi: "रबी", minArea: 0.1 },
  { key: "potato", en: "Potato", hi: "आलू", emoji: "🥔", sumInsured: 50000, premiumRate: 5.0, season: "Rabi", seasonHi: "रबी", minArea: 0.1 },
  { key: "gram", en: "Gram (Chana)", hi: "चना", emoji: "🫘", sumInsured: 22000, premiumRate: 1.5, season: "Rabi", seasonHi: "रबी", minArea: 0.1 },
  { key: "groundnut", en: "Groundnut", hi: "मूंगफली", emoji: "🥜", sumInsured: 32000, premiumRate: 2.0, season: "Kharif", seasonHi: "खरीफ", minArea: 0.1 },
];

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const LABELS: Record<Lang, Record<string, string>> = {
  en: {
    title: "Fasal Bima Calculator",
    subtitle: "PM Crop Insurance Scheme",
    cropLabel: "Select Crop",
    stateLabel: "Select State",
    landLabel: "Land Size (Acres)",
    calcBtn: "Calculate Premium",
    premium: "Your Premium",
    coverage: "Total Coverage",
    govt: "Government Subsidy",
    season: "Season",
    premiumRate: "Premium Rate",
    schemeNote: "Under PM Fasal Bima Yojana (PMFBY), the government subsidizes up to 98.5% of the premium for Rabi & Kharif crops.",
    applyBtn: "Apply on PMFBY Portal",
    disclaimer: "* Premium amounts are indicative. Actual premium depends on state-specific actuarial rates. Visit pmfby.gov.in for exact rates.",
    subsidy: "Central + State subsidy",
    perAcre: "/acre",
    howItWorks: "How PMFBY Works",
    step1: "Pay low farmer premium (1.5%–5%)",
    step2: "Government pays remaining subsidy",
    step3: "Get compensated for crop loss",
  },
  hi: {
    title: "फसल बीमा कैलकुलेटर",
    subtitle: "PM फसल बीमा योजना",
    cropLabel: "फसल चुनें",
    stateLabel: "राज्य चुनें",
    landLabel: "जमीन का आकार (एकड़)",
    calcBtn: "प्रीमियम जानें",
    premium: "आपका प्रीमियम",
    coverage: "कुल कवरेज",
    govt: "सरकारी सब्सिडी",
    season: "मौसम",
    premiumRate: "प्रीमियम दर",
    schemeNote: "PM फसल बीमा योजना (PMFBY) के तहत सरकार रबी और खरीफ फसलों के लिए 98.5% तक प्रीमियम सब्सिडी देती है।",
    applyBtn: "PMFBY पोर्टल पर आवेदन करें",
    disclaimer: "* प्रीमियम राशि संकेतात्मक है। वास्तविक प्रीमियम राज्य-विशिष्ट दरों पर निर्भर करता है। सटीक दरों के लिए pmfby.gov.in देखें।",
    subsidy: "केंद्र + राज्य सब्सिडी",
    perAcre: "/एकड़",
    howItWorks: "PMFBY कैसे काम करती है",
    step1: "कम किसान प्रीमियम (1.5%–5%) भरें",
    step2: "सरकार शेष सब्सिडी देती है",
    step3: "फसल नुकसान पर मुआवजा पाएं",
  },
};

const FasalBima: React.FC<FasalBimaProps> = ({ onClose }) => {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedCrop, setSelectedCrop] = useState("wheat");
  const [selectedState, setSelectedState] = useState("Uttar Pradesh");
  const [landSize, setLandSize] = useState("2");
  const [showCropDD, setShowCropDD] = useState(false);
  const [showStateDD, setShowStateDD] = useState(false);
  const [result, setResult] = useState<{
    farmerPremium: number;
    totalPremium: number;
    govtSubsidy: number;
    coverage: number;
    premiumPerAcre: number;
    premiumRate: number;
  } | null>(null);

  const L = LABELS[lang];
  const crop = CROPS.find(c => c.key === selectedCrop) || CROPS[0];
  const acres = parseFloat(landSize) || 0;

  const calculate = () => {
    if (!acres || acres <= 0) return;
    // PMFBY farmer premium: Kharif max 2%, Rabi max 1.5%, Horticulture max 5%
    const farmerPremiumRate = crop.premiumRate / 100;
    const totalSumInsured = crop.sumInsured * acres;
    const totalPremium = totalSumInsured * (farmerPremiumRate * 3); // actuarial ~3x farmer rate
    const farmerPremium = totalSumInsured * farmerPremiumRate;
    const govtSubsidy = totalPremium - farmerPremium;

    setResult({
      farmerPremium: Math.round(farmerPremium),
      totalPremium: Math.round(totalPremium),
      govtSubsidy: Math.round(govtSubsidy),
      coverage: Math.round(totalSumInsured),
      premiumPerAcre: Math.round(farmerPremium / acres),
      premiumRate: crop.premiumRate,
    });
  };

  const fmt = (v: number) => "₹" + v.toLocaleString("en-IN");

  return (
    <div className="pb-24 pt-4 min-h-screen">
      {/* Hero Banner */}
      <div className="relative mx-4 mb-5 rounded-2xl overflow-hidden h-36 shadow-lg">
        <SafeImage
          src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80"
          alt="Crop insurance"
          entityName="Fasal Bima Crop Insurance"
          resolveType="scheme"
          category="insurance"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 to-primary/40" />
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div>
            <button onClick={onClose} className="flex items-center gap-1 text-primary-foreground/80 text-xs mb-1">
              <ArrowLeft size={13} /> {lang === "hi" ? "वापस" : "Back"}
            </button>
            <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
              <Shield size={20} /> {L.title}
            </h2>
            <p className="text-primary-foreground/80 text-sm">{L.subtitle}</p>
          </div>
          <button
            onClick={() => setLang(l => l === "en" ? "hi" : "en")}
            className="bg-primary-foreground/20 px-3 py-1.5 rounded-full text-primary-foreground text-xs font-bold backdrop-blur-sm"
          >
            {lang === "en" ? "हिंदी" : "English"}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* How it works */}
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-4">
          <h3 className="font-bold text-foreground text-sm mb-2 flex items-center gap-1">
            <Info size={14} className="text-primary" /> {L.howItWorks}
          </h3>
          <div className="space-y-1.5">
            {[L.step1, L.step2, L.step3].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                <span className="text-sm text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calculator Form */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-card space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Calculator size={16} className="text-primary" />
            {lang === "hi" ? "प्रीमियम गणना" : "Premium Calculator"}
          </h3>

          {/* Crop Selector */}
          <div className="relative">
            <label className="text-xs text-muted-foreground font-medium">{L.cropLabel}</label>
            <button
              onClick={() => { setShowCropDD(!showCropDD); setShowStateDD(false); }}
              className="mt-1 w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-sm"
            >
              <span>{crop.emoji} {lang === "hi" ? crop.hi : crop.en}</span>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showCropDD ? "rotate-180" : ""}`} />
            </button>
            {showCropDD && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {CROPS.map(c => (
                  <button key={c.key} onClick={() => { setSelectedCrop(c.key); setShowCropDD(false); setResult(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left text-sm ${selectedCrop === c.key ? "bg-primary/10 text-primary" : ""}`}>
                    {c.emoji} {lang === "hi" ? c.hi : c.en}
                    <span className="ml-auto text-xs text-muted-foreground">{lang === "hi" ? c.seasonHi : c.season}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* State Selector */}
          <div className="relative">
            <label className="text-xs text-muted-foreground font-medium">{L.stateLabel}</label>
            <button
              onClick={() => { setShowStateDD(!showStateDD); setShowCropDD(false); }}
              className="mt-1 w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-sm"
            >
              <span>{selectedState}</span>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showStateDD ? "rotate-180" : ""}`} />
            </button>
            {showStateDD && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {STATES.map(s => (
                  <button key={s} onClick={() => { setSelectedState(s); setShowStateDD(false); setResult(null); }}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 text-sm ${selectedState === s ? "bg-primary/10 text-primary" : ""}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Land Size */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">{L.landLabel}</label>
            <input
              type="number"
              value={landSize}
              onChange={e => { setLandSize(e.target.value); setResult(null); }}
              placeholder="e.g. 2.5"
              className="mt-1 w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Crop info tags */}
          <div className="flex gap-2 flex-wrap">
            <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
              {L.season}: {lang === "hi" ? crop.seasonHi : crop.season}
            </span>
            <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
              {L.premiumRate}: {crop.premiumRate}%
            </span>
          </div>

          <AgriButton
            onClick={calculate}
            className="w-full"
          >
            <Calculator size={16} /> {L.calcBtn}
          </AgriButton>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="bg-primary p-4 text-center">
              <p className="text-primary-foreground/80 text-sm">{L.premium}</p>
              <p className="text-4xl font-bold text-primary-foreground">{fmt(result.farmerPremium)}</p>
              <p className="text-primary-foreground/70 text-xs mt-1">{fmt(result.premiumPerAcre)}{L.perAcre}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{L.coverage}</p>
                  <p className="text-lg font-bold text-foreground">{fmt(result.coverage)}</p>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{L.govt}</p>
                  <p className="text-lg font-bold text-primary">{fmt(result.govtSubsidy)}</p>
                  <p className="text-[9px] text-muted-foreground">{L.subsidy}</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground text-center">{L.schemeNote}</p>
              </div>

              {/* Apply Button */}
              <a
                href="https://pmfby.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <ExternalLink size={14} /> {L.applyBtn}
              </a>

              <p className="text-[10px] text-muted-foreground text-center">{L.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FasalBima;
