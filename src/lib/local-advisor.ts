import type { FarmProfile } from "@/contexts/FarmContext";
import { MANDI_PRICES } from "./mock-data";

export type LocalAnswerKind =
  | "mandi"
  | "fertilizer"
  | "irrigation"
  | "pest"
  | "disease"
  | "scheme"
  | "crop"
  | "general";

export interface LocalAnswer {
  text: string;
  matched: boolean;
  kind: LocalAnswerKind;
}

const hasDevanagari = (q: string) => /[\u0900-\u097F]/.test(q);

interface CropGuide {
  basal: string;
  topDress: string;
  irrigation: string;
  pests: string[];
  harvestTip: string;
}

const CROP_GUIDES: Record<string, CropGuide> = {
  soybean: {
    basal: "16:30:20 at 50 kg/acre + 20 kg sulfur at sowing",
    topDress: "Urea 20 kg/acre at 25–30 DAS; foliar 2% DAP + 1% KCl at flowering",
    irrigation: "Avoid heavy irrigation at flowering; 2–3 light irrigations at sowing, flowering, pod filling",
    pests: ["Girdle beetle", "Tobacco caterpillar", "Blue butterfly"],
    harvestTip: "Harvest at 95% pod maturity; dry seeds to 10% moisture before storage",
  },
  wheat: {
    basal: "DAP 50 kg/acre + 10 kg zinc sulfate at sowing",
    topDress: "Urea 35 kg/acre at crown root initiation (21 DAS), 35 kg at tillering (45 DAS)",
    irrigation: "5–6 irrigations at CRI, tillering, jointing, boot, grain filling stages",
    pests: ["Aphids", "Termites", "Powdery mildew"],
    harvestTip: "Harvest at full maturity; avoid late harvest to prevent shattering losses",
  },
  cotton: {
    basal: "DAP 25 kg/acre + muriate of potash 20 kg/acre",
    topDress: "Urea 30 kg/acre at squaring and peak flowering; foliar 2% KCl at boll development",
    irrigation: "Avoid water stress at flowering–boll development; stop irrigation at 20% boll bursting",
    pests: ["Bollworm", "Whitefly", "Pink bollworm", "Thrips"],
    harvestTip: "Pick bolls when 70% burst; keep cotton moisture under 8% before marketing",
  },
  onion: {
    basal: "FYM 8 t/acre + DAP 40 kg/acre",
    topDress: "Urea 20 kg/acre at 30 & 60 days; potash 20 kg/acre at bulb formation",
    irrigation: "Drip/light irrigations every 5–7 days; stop 15 days before harvest for curing",
    pests: ["Thrips", "Purple blotch", "Stemphylium blight"],
    harvestTip: "Harvest at 60–70% top fall; cure bulbs for 7–10 days in shade",
  },
  tomato: {
    basal: "FYM 5 t/acre + DAP 30 kg/acre + potash 20 kg/acre",
    topDress: "Urea 20 kg/acre at 25 DAP; foliar calcium nitrate weekly during fruiting to prevent blossom-end rot",
    irrigation: "Drip 2–3 days interval; keep soil moist during flowering & fruit set",
    pests: ["Fruit borer", "Whitefly (ToLCV)", "Early blight", "Blossom-end rot"],
    harvestTip: "Harvest at breaker stage; grade by size and ripeness before packing",
  },
  potato: {
    basal: "DAP 30 kg/acre + muriate of potash 40 kg/acre + FYM 5 t/acre",
    topDress: "Urea 35 kg/acre at earthing-up (30 DAP)",
    irrigation: "Regular 7–10 day irrigations; critical at tuber initiation (40–45 DAP)",
    pests: ["Late blight", "Cutworm", "Aphids (vector)"],
    harvestTip: "Dehaulm 15 days before harvest; cure tubers 1–2 weeks for skin hardening",
  },
  mustard: {
    basal: "DAP 40 kg/acre + muriate of potash 15 kg/acre",
    topDress: "Urea 25 kg/acre at 30 DAS; 0.5% borax spray at flowering for pod set",
    irrigation: "2 irrigations — flowering and siliqua filling (rainfed usually)",
    pests: ["Aphids", "Sawfly", "White rust"],
    harvestTip: "Harvest at 75% pod turn; thresh after sun drying for 5–7 days",
  },
  rice: {
    basal: "DAP 30 kg/acre + 10 kg zinc sulfate at puddling",
    topDress: "Urea 35 kg/acre at tillering (21 DAT) and panicle initiation (45 DAT)",
    irrigation: "Maintain 2–5 cm standing water; drain field 10 days before harvest",
    pests: ["Stem borer", "Brown plant hopper", "Leaf blast", "Sheath blight"],
    harvestTip: "Harvest at 20–25% grain moisture; thresh and dry to 14% for storage",
  },
  maize: {
    basal: "DAP 40 kg/acre + 10 kg zinc sulfate",
    topDress: "Urea 45 kg/acre split at knee-high and tasseling",
    irrigation: "Critical at knee-high, tasseling and grain filling; light irrigations only",
    pests: ["Fall armyworm", "Stem borer", "Downy mildew"],
    harvestTip: "Harvest cobs at 25–28% moisture; dry grain to 14% for safe storage",
  },
  sugarcane: {
    basal: "DAP 20 kg/acre + potash 20 kg/acre + FYM 8 t/acre",
    topDress: "Urea 60 kg/acre split at tillering and grand growth phase",
    irrigation: "Avoid stress at tillering & grand growth; stop 3–4 weeks before harvest",
    pests: ["Top borer", "Stem borer", "Red rot"],
    harvestTip: "Harvest at 10–12 months maturity; trash mulching conserves moisture",
  },
  chilli: {
    basal: "FYM 4 t/acre + DAP 25 kg/acre + potash 20 kg/acre",
    topDress: "Urea 15 kg/acre at 30 DAP; boron 0.2% + zinc foliar at flowering",
    irrigation: "Drip irrigate every 3–4 days; avoid stress during flowering to prevent flower drop",
    pests: ["Thrips", "Mites", "Fruit borer", "Leaf curl virus"],
    harvestTip: "Harvest at full red stage; dry on clean trays for uniform quality",
  },
  groundnut: {
    basal: "DAP 20 kg/acre + gypsum 60 kg/acre at pegging",
    topDress: "No urea — legumes fix N; foliar 2% DAP + 1% KCl at flowering",
    irrigation: "Light irrigations at flowering, pegging and pod filling; avoid over-irrigation",
    pests: ["Tikka leaf spot", "Stem rot", "Spodoptera"],
    harvestTip: "Harvest at 70% pod maturity; dry pods to 8% moisture",
  },
};

