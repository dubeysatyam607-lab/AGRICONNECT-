import React, { useState, useEffect, useMemo } from "react";
import { AgriButton } from "@/components/ui/agri-button";
import { SafeImage } from "@/components/ui/SafeImage";
import { Shield, ArrowLeft, ChevronDown, ExternalLink, Calculator, Info } from "lucide-react";
import { getAgriContent, AgriInsurance, formatVerifiedLabel } from "@/lib/agri-info";

interface FasalBimaProps {
  onClose: () => void;
}

type Lang = "en" | "hi";

// Official PMFBY farmer premium CAPS (share of Sum Insured) per notification.
const OFFICIAL_CAPS: Record<string, { en: string; hi: string; pct: number }> = {
  Kharif: { en: "Kharif (food & oilseed crops)", hi: "खरीफ (खाद्य व तिलहन फसलें)", pct: 2.0 },
  Rabi: { en: "Rabi (food & oilseed crops)", hi: "रबी (खाद्य व तिलहन फसलें)", pct: 1.5 },
  "Annual & Commercial": { en: "Annual & commercial/horticultural crops", hi: "वार्षिक व व्यावसायिक/बागवानी फसलें", pct: 5.0 },
};

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
    calcBtn: "Calculate Farmer Premium",
    premium: "Your Farmer Premium",
    coverage: "Sum Insured",
    season: "Season",
    premiumRate: "Premium Cap",
    capNote: "Farmer premium is paid at the official PMFBY premium cap for the season. The actuarial premium set by your state is usually higher — the Central + State governments subsidize the balance. Exact actuarial rates vary by district & crop and are published on pmfby.gov.in, so the premium shown here is the maximum the farmer legally pays, not a total premium estimate.",
    applyBtn: "Apply on PMFBY Portal",
    disclaimer: "* Farmer premium = Sum Insured × official PMFBY premium cap (Kharif 2%, Rabi 1.5%, Annual & Commercial 5%). Actual state actuarial rates may differ; visit pmfby.gov.in for the exact published rates for your district.",
    howItWorks: "How PMFBY Works",
    step1: "Pay farmer premium at the official cap (1.5%–5% of Sum Insured)",
    step2: "Government pays the balance of the actuarial premium",
    step3: "Get compensated for crop loss",
    verifiedLbl: "Premium caps verified from PMFBY notifications",
    liveLbl: "Premium cap",
  },
  hi: {
    title: "फसल बीमा कैलकुलेटर",
    subtitle: "PM फसल बीमा योजना",
    cropLabel: "फसल चुनें",
    stateLabel: "राज्य चुनें",
    landLabel: "जमीन का आकार (एकड़)",
    calcBtn: "किसान प्रीमियम जानें",
    premium: "आपका किसान प्रीमियम",
    coverage: "बीमा राशि",
    season: "मौसम",
    premiumRate: "प्रीमियम सीमा",
    capNote: "किसान प्रीमियम मौसम की आधिकारिक PMFBY प्रीमियम सीमा पर दिया जाता है। आपके राज्य द्वारा तय वास्तविक बीमा प्रीमियम (एक्चुअरियल) आमतौर पर अधिक होता है — केंद्र + राज्य सरकारें इसका शेष हिस्सा सब्सिडी देती हैं। सटीक एक्चुअरियल दरें जिले व फसल के अनुसार अलग होती हैं और pmfby.gov.in पर प्रकाशित होती हैं, इसलिए यहाँ दिखाई गई प्रीमियम सबसे अधिक है जो किसान को कानूनी रूप से देना होता है, कुल प्रीमियम का अनुमान नहीं।",
    applyBtn: "PMFBY पोर्टल पर आवेदन करें",
    disclaimer: "* किसान प्रीमियम = बीमा राशि × आधिकारिक PMFBY प्रीमियम सीमा (खरीफ 2%, रबी 1.5%, वार्षिक व व्यावसायिक 5%)। राज्य की वास्तविक दरें भिन्न हो सकती हैं; अपने जिले की प्रकाशित दरों के लिए pmfby.gov.in देखें।",
    howItWorks: "PMFBY कैसे काम करती है",
    step1: "किसान प्रीमियम आधिकारिक सीमा पर भरें (बीमा राशि का 1.5%–5%)",
    step2: "सरकार एक्चुअरियल प्रीमियम का शेष हिस्सा देती है",
    step3: "फसल नुकसान पर मुआवजा पाएं",
    verifiedLbl: "प्रीमियम सीमाएं PMFBY अधिसूचनाओं से सत्यापित",
    liveLbl: "प्रीमियम सीमा",
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
    coverage: number;
    premiumPerAcre: number;
    premiumRate: number;
  } | null>(null);
  const [liveInsurance, setLiveInsurance] = useState<AgriInsurance[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);

  // Back the calculator with official PMFBY products from the sync DB when present.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { rows } = await getAgriContent<AgriInsurance[]>("insurance", {}, undefined, { limit: 20 });
        if (!cancelled) setLiveInsurance(rows);
      } catch {
        // Offline or edge unavailable — official premium-cap table remains the default.
      } finally {
        if (!cancelled) setLiveLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const L = LABELS[lang];
  const crop = CROPS.find(c => c.key === selectedCrop) || CROPS[0];
  const acres = parseFloat(landSize) || 0;

  // Bucket the crop's premium into the matching official notification class.
  const capBucket = useMemo(() => {
    return Object.values(OFFICIAL_CAPS).find(c => c.pct === crop.premiumRate) || OFFICIAL_CAPS.Rabi;
  }, [crop.premiumRate]);

  // Prefer a live product row matching this bucket (same cap or season) —
  // its verified/source labels are used in the results note.
  const liveMatch = useMemo(() => {
    return liveInsurance.find(
      p => p.premium_cap_percent === crop.premiumRate
        || p.farmer_premium_rate === crop.premiumRate
        || (p.season ? p.season === capBucket.en.split(" ")[0] : false),
    ) || null;
  }, [liveInsurance, crop.premiumRate, capBucket]);

  const liveVerified = liveMatch ? formatVerifiedLabel(liveMatch.last_verified_at) : null;

  const calculate = () => {
    if (!acres || acres <= 0) return;
    // Farmer premium = Sum Insured × official PMFBY premium cap. The actuarial
    // premium is state-specific and cannot be derived here, so no subsidy amount
    // is invented — the government's share is documented in the results note.
    const farmerPremiumRate = crop.premiumRate / 100;
    const totalSumInsured = crop.sumInsured * acres;
    const farmerPremium = totalSumInsured * farmerPremiumRate;

    setResult({
      farmerPremium: Math.round(farmerPremium),
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
          src="https://images.pexels.com/photos/36678256/pexels-photo-36678256.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940"
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
              <p className="text-primary-foreground/70 text-xs mt-1">{fmt(result.premiumPerAcre)}{lang === "hi" ? "/एकड़" : "/acre"}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{L.coverage}</p>
                  <p className="text-lg font-bold text-foreground">{fmt(result.coverage)}</p>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{L.premiumRate}</p>
                  <p className="text-lg font-bold text-primary">{result.premiumRate}%</p>
                  <p className="text-[9px] text-muted-foreground">{lang === "hi" ? capBucket.hi : capBucket.en}</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">{L.capNote}</p>
                {(liveVerified && liveMatch) || !liveLoaded ? (
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 text-center mt-2 flex items-center justify-center gap-1">
                    <Shield size={11} /> {L.verifiedLbl}
                    {liveVerified && liveMatch?.source_name ? ` · ${formatVerifiedLabel(liveMatch.last_verified_at)} · ${liveMatch.source_name}` : ""}
                  </p>
                ) : null}
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
