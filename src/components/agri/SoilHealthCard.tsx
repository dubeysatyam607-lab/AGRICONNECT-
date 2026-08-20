import React, { useState } from "react";
import { AgriButton } from "@/components/ui/agri-button";
import { Sprout, Zap, Droplets, FlaskConical, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Leaf } from "lucide-react";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

interface NutrientLevel {
  value: number;
  status: "low" | "optimal" | "high";
  label: string;
  labelHi: string;
  color: string;
  min: number;
  max: number;
  unit: string;
}

interface SoilHealthCardProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

const NUTRIENT_RANGES = {
  N: { min: 0, low: 280, optimal: 560, max: 800, label: "Nitrogen (N)", labelHi: "नाइट्रोजन (N)", color: "hsl(142,70%,45%)", unit: "kg/ha" },
  P: { min: 0, low: 11, optimal: 25, max: 50, label: "Phosphorus (P)", labelHi: "फास्फोरस (P)", color: "hsl(38,92%,50%)", unit: "kg/ha" },
  K: { min: 0, low: 108, optimal: 280, max: 500, label: "Potassium (K)", labelHi: "पोटेशियम (K)", color: "hsl(220,80%,55%)", unit: "kg/ha" },
};

const CROPS_FOR_SOIL: Record<string, { suitable: string[]; fertilizers: string[]; tipEn: string; tipHi: string }> = {
  low_N: { suitable: ["Legumes (Chickpea, Moong)", "Lentils", "Groundnut"], fertilizers: ["Urea (46-0-0)", "Ammonium Sulphate", "DAP", "Compost/FYM"], tipEn: "Apply 120 kg/ha Urea in split doses. Add green manure crops like Sesbania.", tipHi: "120 किलो/हेक्टेयर यूरिया को विभाजित खुराक में दें। सेस्बेनिया जैसी हरी खाद फसलें जोड़ें।" },
  high_N: { suitable: ["Wheat", "Rice", "Maize", "Sugarcane"], fertilizers: ["Avoid extra N fertilizers", "Balance with P & K"], tipEn: "Reduce Nitrogen application. Balance with Phosphorus and Potassium for best results.", tipHi: "नाइट्रोजन उपयोग कम करें। फास्फोरस और पोटेशियम के साथ संतुलन बनाएं।" },
  optimal_N: { suitable: ["Wheat", "Rice", "Cotton", "Soybean"], fertilizers: ["Maintain with light top dressing", "Compost", "Neem-coated Urea"], tipEn: "Nitrogen is ideal. Maintain with 40 kg/ha top dressing and organic matter.", tipHi: "नाइट्रोजन उचित मात्रा में है। 40 किलो/हेक्टेयर टॉप ड्रेसिंग और जैविक पदार्थ से बनाए रखें।" },
};

function getNutrientStatus(key: "N" | "P" | "K", value: number): "low" | "optimal" | "high" {
  const r = NUTRIENT_RANGES[key];
  if (value < r.low) return "low";
  if (value > r.optimal) return "high";
  return "optimal";
}

function getGaugePercent(key: "N" | "P" | "K", value: number): number {
  const r = NUTRIENT_RANGES[key];
  return Math.min(100, Math.max(0, (value / r.max) * 100));
}

const NutrientGauge: React.FC<{ label: string; labelHi: string; value: number; unit: string; status: "low" | "optimal" | "high"; color: string; pct: number; lang: "en" | "hi" }> = ({
  label, labelHi, value, unit, status, color, pct, lang
}) => {
  const statusColors = { low: "hsl(0,84%,60%)", optimal: "hsl(142,70%,45%)", high: "hsl(38,92%,50%)" };
  const statusLabels = { low: lang === "hi" ? "कम" : "Low", optimal: lang === "hi" ? "उचित" : "Optimal", high: lang === "hi" ? "अधिक" : "High" };
  const sc = statusColors[status];

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-foreground text-sm">{lang === "hi" ? labelHi : label}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold`} style={{ backgroundColor: sc, color: "hsl(0 0% 100%)" }}>
          {statusLabels[status]}
        </span>
      </div>
      {/* Bar gauge */}
      <div className="relative h-4 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: sc }}
        />
        {/* Optimal zone marker */}
        <div className="absolute top-0 h-full w-0.5 bg-primary/40" style={{ left: "35%" }} />
        <div className="absolute top-0 h-full w-0.5 bg-primary/40" style={{ left: "70%" }} />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-2xl font-bold" style={{ color: sc }}>{value}</p>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </div>
    </div>
  );
};