const MANDI_CROP_STEMS: Record<string, string> = {
  wheat: "wheat",
  gehu: "wheat",
  gehun: "wheat",
  rice: "rice",
  chawal: "rice",
  dhan: "rice",
  paddy: "rice",
  maize: "maize",
  makka: "maize",
  makai: "maize",
  corn: "maize",
  soybean: "soybean",
  soya: "soybean",
  cotton: "cotton",
  kapas: "cotton",
  mustard: "mustard",
  sarson: "mustard",
  rai: "mustard",
  gram: "gram",
  chana: "gram",
  groundnut: "groundnut",
  mungfali: "groundnut",
  peanut: "groundnut",
  onion: "onion",
  pyaj: "onion",
  pyaz: "onion",
  kanda: "onion",
  potato: "potato",
  aloo: "potato",
  aalu: "potato",
  tomato: "tomato",
  tamatar: "tomato",
  tamatr: "tomato",
  garlic: "garlic",
  lahsun: "garlic",
  sugarcane: "sugarcane",
  ganna: "sugarcane",
  cumin: "cumin",
  jeera: "cumin",
  turmeric: "turmeric",
  haldi: "turmeric",
  coriander: "coriander",
  dhaniya: "coriander",
  banana: "banana",
  kela: "banana",
  mango: "mango",
  aam: "mango",
  moong: "lentils",
  mung: "lentils",
  arhar: "arhar",
  tur: "arhar",
  chilli: "red chilli",
  chili: "red chilli",
  mirch: "red chilli",
  mirchi: "red chilli",
  redchilli: "red chilli",
};

const HINDI_CROP_ALIASES: Record<string, string> = {
  गेहूं: "wheat", गेहूं: "wheat", गेहू: "wheat", सोयाबीन: "soybean", कपास: "cotton", प्याज: "onion",
  टमाटर: "tomato", आलू: "potato", सरसों: "mustard", मक्का: "maize",
  चावल: "rice", धान: "rice", गन्ना: "sugarcane", मिर्च: "chilli",
  मूंगफली: "groundnut", चना: "gram", लहसुन: "garlic", अदरक: "ginger",
  हल्दी: "turmeric", जीरा: "cumin",
};

