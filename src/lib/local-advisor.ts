import type { FarmProfile } from "@/contexts/FarmContext";
import { getMandiPriceQuote } from "./mandi-api";
import { extractEntities, CROP_DICTIONARY } from "@/core/voice/entities";
import { detectLanguageOf, langLabel } from "@/core/voice/language";

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
  गेहूं: "wheat", गेहू: "wheat", सोयाबीन: "soybean", कपास: "cotton", प्याज: "onion",
  टमाटर: "tomato", आलू: "potato", सरसों: "mustard", मक्का: "maize",
  चावल: "rice", धान: "rice", गन्ना: "sugarcane", मिर्च: "chilli",
  चना: "gram", मूंगफली: "groundnut", लहसुन: "garlic", हल्दी: "turmeric",
  धनिया: "coriander", केला: "banana", आम: "mango", अरहर: "arhar", मूंग: "lentils"
};

const HINGLISH_WORDS = [
  "kya", "hai", "hain", "kaise", "kare", "karna", "ka", "ki", "ke", "ko", "me", "mein",
  "bhav", "bhaav", "rate", "kheti", "dawa", "dawai", "khad", "paani", "pani",
  "rog", "kida", "keeda", "beej", "kitna", "kitni", "konsi", "kaunsi", "kab",
  "kaha", "kahan", "batao", "bataiye", "bhai", "namaste", "pranam", "fasal",
  "patta", "patti", "peela", "sukha", "kharif", "rabi", "mandi", "tamatr", "tamatar",
  "aalu", "aloo", "pyaj", "pyaz", "gehu", "gehun", "chana", "sarson", "mirch", "lahsun",
  "bhaiya", "madad", "help", "samasya", "kharab", "bachav", "tarika", "kyu", "kyon", "karen"
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
  termite: {
    en: "Organic: Calotropis (aak) extract or neem cake 100 kg/acre. Chemical: Chlorpyrifos 20 EC @ 2.5 L/acre with irrigation water.",
    hi: "जैविक: आक का अर्क या नीम की खली 100 किग्रा/एकड़। रासायनिक: क्लोरपायरीफॉस 20 EC 2.5 ली/एकड़ सिंचाई के साथ।",
  },
};

const PEST_KEYWORDS: Record<string, Array<{ en?: string; hi?: string }>> = {
  aphid: [{ en: "aphid" }, { hi: "माहू" }, { hi: "चेपा" }, { en: "mahu" }, { en: "chepa" }],
  whitefly: [{ en: "whitefly" }, { hi: "सफेद मक्खी" }, { en: "safed makkhi" }, { en: "safed makhi" }],
  bollworm: [{ en: "bollworm" }, { hi: "गुलाबी सुंडी" }, { en: "sundi" }, { en: "gulabi sundi" }],
  caterpillar: [{ en: "caterpillar" }, { hi: "इल्ली" }, { hi: "सुंडी" }, { en: "illi" }],
  thrips: [{ en: "thrips" }, { hi: "थ्रिप्स" }],
  mite: [{ en: "mite" }, { hi: "मकड़ी" }, { en: "makdi" }],
  "fall armyworm": [{ en: "armyworm" }, { en: "fall armyworm" }, { hi: "फॉल आर्मीवॉर्म" }, { hi: "लश्करी इल्ली" }],
  leafminer: [{ en: "leafminer" }, { en: "leaf miner" }, { hi: "लीफमाइनर" }, { hi: "चित्रित इल्ली" }],
  termite: [{ en: "termite" }, { hi: "दीमक" }, { en: "deemak" }, { en: "dimak" }],
};

interface DiseaseInfo {
  title: string;
  symptoms: string[];
  en: string;
  hi: string;
}