const SoilHealthCard: React.FC<SoilHealthCardProps> = ({ onClose, onToast }) => {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [ph, setPh] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    nutrients: { key: "N" | "P" | "K"; value: number; status: "low" | "optimal" | "high"; pct: number }[];
    aiRecommendation: string;
    crops: string[];
    fertilizers: string[];
  } | null>(null);

  const L = {
    en: {
      title: "Soil Health Card",
      subtitle: "मृदा स्वास्थ्य कार्ड",
      n: "Nitrogen (N) kg/ha",
      p: "Phosphorus (P) kg/ha",
      k: "Potassium (K) kg/ha",
      phLabel: "Soil pH",
      analyzeBtn: "Analyze Soil",
      recommendedCrops: "Recommended Crops",
      fertilizers: "Fertilizer Advice",
      aiInsight: "AI Soil Insight",
      phHint: "pH 6.0–7.5 is ideal for most crops",
      nHint: "Low: <280 · Optimal: 280–560 · High: >560",
      pHint: "Low: <11 · Optimal: 11–25 · High: >25",
      kHint: "Low: <108 · Optimal: 108–280 · High: >280",
    },
    hi: {
      title: "मृदा स्वास्थ्य कार्ड",
      subtitle: "Soil Health Card",
      n: "नाइट्रोजन (N) किग्रा/हेक्टेयर",
      p: "फास्फोरस (P) किग्रा/हेक्टेयर",
      k: "पोटेशियम (K) किग्रा/हेक्टेयर",
      phLabel: "मिट्टी pH",
      analyzeBtn: "मिट्टी जांचें",
      recommendedCrops: "अनुशंसित फसलें",
      fertilizers: "उर्वरक सलाह",
      aiInsight: "AI मिट्टी सुझाव",
      phHint: "अधिकांश फसलों के लिए pH 6.0–7.5 उपयुक्त",
      nHint: "कम: <280 · उचित: 280–560 · अधिक: >560",
      pHint: "कम: <11 · उचित: 11–25 · अधिक: >25",
      kHint: "कम: <108 · उचित: 108–280 · अधिक: >280",
    },
  }[lang];

  const analyze = async () => {
    const n = parseFloat(nitrogen);
    const p = parseFloat(phosphorus);
    const k = parseFloat(potassium);
    const phVal = parseFloat(ph);

    if (!n || !p || !k || isNaN(n) || isNaN(p) || isNaN(k)) {
      onToast(lang === "hi" ? "कृपया N, P, K मान दर्ज करें" : "Please enter valid N, P, K numeric values");
      return;
    }

    // Validate all inputs are finite positive numbers to prevent prompt injection
    if (!Number.isFinite(n) || !Number.isFinite(p) || !Number.isFinite(k) || n < 0 || p < 0 || k < 0) {
      onToast(lang === "hi" ? "मान सकारात्मक संख्या होने चाहिए" : "Values must be positive numbers");
      return;
    }
    if (phVal && (isNaN(phVal) || phVal < 0 || phVal > 14 || !Number.isFinite(phVal))) {
      onToast(lang === "hi" ? "pH मान 0-14 के बीच होना चाहिए" : "pH must be between 0 and 14");
      return;
    }

    setLoading(true);
    try {
      const nStatus = getNutrientStatus("N", n);
      const pStatus = getNutrientStatus("P", p);
      const kStatus = getNutrientStatus("K", k);

      // Get AI recommendation
      const prompt = `You are an expert Indian agricultural soil scientist. A farmer has provided soil test results:
- Nitrogen (N): ${n} kg/ha (${nStatus})
- Phosphorus (P): ${p} kg/ha (${pStatus})  
- Potassium (K): ${k} kg/ha (${kStatus})
- Soil pH: ${phVal || "not provided"}

In ${lang === "hi" ? "Hindi" : "English"}, provide:
1. A 2-sentence soil health summary
2. Top 3 recommended crops
3. Specific fertilizer recommendations with quantities

Keep it practical and farmer-friendly. Use simple language.`;

      const { data } = await invokeEdgeWithTimeout<{
        message?: string;
        reply?: string;
      }>("kisan-chat", {
        messages: [{ role: "user", content: prompt }],
        language: lang === "hi" ? "Hindi" : "English",
      }, 15000);

      const aiText = data?.message || data?.reply || "Unable to get AI recommendation at this time.";

      // Parse fertilizer suggestions based on nutrient status
      const fertKey = `${nStatus}_N` as keyof typeof CROPS_FOR_SOIL;
      const fertData = CROPS_FOR_SOIL[fertKey] || CROPS_FOR_SOIL.optimal_N;

      setResult({
        nutrients: [
          { key: "N", value: n, status: nStatus, pct: getGaugePercent("N", n) },
          { key: "P", value: p, status: pStatus, pct: getGaugePercent("P", p) },
          { key: "K", value: k, status: kStatus, pct: getGaugePercent("K", k) },
        ],
        aiRecommendation: aiText,
        crops: fertData.suitable,
        fertilizers: fertData.fertilizers,
      });
    } catch {
      onToast(lang === "hi" ? "विश्लेषण में त्रुटि" : "Analysis error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-4 min-h-screen">
      {/* Header */}
      <div className="relative mx-4 mb-5 rounded-2xl overflow-hidden h-36 shadow-lg">
        <img
          src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800"
          alt="Soil testing"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=800"; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div>
            <button onClick={onClose} className="flex items-center gap-1 text-primary-foreground/80 text-sm mb-1">
              <ArrowLeft size={14} /> {lang === "hi" ? "वापस" : "Back"}
            </button>
            <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
              <FlaskConical size={20} /> {L.title}
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
        {/* NPK Input Form */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-card space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Sprout size={16} className="text-primary" />
            {lang === "hi" ? "मृदा परीक्षण मान दर्ज करें" : "Enter Soil Test Values"}
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium">{L.n}</label>
              <input
                type="number"
                value={nitrogen}
                onChange={e => setNitrogen(e.target.value)}
                placeholder="e.g. 320"
                className="mt-1 w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{L.nHint}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">{L.p}</label>
              <input
                type="number"
                value={phosphorus}
                onChange={e => setPhosphorus(e.target.value)}
                placeholder="e.g. 18"
                className="mt-1 w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{L.pHint}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">{L.k}</label>
              <input
                type="number"
                value={potassium}
                onChange={e => setPotassium(e.target.value)}
                placeholder="e.g. 200"
                className="mt-1 w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{L.kHint}</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">{L.phLabel} (optional)</label>
            <input
              type="number"
              value={ph}
              onChange={e => setPh(e.target.value)}
              placeholder="e.g. 6.8"
              step="0.1"
              min="0"
              max="14"
              className="mt-1 w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">{L.phHint}</p>
          </div>

          <AgriButton
            onClick={analyze}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            {loading ? (lang === "hi" ? "विश्लेषण हो रहा है..." : "Analyzing...") : L.analyzeBtn}
          </AgriButton>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Nutrient Gauges */}
            <div>
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap size={16} className="text-primary" />
                {lang === "hi" ? "पोषक तत्व स्तर" : "Nutrient Levels"}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {result.nutrients.map(n => {
                  const r = NUTRIENT_RANGES[n.key];
                  return (
                    <NutrientGauge
                      key={n.key}
                      label={r.label}
                      labelHi={r.labelHi}
                      value={n.value}
                      unit={r.unit}
                      status={n.status}
                      color={r.color}
                      pct={n.pct}
                      lang={lang}
                    />
                  );
                })}
              </div>
            </div>

            {/* Recommended Crops */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Leaf size={16} className="text-primary" />
                {L.recommendedCrops}
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.crops.map((crop, i) => (
                  <span key={i} className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-medium">
                    🌱 {crop}
                  </span>
                ))}
              </div>
            </div>

            {/* Fertilizer Advice */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Droplets size={16} className="text-primary" />
                {L.fertilizers}
              </h3>
              <div className="space-y-2">
                {result.fertilizers.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-primary" />
                {L.aiInsight}
              </h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{result.aiRecommendation}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SoilHealthCard;