const HINGLISH_WORDS = [
  "kya", "hai", "hain", "kaise", "kare", "karna", "ka", "ki", "ke", "ko", "me", "mein",
  "bhav", "bhaav", "rate", "kheti", "dawa", "dawai", "khad", "paani", "pani",
  "rog", "kida", "keeda", "beej", "kitna", "kitni", "konsi", "kaunsi", "kab",
  "kaha", "kahan", "batao", "bataiye", "bhai", "namaste", "pranam", "fasal",
  "patta", "patti", "peela", "sukha", "kharif", "rabi", "mandi", "tamatr", "tamatar",
  "aalu", "aloo", "pyaj", "pyaz", "gehu", "gehun", "chana", "sarson", "mirch"
];

const isHinglish = (q: string) => {
  const words = q.toLowerCase().split(/\s+/);
  return words.some((w) => HINGLISH_WORDS.includes(w.replace(/[^a-z]/g, "")));
};

const PEST_REMEDIES: Record<string, { en: string; hi: string }> = {
  aphid: {
    en: "Organic: Neem oil 2 ml/L spray twice, 7 days apart. Chemical: Imidacloprid 0.3 ml/L or dimethoate 1 ml/L.",
    hi: "जैविक: नीम तेल 2 मिली/लीटर 7 दिन के अंतर पर दो बार। रासायनिक: इमिडाक्लोप्रिड 0.3 मिली/लीटर या डाइमिथोएट 1 मिली/लीटर।",
  },
  whitefly: {
    en: "Organic: Yellow sticky traps at 8–10/acre + neem oil 2 ml/L. Chemical: Thiamethoxam 0.2 g/L or buprofezin 1 ml/L.",
    hi: "जैविक: पीले चिपचिपे ट्रैप 8–10/एकड़ + नीम तेल 2 मिली/लीटर। रासायनिक: थियामेथोक्सम 0.2 ग्रा/लीटर या ब्यूप्रोफेज़िन 1 मिली/लीटर।",
  },
  bollworm: {
    en: "Organic: Handpick larvae early morning, pheromone traps 5/acre. Chemical: Chlorantraniliprole 0.3 ml/L or emamectin benzoate 0.4 g/L at evening.",
    hi: "जैविक: सुबह लार्वा हाथ से तोड़ें, फेरोमोन ट्रैप 5/एकड़। रासायनिक: क्लोरेंट्रानिलिप्रोल 0.3 मिली/लीटर या एमामेक्टिन बेंजोएट 0.4 ग्रा/लीटर शाम को।",
  },
  caterpillar: {
    en: "Organic: Handpick and destroy, apply Bt (Bacillus thuringiensis) 2 g/L. Chemical: Emamectin benzoate 0.4 g/L.",
    hi: "जैविक: हाथ से तोड़कर नष्ट करें, बीटी 2 ग्रा/लीटर छिड़कें। रासायनिक: एमामेक्टिन बेंजोएट 0.4 ग्रा/लीटर।",
  },
  thrips: {
    en: "Organic: Blue sticky traps + neem oil 2 ml/L. Chemical: Spinosad 0.3 ml/L or fipronil 1 ml/L.",
    hi: "जैविक: नीले चिपचिपे ट्रैप + नीम तेल 2 मिली/लीटर। रासायनिक: स्पिनोसैड 0.3 मिली/लीटर या फिप्रोनिल 1 मिली/लीटर।",
  },
  mite: {
    en: "Organic: Sulfur 3 g/L spray + spray plants with strong water jet. Chemical: Abamectin 0.5 ml/L.",
    hi: "जैविक: सल्फर 3 ग्रा/लीटर + पानी की तेज़ धार से धोएं। रासायनिक: एबामेक्टिन 0.5 मिली/लीटर।",
  },
  "fall armyworm": {
    en: "Organic: Deep soil ploughing, handpick egg masses, neem oil 2 ml/L early stage. Chemical: Emamectin benzoate 0.4 g/L or chlorantraniliprole 0.3 ml/L.",
    hi: "जैविक: गहरी जुताई, अंडे हाथ से हटाएं, नीम तेल 2 मिली/लीटर शुरुआत में। रासायनिक: एमामेक्टिन 0.4 ग्रा/लीटर या क्लोरेंट्रानिलिप्रोल 0.3 मिली/लीटर।",
  },
  leafminer: {
    en: "Organic: Remove and destroy infested leaves. Chemical: Spinosad 0.3 ml/L or abamectin 0.5 ml/L.",
    hi: "जैविक: संक्रमित पत्तियां तोड़कर नष्ट करें। रासायनिक: स्पिनोसैड 0.3 मिली/लीटर या एबामेक्टिन 0.5 मिली/लीटर।",
  },
};