const DISEASES: DiseaseInfo[] = [
  {
    title: "Leaf Rust (पीला/भूरा रतुआ)",
    symptoms: ["rust", "रतुआ", "yellow dust", "brown pustule", "ratua", "peela ratua"],
    en: "Spray Propiconazole 25 EC (1 ml/L) or Tebuconazole (1 ml/L) at first sign. Avoid excess nitrogen.",
    hi: "शुरुआती लक्षण दिखते ही प्रोपिकोनाजोल 25 EC (1 मिली/लीटर) या टेबुकोनाजोल (1 मिली/लीटर) का छिड़काव करें। अधिक यूरिया न दें।",
  },
  {
    title: "Early/Late Blight (झुलसा रोग)",
    symptoms: ["blight", "झुलसा", "black spots with rings", "water soaked", "jhulsa"],
    en: "Foliar spray Mancozeb 75 WP (2 g/L) or Copper Oxychloride (2.5 g/L). For late blight, use Metalaxyl + Mancozeb (2 g/L).",
    hi: "मैनकोजेब 75 WP (2 ग्राम/लीटर) या कॉपर ऑक्सीक्लोराइड (2.5 ग्राम/लीटर) का छिड़काव करें। पछेती झुलसा के लिए मेटालैक्सिल + मैनकोजेब (2 ग्राम/लीटर) दें।",
  },
  {
    title: "Powdery Mildew (चूर्णिल आसिता/सफेद फफूंद)",
    symptoms: ["powdery", "mildew", "white powder", "सफेद पाउडर", "चूर्णिल", "safed fafund"],
    en: "Spray Wettable Sulfur 80 WP (3 g/L) or Hexaconazole 5 EC (1 ml/L). Maintain good air circulation.",
    hi: "घुलनशील सल्फर 80 WP (3 ग्राम/लीटर) या हेक्साकोनाजोल 5 EC (1 मिली/लीटर) का स्प्रे करें। पौधों के बीच हवा का संचार रखें।",
  },
  {
    title: "Wilting / Root Rot (उकठा/जड़ सड़न)",
    symptoms: ["wilt", "root rot", "ukatha", "उकठा", "सूख रहा", "drooping", "stem rot"],
    en: "Soil drench Trichoderma viride (10 g/L) organic, or Carbendazim (1 g/L) near root zone. Improve drainage.",
    hi: "जड़ों के पास ट्राइकोडर्मा विरिडी (10 ग्राम/लीटर) जैविक या कार्बेन्डाजिम (1 ग्राम/लीटर) का घोल डालें। खेत से पानी की निकासी सुधारें।",
  },
  {
    title: "Leaf Curl Virus (पत्ती मरोड़)",
    symptoms: ["curl", "मरोड़", "churda", "leaf curl", "shrivelled", "curling"],
    en: "Vector-borne viral disease spread by whiteflies. Spray Thiamethoxam 0.2 g/L to control vector + install yellow traps.",
    hi: "यह सफेद मक्खी से फैलने वाला वायरस है। थियामेथोक्सम 0.2 ग्राम/लीटर का स्प्रे करें और पीले चिपचिपे कार्ड लगाएं।",
  },
];

const SCHEMES = [
  {
    name: "PM-Kisan Samman Nidhi",
    hi: "₹6,000 प्रति वर्ष (₹2,000 की 3 किस्तों में) सीधे बैंक खाते में।",
    en: "₹6,000 per year (in 3 installments of ₹2,000) directly into Aadhaar-linked bank accounts.",
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    hi: "फसल क्षति (सूखा, बाढ़, ओलावृष्टि) पर 1.5%–2% प्रीमियम पर संपूर्ण बीमा कवरेज।",
    en: "Comprehensive crop insurance against drought, floods, hail at just 1.5%–2% farmer premium.",
  },
  {
    name: "Kisan Credit Card (KCC)",
    hi: "₹3 लाख तक का कृषि ऋण मात्र 4% ब्याज दर पर (समय पर भुगतान पर 3% की छूट)।",
    en: "Low-interest agricultural loan up to ₹3 lakh at 4% effective interest rate (with 3% prompt repayment rebate).",
  },
  {
    name: "PM Kusum Yojana",
    hi: "खेतों में सोलर पंप लगाने पर 60% से 90% तक सरकारी सब्सिडी।",
    en: "60% to 90% government subsidy for installing solar-powered irrigation agricultural pumps.",
  },
];