const PEST_KEYWORDS: Record<string, { en: string; hi: string }[]> = {
  aphid: [
    { en: "aphid", hi: "एफिड" }, { en: "maand", hi: "" }, { en: "mallay", hi: "" },
  ],
  whitefly: [
    { en: "whitefly", hi: "सफेद मक्खी" }, { en: "white fly", hi: "" },
  ],
  bollworm: [
    { en: "bollworm", hi: "इल्ली" }, { en: "pink bollworm", hi: "" }, { en: "fruit borer", hi: "फल छेदक" },
  ],
  caterpillar: [
    { en: "caterpillar", hi: "कैटरपिलर" }, { en: "larva", hi: "" },
  ],
  thrips: [
    { en: "thrips", hi: "थ्रिप्स" },
  ],
  mite: [
    { en: "mite", hi: "घुन" }, { en: "mites", hi: "" },
  ],
  "fall armyworm": [
    { en: "armyworm", hi: "" }, { en: "army worm", hi: "" },
  ],
  leafminer: [
    { en: "leaf miner", hi: "" }, { en: "leafminer", hi: "" },
  ],
};

interface DiseaseInfo {
  symptoms: string[];
  title: string;
  en: string;
  hi: string;
}

const DISEASES: DiseaseInfo[] = [
  {
    symptoms: ["blight", "brown spot", "brownspot", "leaf spot", "dark spot", "blotch", "झुलसा", "धब्बे"],
    title: "Leaf blight / leaf spot",
    en: "Looks like a fungal leaf blight or leaf spot. Remove infected leaves and spray Mancozeb 2 g/L (or Chlorothalonil 2 g/L) twice, 7 days apart. Avoid overhead watering in the evening and maintain row ventilation.",
    hi: "यह फंगल पत्ती झुलसा या धब्बा रोग लगता है। संक्रमित पत्तियां हटाएं और मैन्कोज़ेब 2 ग्रा/लीटर दो बार, 7 दिन के अंतर पर छिड़कें। शाम को ऊपर से पानी देने से बचें और पंक्तियों में हवा बनाए रखें।",
  },
  {
    symptoms: ["powdery", "white powder", "white coating", "white patina", "सफेद चूर्ण", "चूर्ण"],
    title: "Powdery mildew",
    en: "Classic powdery mildew — a white powdery coating on leaves. Spray Sulfur 3 g/L or Hexaconazole 1 ml/L twice, 10 days apart. Ensure good sunlight and avoid dense planting.",
    hi: "यह ख़स्ता फफूंदी (पाउडरी मिल्ड्यू) है — पत्तियों पर सफेद पाउडर परत। सल्फर 3 ग्रा/लीटर या हेक्साकोनाज़ोल 1 मिली/लीटर दो बार, 10 दिन अंतर पर छिड़कें। धूप व हवा बनी रहे।",
  },
  {
    symptoms: ["downy", "purple underside", "purple under leaf", "फफूंदी"],
    title: "Downy mildew",
    en: "Downy mildew shows pale-yellow patches with a purplish-grey mould underneath. Spray Metalaxyl + Mancozeb 2 g/L twice at 10-day intervals and reduce humidity.",
    hi: "फफूंदी नीचे की ओर बैंगनी-भूरी परत बनाती है। मेटालैक्सिल + मैन्कोज़ेब 2 ग्रा/लीटर 10 दिन अंतर पर दो बार छिड़कें और नमी घटाएं।",
  },
  {
    symptoms: ["rust", "orange pustule", "orange spots"],
    title: "Rust",
    en: "Rust shows rusty-orange pustules on leaves. Spray Propiconazole 1 ml/L (or Mancozeb 2.5 g/L) twice, 10 days apart, and remove heavily infected debris.",
    hi: "जंग (रस्ट) पत्तियों पर जंग-जैसे नारंगी धब्बे बनाता है। प्रोपिकोनाज़ोल 1 मिली/लीटर (या मैन्कोज़ेब 2.5 ग्रा/लीटर) 10 दिन अंतर पर दो बार छिड़कें।",
  },
  {
    symptoms: ["wilt", "droop", "drying from base", "stem rot", "मुरझा", "सूख"],
    title: "Wilt / stem rot",
    en: "Wilt is usually caused by soil-borne fungi. Drench soil with Carbendazim 1 g/L, avoid waterlogging, rotate with non-host crops, and remove affected plants.",
    hi: "विल्ट आमतौर पर मिट्टी जनित फफूंद से होता है। कार्बेन्डाजिम 1 ग्रा/लीटर मिट्टी में डालें, जलभराव से बचें, फसल चक्र अपनाएं और रोगग्रस्त पौधे हटाएं।",
  },
  {
    symptoms: ["blast", "diamond shaped"],
    title: "Blast",
    en: "Blast shows diamond-shaped lesions on leaves/neck. Spray Tricyclazole 0.6 g/L twice, 7 days apart, and apply balanced nitrogen (avoid excess urea).",
    hi: "ब्लास्ट पत्ती/गर्दन पर हीरे जैसे धब्बे बनाता है। ट्राइसाइक्लाज़ोल 0.6 ग्रा/लीटर 7 दिन अंतर पर दो बार छिड़कें और अतिरिक्त यूरिया से बचें।",
  },
  {
    symptoms: ["yellow", "yellowing", "chlorosis", "mosaic", "leaf curl", "curling", "पीली", "पीलापन", "मुड़ी"],
    title: "Yellowing / virus complex",
    en: "Yellowing with mottling or curling usually indicates a nutrient issue or a virus spread by whiteflies/aphids. For nutrition: spray 0.5% zinc sulfate + 0.5% urea. For virus: control vectors (imidacloprid 0.3 ml/L), remove infected plants, and use resistant varieties.",
    hi: "पीलापन, धब्बेदार या मुड़ी पत्तियां पोषक तत्व की कमी या सफेद मक्खी/एफिड से फैलने वाले वायरस का संकेत हैं। पोषण हेतु: 0.5% जिंक सल्फेट + 0.5% यूरिया छिड़कें। वायरस हेतु: वेक्टर नियंत्रण (इमिडाक्लोप्रिड 0.3 मिली/लीटर), रोगी पौधे हटाएं।",
  },
];

interface SchemeInfo {
  name: string;
  en: string;
  hi: string;
}

const SCHEMES: SchemeInfo[] = [
  {
    name: "PM-Kisan Samman Nidhi",
    en: "₹6,000/year in 3 equal installments to farmer families. Apply online at pmkisan.gov.in with Aadhaar & land records; check payment status under 'Beneficiary Status'.",
    hi: "किसान परिवारों को सालाना ₹6,000 तीन समान किश्तों में। pmkisan.gov.in पर आधार व भूमि रिकॉर्ड से आवेदन करें।",
  },
  {
    name: "PMKSY (Micro Irrigation)",
    en: "Subsidy up to 55% (small/marginal farmers) and 45% (others) on drip & sprinkler systems. Apply via state agriculture department or PMKSY portal.",
    hi: "ड्रिप व स्प्रिंकलर पर छोटे किसानों को 55% तक सब्सिडी। राज्य कृषि विभाग से आवेदन करें।",
  },
  {
    name: "PMFBY (Crop Insurance)",
    en: "Comprehensive crop insurance — farmer premium as low as 2% for kharif, 1.5% rabi, 5% horticulture. Enroll before the cut-off at your bank/PACS or pmfby.gov.in.",
    hi: "फसल बीमा — किसान प्रीमियम खरीफ 2%, रबी 1.5%, बागवानी 5%। बैंक या pmfby.gov.in पर नियत तिथि से पहले नामांकन करें।",
  },
  {
    name: "Kisan Credit Card (KCC)",
    en: "Crop loans up to ₹3 lakh at just 4% effective interest (with prompt repayment). Meet your nearest bank branch with 1-year cultivation proof & land records.",
    hi: "किसान क्रेडिट कार्ड से ₹3 लाख तक कर्ज सिर्फ 4% ब्याज पर (समय पर चुकाने पर)। नजदीकी बैंक शाखा में जाएं।",
  },
  {
    name: "Soil Health Card",
    en: "Free soil testing every 2 years and a report with crop-wise fertilizer recommendations. Get soil sampled from your village/Agri Department or the Soil Health Card portal.",
    hi: "हर 2 साल में मुफ्त मिट्टी परीक्षण व फसल अनुसार उर्वरक सुझाव। कृषि विभाग से मिट्टी का नमूना भिजवाएं।",
  },
];

const FALLBACK_GENERAL: Record<string, string> = {
  en: "I can help with mandi rates, fertilizer doses, irrigation schedules, pest & disease control, and govt schemes. Try: \"Soybean mandi price\", \"Wheat fertilizer dose\", \"yellow leaves on tomato\", or \"irrigation schedule for maize\".",
  hi: "मैं मंडी भाव, खाद की मात्रा, सिंचाई कार्यक्रम, कीट-रोग नियंत्रण और सरकारी योजनाओं में मदद कर सकता हूं। पूछें: \"सोयाबीन का मंडी भाव\", \"गेहूं की खाद मात्रा\", \"टमाटर की पत्तियां पीली\", या \"मक्का की सिंचाई\"।",
};