const CLIMATE_ADVISORIES = {
  frost: {
    en: "❄️ **Frost & Cold Wave Crop Protection Advisory (पाला व ठंड से बचाव)**:\n\n1. **Evening Light Irrigation**: Irrigate fields lightly in the evening. Wet soil retains warmth and elevates field canopy temp by 1–2°C.\n2. **Smoke Cover**: Burn dry straw/weeds on the north-west field border at night to create an insulating smoke blanket.\n3. **Sulfur Spray**: Spray 0.1% commercial sulfuric acid (1 ml/L) or soluble Sulfur 80% WP (3 g/L) to build plant cold resistance.\n4. **Cover Nursery/Vegetables**: Cover tender vegetables and nursery seedlings with thatch or plastic sheets overnight.",
    hi: "❄️ **पाला व शीतलहर से फसल बचाव की सलाह**:\n\n1. **शाम को हल्की सिंचाई**: शाम के समय खेत में हल्की सिंचाई करें। नम मिट्टी गर्मी रोकती है और तापमान 1-2°C बढ़ा देती है।\n2. **धुआं करना**: रात के समय खेत की उत्तर-पश्चिम दिशा में सूखी घास-फूस जलाकर धुआं करें ताकि खेत पर सुरक्षा चादर बन जाए।\n3. **सल्फर/गंधक स्प्रे**: 0.1% गंधक का तेजाब (1 मिली प्रति लीटर पानी) या घुलनशील सल्फर 80% WP (3 ग्राम/लीटर) का छिड़काव करें।\n4. **सब्जियों को ढकना**: नर्सरी व सब्जी फसलों को पुआल या प्लास्टिक शीट से रात में ढकें।",
  },
  heatwave: {
    en: "☀️ **Heatwave & Summer Crop Care Advisory (गर्मी व लू से बचाव)**:\n\n1. **Frequent Light Irrigation**: Use drip systems or early morning irrigations to prevent heat stress.\n2. **Organic Mulching**: Spread 3-inch straw/crop residue mulch to reduce soil moisture evaporation by up to 50%.\n3. **Potassium Spray**: Spray 1% Potassium Nitrate (13:0:45) @ 10 g/L to improve plant water retention and drought tolerance.",
    hi: "☀️ **भीषण गर्मी व लू से फसल बचाव की सलाह**:\n\n1. **सुबह हल्की सिंचाई**: तेज धूप निकलने से पहले सुबह या शाम को ड्रिप/हल्की सिंचाई करें।\n2. **मल्चिंग (पुआल की परत)**: खेत में 3 इंच पुआल या भूसे की परत बिछाएं, इससे नमी 50% तक सुरक्षित रहती है।\n3. **पोटैशियम स्प्रे**: 13:0:45 (पोटैशियम नाइट्रेट) 10 ग्राम प्रति लीटर का छिड़काव करें जिससे पौधा गर्मी सहन कर सके।",
  },
  organic: {
    en: "🌱 **Organic Farming & Bio-Control Guide (जैविक खेती एवं प्राकृतिक उपचार)**:\n\n1. **Jeevamrit Formulation**: Mix 10 kg desi cow dung + 10 L cow urine + 2 kg jaggery + 2 kg gram flour + handful farm soil in 200 L water. Ferment for 48 hours and apply 200 L/acre with irrigation.\n2. **Neem Pest Repellent**: Spray Neem Oil 1500 PPM @ 5 ml/L with 1 ml liquid soap as a broad-spectrum organic insect deterrent.\n3. **Bio-Fungicide**: Use Trichoderma viride @ 5 g/L for root/soil fungal diseases and seed treatment.",
    hi: "🌱 **प्राकृतिक एवं जैविक खेती गाइड**:\n\n1. **जीवामृत तैयार करना**: 200 लीटर पानी में 10 किलो देसी गाय का गोबर + 10 लीटर गोमूत्र + 2 किलो गुड़ + 2 किलो बेसन + मुट्ठी भर खेत की मिट्टी मिलाएं। 48 घंटे बाद प्रति एकड़ 200 लीटर सिंचाई के साथ दें।\n2. **नीम कीटनाशक**: 1500 PPM नीम का तेल (5 मिली प्रति लीटर) थोड़े साबुन के घोल के साथ मिलाकर स्प्रे करें।\n3. **जैविक फफूंदनाशक**: ट्राइकोडर्मा विरिडी (5 ग्राम/लीटर) का उपयोग बीज शोधन और जड़ सड़न से बचाव के लिए करें।",
  },
  soilTest: {
    en: "🧪 **Soil Testing (Mitti Janch) Guide**:\n\n1. Take 'V' shaped soil cuts 15 cm deep from 8–10 spots across your field.\n2. Mix all samples thoroughly, discard excess by quartering until 500 grams remains.\n3. Dry in shade, pack in a clean bag, and submit to your local KVK or Agriculture Department.\n4. You will receive a Soil Health Card with precise N-P-K, pH, and Micronutrient fertilizer requirements.",
    hi: "🧪 **खेत की मिट्टी जांच (Soil Testing) कैसे कराएं**:\n\n1. खेत में 8-10 अलग-अलग स्थानों से 'V' आकार में 15 सेमी (6 इंच) गहराई तक मिट्टी निकालें।\n2. सभी मिट्टी को साफ तिरपाल पर अच्छी तरह मिलाएं और 500 ग्राम का एक नमूना तैयार करें।\n3. छाया में सुखाकर साफ थैली में भरें और नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि कार्यालय में जमा करें।\n4. रिपोर्ट में N-P-K, जिंक, सल्फर व pH की सटीक मात्रा के आधार पर खाद डालने की पर्ची मिलेगी।",
  }
};