const detectCrop = (query: string): string | null => {
  const q = query.toLowerCase();
  for (const [stem, guideKey] of Object.entries(MANDI_CROP_STEMS)) {
    if (q.includes(stem)) return guideKey;
  }
  for (const [hiName, stem] of Object.entries(HINDI_CROP_ALIASES)) {
    if (query.includes(hiName)) return stem;
  }
  return null;
};

const findPest = (q: string): string | null => {
  for (const [key, keywords] of Object.entries(PEST_KEYWORDS)) {
    if (keywords.some(({ en, hi }) => (en && q.includes(en)) || (hi && q.includes(hi)))) return key;
  }
  return null;
};

const findDisease = (q: string): DiseaseInfo | null => {
  for (const d of DISEASES) {
    if (d.symptoms.some((s) => q.includes(s))) return d;
  }
  return null;
};

const hasMandiIntent = (q: string) =>
  ["mandi", "price", "rate", "bhav", "भाव", "मंडी", "दाम", "दर"].some((k) => q.includes(k));

const cropFromMandiPrices = (stem: string) => {
  const s = stem.toLowerCase().trim();
  return MANDI_PRICES.find((m) => {
    const c = m.crop.toLowerCase();
    const cleanCrop = c.split("(")[0].trim();
    return c.includes(s) || s.includes(cleanCrop) || cleanCrop.includes(s);
  });
};

const mandiAnswer = (crop: string, hi: boolean): LocalAnswer => {
  const stem = crop.toLowerCase().split("(")[0].trim();
  const entry = cropFromMandiPrices(stem);
  if (entry) {
    const text = hi
      ? `📍 **${entry.crop}** — संदर्भ मंडी दर (अनुमानित)\n\n- बाज़ार: ${entry.market}, ${entry.state}\n- दर: **₹${entry.price.toLocaleString("en-IN")}/क्विंटल**\n- सीमा: ₹${entry.minPrice.toLocaleString("en-IN")} – ₹${entry.maxPrice.toLocaleString("en-IN")}\n\nआज की लाइव दरें **Mandi Bhav** टैब में देखें।`
      : `📍 **${entry.crop}** — reference mandi rate (estimate)\n\n- Market: ${entry.market}, ${entry.state}\n- Rate: **₹${entry.price.toLocaleString("en-IN")}/quintal**\n- Range: ₹${entry.minPrice.toLocaleString("en-IN")} – ₹${entry.maxPrice.toLocaleString("en-IN")}\n\nFor today's live rates, open the **Mandi Bhav** tab.`;
    return { text, matched: true, kind: "mandi" };
  }
  const text = hi
    ? `मेरे पास **${crop}** के लिए संदर्भ मंडी दर नहीं है। आज की लाइव दरें **Mandi Bhav** टैब में देखें।`
    : `I don't have a reference rate for **${crop}** yet. Check today's live rates in the **Mandi Bhav** tab.`;
  return { text, matched: true, kind: "mandi" };
};

const fertilizerAnswer = (crop: string | null, profile: FarmProfile, hi: boolean): LocalAnswer => {
  const name = crop || profile.crop.toLowerCase().split("(")[0].trim();
  const guide = CROP_GUIDES[name] || CROP_GUIDES[profile.crop.toLowerCase()];
  if (guide) {
    const text = hi
      ? `🧪 **${name.charAt(0).toUpperCase() + name.slice(1)}** के लिए खाद कार्यक्रम\n\n- बुआई के समय (आधार): ${guide.basal}\n- उपराई खाद: ${guide.topDress}\n\nयह मानक सिफारिश है — सटीक मात्रा मिट्टी परीक्षण (Soil Health Card) पर निर्भर करती है।`
      : `🧪 Fertilizer program for **${name.charAt(0).toUpperCase() + name.slice(1)}**\n\n- Basal (at sowing): ${guide.basal}\n- Top dressing: ${guide.topDress}\n\nThis is a standard recommendation — for precise doses, use your Soil Health Card report.`;
    return { text, matched: true, kind: "fertilizer" };
  }
  return {
    text: hi
      ? `मेरे पास **${name}** के लिए खाद कार्यक्रम अभी उपलब्ध नहीं है। कृपया फसल का नाम बताएं या Soil Health Card की सलाह लें।`
      : `I don't have a fertilizer program for **${name}** yet. Please name your crop or follow your Soil Health Card recommendation.`,
    matched: true,
    kind: "fertilizer",
  };
};