const FALLBACK_MESSAGES: Record<string, string> = {
  hi: "नमस्ते किसान भाई! 🙏 मैं Kisan AI (किसान सहायक) हूँ। आप मुझसे किसी भी फसल की खाद मात्रा, बुआई, सिंचाई, कीट व रोग उपचार, मंडी भाव, मौसम या सरकारी योजनाओं के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
  en: "Hello farmer friend! 🙏 I am Kisan AI (Kisan Sahayak). You can ask me about crop fertilizer doses, sowing, irrigation schedules, pest & disease control, live mandi prices, weather forecasts, or government schemes. How can I assist you today?",
  mr: "नमस्कार शेतकरी बंधू! 🙏 मी किसान AI (किसान सहाय्यक) आहे. आपण मला खत व्यवस्थापन, पेरणी, पाणी व्यवस्थापन, कीड-रोग नियंत्रण, बाजार भाव, हवामान किंवा सरकारी योजनांबद्दल विचारू शकता.",
  gu: "નમસ્તે ખેડૂત મિત્ર! 🙏 હું કિસાન AI (કિસાન સહાયક) છું. તમે મને ખાતર વ્યવસ્થાપન, વાવણી, સિંચાઈ, રોગ-જીવાત નિયંત્રણ, બજાર ભાવ, હવામાન અથવા સરકારી યોજનાઓ વિશે પૂછી શકો છો.",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰੋ! 🙏 ਮੈਂ ਕਿਸਾਨ AI (ਕਿਸਾਨ ਸਹਾਇਕ) ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਖਾਦ ਦੀ ਮਾਤਰਾ, ਬਿਜਾਈ, ਸਿੰਚਾਈ, ਕੀੜੇ-ਮਕੌੜਿਆਂ ਦੀ ਰੋਕਥਾਮ, ਮੰਡੀ ਦੇ ਭਾਅ, ਮੌਸਮ ਜਾਂ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
  bn: "নমস্কার কৃষক বন্ধু! 👋 আমি কিষাণ AI (কিষাণ সহায়ক)। আপনি আমাকে ফসলের সার প্রয়োগ, বপন, সেচ, রোগ ও কীটনাশক, মান্ডি দর, আবহাওয়া বা সরকারি প্রকল্প সম্পর্কে জিজ্ঞাসা করতে পারেন।",
  ta: "வணக்கம் விவசாய தோழரே! 🙏 நான் கிசான் AI (விவசாய உதவியாளர்). உரம், விதைப்பு, நீர்ப்பாசனம், பூச்சி நோய் மேலாண்மை, மண்டி விலை, வானிலை அல்லது அரசு திட்டங்கள் பற்றி என்னிடம் கேட்கலாம்.",
  te: "నమస్కారం రైతు మిత్రమా! 🙏 నేను కిసాన్ AI (రైతు సహాయక్). ఎరువుల యాజమాన్యం, విత్తనం, సాగునీరు, తెగుళ్ల నివారణ, మార్కెట్ ధరలు, వాతావરણం లేదా ప్రభుత్వ పథకాల గురించి నన్ను అడగవచ్చు.",
  kn: "ನಮಸ್ಕಾರ ರೈತ ಮಿತ್ರರೇ! 🙏 ನಾನು ಕಿಸಾನ್ AI (ಕಿಸಾನ್ ಸಹಾಯಕ). ಗೊಬ್ಬರ ನಿರ್ವಹಣೆ, ಬಿತ್ತನೆ, ನೀರಾವರಿ, ಕೀಟ-ರೋಗ ನಿಯಂತ್ರಣ, ಮಂಡಿ ದರ, ಹವಾಮಾನ ಅಥವಾ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು.",
  ml: "നമസ്കാരം കർഷക സുഹൃത്തേ! 🙏 ഞാൻ കിസാൻ AI (കിസാൻ സഹായക്) ആണ്. വളപ്രയോഗം, വിതയ്ക്കൽ, നനയ്ക്കൽ, കീട-രോഗ നിയന്ത്രണം, വിപണി വില, കാലാവസ്ഥ, സർക്കാർ പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കാം.",
  or: "ନମସ୍କାର କୃଷକ ଭାଇ! 🙏 ମୁଁ କିଷାନ AI (କିଷାନ ସହାୟକ)। ଆପଣ ମୋତେ ସାର ପ୍ରୟୋଗ, ମଣ୍ଡି ଦର, ପାଣିପାଗ, ରୋଗ ପୋକ ନିୟନ୍ତ୍ରଣ କିମ୍ବା ସରକାରୀ ଯୋଜନା ବିଷୟରେ ପଚାରିପାରିବେ।",
  as: "নমস্কাৰ কৃষক ভাই! 🙏 মই কিষাণ AI (কিষাণ সহায়ক)। আপুনি মোক সাৰ ব্যৱস্থাপনা, বজাৰৰ দৰ, বতৰ, কীট-পতংগ নিয়ন্ত্ৰণ বা চৰকাৰী আঁচনি সম্পৰ্কে সুধিব পাৰে।",
};