const irrigationAnswer = (crop: string | null, profile: FarmProfile, hi: boolean): LocalAnswer => {
  const name = crop || profile.crop.toLowerCase().split("(")[0].trim();
  const guide = CROP_GUIDES[name];
  const stage = profile.stage || "Flowering";
  if (guide) {
    const text = hi
      ? `💧 **${name.charAt(0).toUpperCase() + name.slice(1)}** सिंचाई सलाह\n\n- आपकी फसल अवस्था: **${stage}**\n- योजना: ${guide.irrigation}\n\nसुबह-शाम ही सिंचाई करें और जलभराव से बचें — इससे फफूंद रोग कम होंगे।`
      : `💧 Irrigation advisory for **${name.charAt(0).toUpperCase() + name.slice(1)}**\n\n- Your crop stage: **${stage}**\n- Schedule: ${guide.irrigation}\n\nIrrigate early morning/late evening and avoid waterlogging to reduce fungal disease.`;
    return { text, matched: true, kind: "irrigation" };
  }
  return {
    text: hi
      ? `मेरे पास **${name}** की सिंचाई योजना अभी नहीं है। सामान्य नियम: फूल व दाना भरने की अवस्था में नमी न घटने दें, पर जलभराव से बचें।`
      : `I don't have an irrigation plan for **${name}** yet. General rule: avoid moisture stress at flowering & grain-filling, but never waterlog.`,
    matched: true,
    kind: "irrigation",
  };
};

const pestAnswer = (pest: string, hi: boolean): LocalAnswer => {
  const remedy = PEST_REMEDIES[pest];
  if (remedy) {
    return {
      text: hi
        ? `🐛 **कीट नियंत्रण (${pest})**\n\n- ${remedy.hi}\n\nसुबह या शाम को ही छिड़काव करें और पैकेज पर लिखी मात्रा का पालन करें।`
        : `🐛 **${pest.charAt(0).toUpperCase() + pest.slice(1)} control**\n\n- ${remedy.en}\n\nSpray in early morning or evening and always follow label dose.`,
      matched: true,
      kind: "pest",
    };
  }
  return {
    text: hi
      ? `मुझे इस कीट के नाम की पहचान नहीं हुई। फसल की पत्ती की तस्वीर अपलोड करें या कीट के लक्षण बताएं।`
      : `I couldn't identify that pest by name. Upload a leaf photo or describe the symptoms for diagnosis.`,
    matched: true,
    kind: "pest",
  };
};

const diseaseAnswer = (disease: DiseaseInfo, crop: string | null, hi: boolean): LocalAnswer => {
  const cropPart = crop ? ` **${crop.charAt(0).toUpperCase() + crop.slice(1)}**` : "";
  return {
    text: hi
      ? `🩺 ${cropPart} पर **${disease.title}** — ${disease.hi}`
      : `🩺 ${cropPart} looks like **${disease.title}** — ${disease.en}`,
    matched: true,
    kind: "disease",
  };
};

const schemeAnswer = (hi: boolean): LocalAnswer => {
  const list = SCHEMES.map(
    (s, i) => `${i + 1}. **${s.name}** — ${hi ? s.hi : s.en}`
  ).join("\n");
  return {
    text: hi
      ? `📜 प्रमुख किसान योजनाएं:\n\n${list}\n\nविवरण व आवेदन हेतु विभागीय पोर्टल या CSC केंद्र से संपर्क करें।`
      : `📜 Top government schemes for farmers:\n\n${list}\n\nFor details/application, visit the official portal or your nearest CSC centre.`,
    matched: true,
    kind: "scheme",
  };
};

const cropAnswer = (crop: string, profile: FarmProfile, hi: boolean): LocalAnswer => {
  const guide = CROP_GUIDES[crop];
  if (guide) {
    const name = crop.charAt(0).toUpperCase() + crop.slice(1);
    const text = hi
      ? `🌱 **${name}** की खेती सारांश\n\n- खाद: ${guide.basal}\n- उपराई: ${guide.topDress}\n- सिंचाई: ${guide.irrigation}\n- मुख्य कीट/रोग: ${guide.pests.join(", ")}\n- कटाई: ${guide.harvestTip}\n\nअधिक जानने के लिए पूछें: "${name} खाद मात्रा", "${name} सिंचाई", "${name} मंडी भाव"।`
      : `🌱 **${name}** cultivation summary\n\n- Fertilizer: ${guide.basal}\n- Top dressing: ${guide.topDress}\n- Irrigation: ${guide.irrigation}\n- Key pests/diseases: ${guide.pests.join(", ")}\n- Harvest: ${guide.harvestTip}\n\nAsk me: "${name} fertilizer dose", "${name} irrigation", "${name} mandi price".`;
    return { text, matched: true, kind: "crop" };
  }
  return {
    text: hi
      ? `मेरे पास **${crop}** का विस्तृत गाइड अभी नहीं है, लेकिन आप इसकी खाद, सिंचाई, कीट या मंडी भाव पूछ सकते हैं।`
      : `I don't have a detailed guide for **${crop}** yet, but you can ask about its fertilizer, irrigation, pests or mandi price.`,
    matched: true,
    kind: "crop",
  };
};