const detectCrop = (query: string): string | null => {
  const entity = extractEntities(query);
  if (entity.crop) return entity.crop;

  for (const [stem, guideKey] of Object.entries(MANDI_CROP_STEMS)) {
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i');
    if (regex.test(query)) return guideKey;
  }
  for (const [hiName, stem] of Object.entries(HINDI_CROP_ALIASES)) {
    const escaped = hiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i');
    if (regex.test(query)) return stem;
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

const KNOWN_MANDIS = [
  "indore", "ujjain", "dewas", "bhopal", "mandsaur", "neemuch", "kota", "jaipur",
  "bikaner", "bharatpur", "lasalgaon", "nashik", "pune", "mumbai", "solapur",
  "jalgaon", "ratnagiri", "latur", "karnal", "ludhiana", "amritsar", "delhi",
  "azadpur", "agra", "varanasi", "meerut", "nizamabad", "guntur", "kolar",
  "rajkot", "gondal", "mehsana", "unjha", "shimla", "kozhikode", "kochi", "kolkata"
];

const extractMandiLocation = (q: string): string | null => {
  const norm = q.toLowerCase();
  for (const m of KNOWN_MANDIS) {
    if (norm.includes(m)) return m;
  }
  return null;
};

const mandiAnswer = (crop: string, hi: boolean, isHinglish = false, rawQuery = ""): LocalAnswer => {
  const mandi = extractMandiLocation(rawQuery);
  const quote = getMandiPriceQuote({ crop, mandi });

  if (!quote.found) {
    const fallbackText = hi
      ? `अभी **${crop}** का लाइव मंडी भाव उपलब्ध नहीं है। कृपया Mandi Bhav टैब में चेक करें।`
      : `Live mandi price for **${crop}** is currently unavailable. Please check the Mandi Bhav tab.`;
    return { text: fallbackText, matched: true, kind: "mandi" };
  }

  if (quote.needsMandiClarification) {
    const clarifyText = hi
      ? (isHinglish ? quote.messageHinglish : quote.messageHi)
      : quote.messageEn;
    return { text: clarifyText, matched: true, kind: "mandi" };
  }

  const resultText = hi
    ? (isHinglish ? quote.messageHinglish : quote.messageHi)
    : quote.messageEn;

  return { text: resultText, matched: true, kind: "mandi" };
};

const fertilizerAnswer = (crop: string | null, profile: FarmProfile, hi: boolean): LocalAnswer => {
  const name = crop || profile.crop.toLowerCase().split("(")[0].trim();
  const guide = CROP_GUIDES[name] || CROP_GUIDES[profile.crop.toLowerCase()];
  if (guide) {
    const text = hi
      ? `🧪 **${name.charAt(0).toUpperCase() + name.slice(1)}** के लिए खाद कार्यक्रम\n\n- बुआई के समय (आधार/Basal): ${guide.basal}\n- उपराई खाद (Top dressing): ${guide.topDress}\n\nयह मानक सिफारिश है — सटीक मात्रा मिट्टी परीक्षण (Soil Health Card) पर निर्भर करती है।`
      : `🧪 Fertilizer program for **${name.charAt(0).toUpperCase() + name.slice(1)}**\n\n- Basal (at sowing): ${guide.basal}\n- Top dressing: ${guide.topDress}\n\nThis is a standard recommendation — for precise doses, use your Soil Health Card report.`;
    return { text: text, matched: true, kind: "fertilizer" };
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
  ["fertilizer", "khād", "खाद", "npk", "urea", "यूरिया", "dose", "मात्रा", "आधार", "basal", "top dressing", "उपराई", "उर्वरक"].some((k) => q.includes(k));

const hasIrrigationIntent = (q: string) =>
  ["irrigat", "water", "सिंचाई", "पानी", "कब करूं", "pani"].some((k) => q.includes(k));

const hasPestIntent = (q: string) =>
  ["pest", "कीट", "insect", "इल्ली", "बग", "bug", "keet", "कीड़े", "कीड़ा", "kida", "keeda"].some((k) => q.includes(k));

const hasDiseaseIntent = (q: string) =>
  ["disease", "रोग", "leaf", "पत्ती", "yellow", "पीली", "spot", "धब्बे", "wilt", "रोगी", "black spot", "blight", "झुलसा", "रतुआ"].some((k) => q.includes(k));

const hasSchemeIntent = (q: string) =>
  ["scheme", "योजना", "subsidy", "सब्सिडी", "govt", "government", "pm-kisan", "pmkisan", "kcc", "loan", "कर्ज", "बीमा", "insurance", "yojana"].some((k) => q.includes(k));

const hasCropGuideIntent = (q: string, directCrop: string | null) => {
  if (!directCrop) return false;
  const directCropLower = directCrop.toLowerCase();
  const trimmed = q.trim().toLowerCase().replace(/[.,!?;:]/g, "");
  // If the query is solely the crop name (e.g. "wheat", "गेहूं", "tamatar", "tomato")
  if (trimmed === directCropLower || trimmed === `crop ${directCropLower}` || trimmed === `${directCropLower} crop`) return true;
  // If the query asks for cultivation / guide / farming / details
  return ["kheti", "खेती", "cultivation", "guide", "farming", "sowing", "care", "dekhbhal", "देखभाल", "jankari", "जानकारी", "samagri", "overview", "summary", "saransh", "सारांश", "tips", "kaise ugaye", "kaise kare", "growing", "production", "paidaavar", "पैदावार", "advice", "advise", "सलाह", "suggestion", "sujhav", "सुझाव"].some((k) => q.includes(k));
};

const GREETING_WORDS = [
  "namaste", "namaskar", "pranam", "hello", "hi", "hey", "hola",
  "नमस्ते", "नमस्कार", "प्रणाम", "राम राम", "ram ram", "जय जवान", "जय किसान",
  "सत श्री अकाल", "வணக்கம்", "నమస్కారం", "ನಮಸ್ಕಾರ", "നമസ്കാരം", "নমস্কার", "ନମସ୍କାର", "নমস্কাৰ"
];

const isGreetingIntent = (q: string) => {
  const trimmed = q.trim().toLowerCase().replace(/[!.,?]/g, "");
  return GREETING_WORDS.some((w) => trimmed === w || trimmed === `${w} kisan ai` || trimmed === `${w} ai` || trimmed.startsWith(`${w} `));
};

export const getLocalAnswer = (
  query: string,
  profile: FarmProfile,
  lang?: string,
  history?: Array<{ role: string; content: string }>
): LocalAnswer => {
  const q = query.toLowerCase().trim();
  const detected = detectLanguageOf(query);
  const isDevanagari = hasDevanagari(query);
  const isHinglishQuery = isHinglish(query) || isHinglish(q);

  // Normalize effective target language code
  const targetCode = (lang && lang.length >= 2)
    ? lang.slice(0, 2).toLowerCase()
    : (detected.lang || "en");

  const hi = targetCode === "hi" || isDevanagari || isHinglishQuery;

  // Multi-turn context resolution:
  let crop = detectCrop(q);
  const mandiInQuery = extractMandiLocation(q);

  // ONLY inherit crop from history if the user's current query has pronoun/follow-up intent or specifies a mandi location
  const isFollowUpQuery = Boolean(mandiInQuery) || ["isme", "is me", "ismein", "ispe", "is par", "iska", "iski", "iske", "is fasal", "isse", "इसमे", "इसमें", "इसकी", "इसका", "इसके", "for this", "in this", "its"].some((w) => q.includes(w));
  if (!crop && isFollowUpQuery && history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const prev = history[i].content;
      const prevCrop = detectCrop(prev);
      if (prevCrop) {
        crop = prevCrop;
        break;
      }
    }
  }

  // 1. Natural greeting without unsolicited crop dumps
  if (isGreetingIntent(q)) {
    const greetingText = FALLBACK_MESSAGES[targetCode] || (hi ? FALLBACK_MESSAGES.hi : FALLBACK_MESSAGES.en);
    return { text: greetingText, matched: true, kind: "general" };
  }

  // 1a. User identity / Name query ("mera naam kya hai", "who am i", "my name")
  if (["mera naam", "mera name", "my name", "who am i", "who i am", "kaun hu", "kaun hoon", "मेरा नाम", "मैं कौन हूं", "मैं कौन हूँ"].some((w) => q.includes(w))) {
    const name = (profile as any).farmerName || profile.crop ? ((profile as any).farmerName || (profile as any).name || (profile as any).fullName || "") : "";
    const loc = (profile as any).village || (profile as any).district || (profile as any).state || "";
    const primaryCrop = profile.crop || "";
    if (name) {
      const text = hi
        ? `नमस्ते किसान साथी! 🙏 AgriConnect प्रोफाइल के अनुसार आपका नाम **${name}** है।${loc ? ` आप **${loc}** क्षेत्र से हैं।` : ""}${primaryCrop ? ` आपकी मुख्य फसल **${primaryCrop}** है।` : ""}`
        : `Hello farmer friend! 🙏 According to your AgriConnect profile, your name is **${name}**.${loc ? ` Region: **${loc}**.` : ""}${primaryCrop ? ` Primary crop: **${primaryCrop}**.` : ""}`;
      return { text, matched: true, kind: "general" };
    } else {
      const text = hi
        ? "नमस्ते किसान भाई! 🙏 आपका नाम अभी प्रोफाइल में दर्ज नहीं है। आप प्रोफाइल (Profile) सेक्शन में जाकर अपना नाम जोड़ सकते हैं!"
        : "Hello farmer friend! 🙏 Your name is not yet registered in your profile. You can add your name in the Profile section anytime!";
      return { text, matched: true, kind: "general" };
    }
  }

  // 1b. Appreciation / Thank you
  if (["dhanyawad", "dhanyavad", "shukriya", "thank", "thanks", "धन्यवाद", "शुक्रिया", "बहुत अच्छा", "bohot accha"].some((w) => q.includes(w))) {
    const thankText = hi
      ? "आपका स्वागत है किसान साथी! 🙏 किसी भी अन्य फसल समस्या या सलाह के लिए बेझिझक पूछें। जय जवान, जय किसान! 🌾"
      : "You're most welcome, farmer friend! 🙏 Feel free to ask anytime for any crop advisory or agricultural assistance. Happy farming! 🌾";
    return { text: thankText, matched: true, kind: "general" };
  }

  // 1c. Frost / Cold Wave / Pala Advisory
  if (["pala", "पाला", "frost", "cold wave", "sardi", "thand", "ठंड", "शीतलहर"].some((w) => q.includes(w))) {
    return { text: CLIMATE_ADVISORIES.frost[hi ? "hi" : "en"], matched: true, kind: "crop" };
  }

  // 1d. Heatwave / Summer Crop Care
  if (["heatwave", "heat wave", "garmi", "गर्मी", "लू", "loo", "drought", "सूखा"].some((w) => q.includes(w))) {
    return { text: CLIMATE_ADVISORIES.heatwave[hi ? "hi" : "en"], matched: true, kind: "crop" };
  }

  // 1e. Organic Farming & Bio-fertilizer
  if (["organic", "जैविक", "jeevamrit", "जीवामृत", "neem oil", "नीम तेल", "vermicompost", "केंचुआ खाद", "trichoderma", "ट्राइकोडर्मा"].some((w) => q.includes(w))) {
    return { text: CLIMATE_ADVISORIES.organic[hi ? "hi" : "en"], matched: true, kind: "fertilizer" };
  }

  // 1f. Soil Health & Testing (Use whole word matching for pH and testing)
  if (["soil", "mitti", "मिट्टी", "janch", "जांच", "testing", "परीक्षण"].some((w) => q.includes(w)) || /\bph\b/i.test(q)) {
    return { text: CLIMATE_ADVISORIES.soilTest[hi ? "hi" : "en"], matched: true, kind: "scheme" };
  }

  // 1g. Hyperlocal Weather Advice
  if (["weather", "mausam", "मौसम", "barish", "बारिश", "rain", "temperature", "तापमान"].some((w) => q.includes(w))) {
    const weatherText = hi
      ? "🌤️ **मौसम व छिड़काव सलाह**:\n\n• अपने क्षेत्र का सटीक तापमान, वर्षा पूर्वानुमान और छिड़काव अनुकूलता (Spray Window) देखने के लिए होम स्क्रीन पर **Live Weather** कार्ड देखें।\n• नियम: तेज़ हवा (15 किमी/घंटा से अधिक) या बारिश की संभावना होने पर कीटनाशक या खरपतवारनाशक का छिड़काव न करें।"
      : "🌤️ **Hyperlocal Weather & Spray Advisory**:\n\n• Check the **Live Weather** widget on your Home screen for real-time temperature, rain radar, humidity, and safe spray windows.\n• General rule: Never spray pesticides or foliar nutrition if winds exceed 15 km/h or rainfall is predicted within 6 hours.";
    return { text: weatherText, matched: true, kind: "general" };
  }

  const hinglishMode = isHinglish(query) || isHinglish(q);

  // 2. Mandi price inquiry (or if user provided mandi name following a crop question)
  if (hasMandiIntent(q) || (mandiInQuery && crop)) {
    if (!crop) {
      const text = hi
        ? (hinglishMode ? "Kaunsi fasal ka mandi bhav chahiye? Kripya fasal ka naam batayein (jaise: Tamatar, Gehu, Soyabean, Sarson, Pyaz)." : "किस फसल का मंडी भाव चाहिए? कृपया फसल का नाम बताएं (जैसे: टमाटर, गेहूं, सोयाबीन, सरसों, प्याज)।")
        : "Which crop's mandi price do you need? Please specify the crop (e.g. Tomato, Wheat, Soybean, Mustard, Onion).";
      return { text, matched: true, kind: "mandi" };
    }
    return mandiAnswer(crop, hi, hinglishMode, q);
  }

  // 3. Pest diagnosis & remedies (check specific pest first)
  const pestMatch = findPest(q);
  if (pestMatch) {
    return pestAnswer(pestMatch, hi);
  }

  // 4. Disease diagnosis & remedies (check specific disease first)
  const diseaseMatch = findDisease(q);
  if (diseaseMatch) {
    return diseaseAnswer(diseaseMatch, crop, hi);
  }

  // 5. Vague spray / medicine inquiry without specified crop
  if ((q === "spray" || q === "spray batao" || q === "दवा बताओ" || q === "dawa batao" || q === "keeda lag gaya" || q === "कीड़ा लग गया") && !crop) {
    const text = hi
      ? "Kaunsi fasal ke liye spray chahiye? Kripya fasal ka naam batayein (jaise: Tamatar, Gehu, Kapas, Dhan). 🌱"
      : "Which crop do you need the spray recommendation for? Please specify the crop (e.g. Tomato, Wheat, Cotton, Rice). 🌱";
    return { text, matched: true, kind: "pest" };
  }

  // 6. Specific farming categories
  if (hasSchemeIntent(q)) return schemeAnswer(hi);
  if (hasFertilizerIntent(q)) return fertilizerAnswer(crop, profile, hi);
  if (hasIrrigationIntent(q)) return irrigationAnswer(crop, profile, hi);
  if (hasPestIntent(q)) return pestAnswer(crop || "pest", hi);
  if (hasDiseaseIntent(q)) return diseaseAnswer(findDisease(q) || DISEASES[0], crop, hi);

  // 7. Crop cultivation guide ONLY if user explicitly asked for crop guide
  if (crop && hasCropGuideIntent(q, crop)) {
    return cropAnswer(crop, profile, hi);
  }

  // 8. General conversational fallback (in user's detected / selected language)
  const generalText = FALLBACK_MESSAGES[targetCode] || (hi ? FALLBACK_MESSAGES.hi : FALLBACK_MESSAGES.en);
  return { text: generalText, matched: false, kind: "general" };
};