const hasFertilizerIntent = (q: string) =>
  ["fertilizer", "khād", "खाद", "npk", "urea", "यूरिया", "dose", "मात्रा", "आधार", "basal", "top dressing", "उपराई"].some((k) => q.includes(k));

const hasIrrigationIntent = (q: string) =>
  ["irrigat", "water", "सिंचाई", "पानी", "कब करूं"].some((k) => q.includes(k));

const hasPestIntent = (q: string) =>
  ["pest", "कीट", "insect", "इल्ली", "बग", "bug", "keet", "कीड़े"].some((k) => q.includes(k));

const hasDiseaseIntent = (q: string) =>
  ["disease", "रोग", "leaf", "पत्ती", "yellow", "पीली", "spot", "धब्बे", "wilt", "रोगी", "black spot", "blight"].some((k) => q.includes(k));

const hasSchemeIntent = (q: string) =>
  ["scheme", "योजना", "subsidy", "सब्सिडी", "govt", "government", "pm-kisan", "pmkisan", "kcc", "loan", "कर्ज", "बीमा", "insurance", "yojana"].some((k) => q.includes(k));

const GREETING_WORDS = [
  "namaste", "namaskar", "pranam", "hello", "hi", "hey", "hola",
  "नमस्ते", "नमस्कार", "प्रणाम", "राम राम", "ram ram", "जय जवान", "जय किसान"
];

const isGreetingIntent = (q: string) => {
  const trimmed = q.trim().toLowerCase().replace(/[!.,?]/g, "");
  return GREETING_WORDS.some((w) => trimmed === w || trimmed === `${w} kisan ai` || trimmed === `${w} ai` || trimmed.startsWith(`${w} `));
};

export const getLocalAnswer = (query: string, profile: FarmProfile, lang?: string): LocalAnswer => {
  const hi = lang === "hi" || (lang !== "en" && (hasDevanagari(query) || isHinglish(query)));
  const q = query.toLowerCase().trim();

  // 1. Natural greeting without unsolicited crop dumps
  if (isGreetingIntent(q)) {
    const greetingText = hi
      ? "Namaste! 👋 Main Kisan AI hoon. Aap kheti, fasal, mandi bhav, mausam, rog, khaad, sinchai ya sarkari yojana ke baare mein pooch sakte hain."
      : "Hello! 👋 I am Kisan AI. You can ask me about crops, live mandi prices, weather, pests, fertilizers, irrigation, or government schemes.";
    return { text: greetingText, matched: true, kind: "general" };
  }

  const crop = detectCrop(q);

  // 2. Mandi price inquiry
  if (hasMandiIntent(q)) {
    const target = crop || profile.crop.toLowerCase().split("(")[0].trim();
    return mandiAnswer(target, hi);
  }

  // 3. Vague spray / medicine inquiry without specified crop
  if ((q === "spray" || q === "spray batao" || q === "दवा बताओ" || q === "dawa batao") && !crop) {
    const text = hi
      ? "Kaunsi fasal ke liye spray chahiye? Kripya fasal ka naam batayein. 🌱"
      : "Which crop do you need the spray recommendation for? Please specify the crop. 🌱";
    return { text, matched: true, kind: "pest" };
  }

  // 4. Specific farming categories
  if (hasSchemeIntent(q)) return schemeAnswer(hi);
  if (hasFertilizerIntent(q)) return fertilizerAnswer(crop, profile, hi);
  if (hasIrrigationIntent(q)) return irrigationAnswer(crop, profile, hi);
  if (hasPestIntent(q)) {
    const pest = findPest(q);
    if (pest) return pestAnswer(pest, hi);
    return pestAnswer(crop || "pest", hi);
  }
  if (hasDiseaseIntent(q)) {
    const disease = findDisease(q);
    if (disease) return diseaseAnswer(disease, crop, hi);
  }
  if (crop) return cropAnswer(crop, profile, hi);

  return { text: FALLBACK_GENERAL[hi ? "hi" : "en"], matched: false, kind: "general" };
};
