import type { FarmProfile } from "@/contexts/FarmContext";
import { getMandiPriceQuote } from "./mandi-api";
import { extractEntities, CROP_DICTIONARY } from "@/core/voice/entities";

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
    symptoms: ["blight", "early blight", "late blight", "brown spot", "brownspot", "leaf spot", "dark spot", "blotch", "झुलसा", "अगेती झुलसा", "पछेती झुलसा", "धब्बे"],
    title: "Leaf Blight / Leaf Spot (झुलसा व पत्ती धब्बा रोग)",
    en: "Looks like a fungal leaf blight or leaf spot. Recommended spray: Mancozeb 75% WP @ 2.5 g/L or Copper Oxychloride 50% WP @ 3 g/L. For late blight, apply Metalaxyl 8% + Mancozeb 64% (Ridomil) @ 2 g/L. Avoid overhead irrigation and ensure good aeration.",
    hi: "यह फंगल पत्ती झुलसा (अगेती/पछेती) या धब्बा रोग है। अनुशंसित उपचार: मैंकोजेब 75% WP (2.5 ग्रा/लीटर) या कॉपर ऑक्सीक्लोराइड 50% WP (3 ग्रा/लीटर) का छिड़काव करें। पछेती झुलसा के लिए मेटालैक्सिल + मैंकोजेब (रिडोमिल) 2 ग्रा/लीटर का छिड़काव करें।",
  },
  {
    symptoms: ["powdery", "white powder", "white coating", "white patina", "सफेद चूर्ण", "चूर्ण", "पाउडरी"],
    title: "Powdery Mildew (चूर्णिल आसिता / सफेद फफूंद)",
    en: "Classic powdery mildew — a white powdery coating on leaves and stems. Spray Hexaconazole 5% EC @ 1 ml/L or Wettable Sulfur 80% WP @ 3 g/L. Apply in the morning for best results.",
    hi: "यह पाउडरी मिल्ड्यू (सफेद चूर्ण रोग) है। उपचार: हेक्साकोनाज़ोल 5% EC (1 मिली/लीटर) या घुलनशील सल्फर 80% WP (3 ग्रा/लीटर) का छिड़काव करें। सुबह के समय छिड़काव अधिक असरदार रहता है।",
  },
  {
    symptoms: ["downy", "purple underside", "purple under leaf", "मृदुरोमिल"],
    title: "Downy Mildew (डाउनी मिल्ड्यू / मृदुरोमिल आसिता)",
    en: "Downy mildew causes yellow angular patches on upper leaf surface with a purplish-grey mould underneath. Spray Metalaxyl + Mancozeb @ 2 g/L or Cymoxanil + Mancozeb @ 2 g/L at 10-day intervals.",
    hi: "डाउनी मिल्ड्यू पत्तियों की ऊपरी सतह पर पीले कोणीय धब्बे और निचली सतह पर बैगनी-भूरी फफूंद बनाता है। उपचार: मेटालैक्सिल + मैंकोजेब 2 ग्रा/लीटर का 10 दिन के अंतर पर दो बार छिड़काव करें।",
  },
  {
    symptoms: ["rust", "yellow rust", "stripe rust", "orange pustule", "orange spots", "रतुआ", "पीला रतुआ", "गेरुआ"],
    title: "Yellow / Stripe Rust (गेहूं का पीला रतुआ)",
    en: "Yellow stripe rust shows linear yellow-orange spore pustules on leaves that leave yellow dust on fingers. Immediately spray Propiconazole 25% EC (Tilt) @ 1 ml/L of water. Repeat after 15 days if cloudy/cold weather persists.",
    hi: "यह पीला रतुआ (Yellow Rust) रोग है — पत्तियों पर पीले रंग की धारियां व पाउडर बनता है। तुरंत प्रोपिकोनाजोल 25% EC (टिल्ट) 1 मिली प्रति लीटर पानी में मिलाकर छिड़काव करें। 15 दिन बाद आवश्यकतानुसार दोहराएं।",
  },
  {
    symptoms: ["wilt", "droop", "drying from base", "stem rot", "root rot", "मुरझा", "सूख", "उकठा", "जड़ सड़न"],
    title: "Wilt & Root Rot (उकठा व जड़ सड़न रोग)",
    en: "Wilt is caused by soil-borne Fusarium fungi. Drench the root zone with Carbendazim 12% + Mancozeb 63% (Saaf) @ 2 g/L or bio-control Trichoderma viride @ 10 g/L. Ensure field drainage to prevent water stagnation.",
    hi: "उकठा (विल्ट) व जड़ सड़न मिट्टी जनित फंगस से होता है। उपचार: कार्बेन्डाजिम + मैंकोजेब (साफ) 2 ग्रा/लीटर या ट्राइकोडर्मा विरिडी 10 ग्रा/लीटर से पौधों की जड़ों के पास ड्रेंचिंग करें। खेत में जलभराव न होने दें।",
  },
  {
    symptoms: ["blast", "neck blast", "leaf blast", "diamond shaped", "ब्लास्ट", "गर्दन तोड़"],
    title: "Paddy Blast (धान का ब्लास्ट रोग)",
    en: "Blast causes spindle/diamond-shaped lesions with ash-grey centers on rice leaves and panicle neck. Spray Tricyclazole 75% WP @ 0.6 g/L (Baan) or Isoprothiolane 40% EC @ 1.5 ml/L. Avoid excessive urea application.",
    hi: "धान का ब्लास्ट रोग पत्तियों पर आंख/नाव जैसे धब्बे बनाता है। उपचार: ट्राइसाइक्लाजोल 75% WP (0.6 ग्रा/लीटर) या आइसोप्रोथियोलेन 40% EC (1.5 मिली/लीटर) का छिड़काव करें। यूरिया की अत्यधिक मात्रा से बचें।",
  },
  {
    symptoms: ["yellow", "yellowing", "chlorosis", "mosaic", "leaf curl", "curling", "पीली", "पीलापन", "मुड़ी", "मरोड़िया", "पर्ण कुंचन"],
    title: "Leaf Curl Virus & Vector Yellowing (पर्ण कुंचन व पीलापन)",
    en: "Leaf curling and yellowing is transmitted by sucking pests (whiteflies/thrips). Spray Imidacloprid 17.8% SL @ 0.5 ml/L or Acetamiprid 20% SP @ 0.5 g/L to control the vectors. Apply foliar 19:19:19 @ 5 g/L to restore plant vigor.",
    hi: "पत्तियों का मुड़ना और पीला पड़ना सफेद मक्खी व थ्रिप्स द्वारा फैलने वाले वायरस का लक्षण है। उपचार: इमिडाक्लोप्रिड 17.8% SL (0.5 मिली/लीटर) या एसिटामिप्रिड 20% SP का छिड़काव करें। पौधे में नई जान डालने हेतु 19:19:19 (5 ग्रा/लीटर) का स्प्रे करें।",
  },
];

interface SchemeInfo {
  name: string;
  en: string;
  hi: string;
}

const SCHEMES: SchemeInfo[] = [
  {
    name: "PM-Kisan Samman Nidhi (पीएम किसान सम्मान निधि)",
    en: "₹6,000/year directly transferred to farmers' bank accounts in 3 installments of ₹2,000 every 4 months. Verify eKYC on pmkisan.gov.in using Aadhaar OTP or biometric CSC centers.",
    hi: "किसानों को सालाना ₹6,000 सीधे बैंक खाते में (₹2000 की 3 किस्तों में)। pmkisan.gov.in पर आधार ओटीपी द्वारा ई-केवाईसी अवश्य पूर्ण करें।",
  },
  {
    name: "Pradhan Mantri Krishi Sinchai Yojana (PMKSY - ड्रिप व फव्वारा सब्सिडी)",
    en: "Provides up to 55% subsidy for small/marginal farmers and 45% for general farmers on Drip and Sprinkler irrigation systems. Apply through your state horticulture/agriculture portal.",
    hi: "ड्रिप और स्प्रिंकलर सिंचाई लगाने पर लघु व सीमांत किसानों को 55% तथा अन्य किसानों को 45% तक सरकारी सब्सिडी मिलती है। राज्य उद्यानिकी विभाग के पोर्टल पर आवेदन करें।",
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY - प्रधानमंत्री फसल बीमा)",
    en: "Comprehensive risk coverage against droughts, floods, and unseasonal rains. Farmer premium is only 2% for Kharif crops, 1.5% for Rabi crops, and 5% for annual commercial/horticultural crops. Enroll on pmfby.gov.in before seasonal cut-off dates.",
    hi: "सूखा, बाढ़ व बेमौसम बारिश से फसल सुरक्षा। किसान का प्रीमियम सिर्फ खरीफ में 2%, रबी में 1.5% और बागवानी में 5% है। बैंक या pmfby.gov.in पर कट-ऑफ तिथि से पूर्व आवेदन करें।",
  },
  {
    name: "Kisan Credit Card (KCC - किसान क्रेडिट कार्ड)",
    en: "Concessional institutional crop loans up to ₹3 Lakhs at an effective interest rate of only 4% per annum (with prompt repayment subvention). Approach any rural/commercial bank with land 7/12 & Aadhaar.",
    hi: "समय पर भुगतान करने पर मात्र 4% वार्षिक ब्याज पर ₹3 लाख तक का फसली ऋण। खतौनी/जमीन दस्तावेज व आधार कार्ड लेकर नजदीकी बैंक शाखा में संपर्क करें।",
  },
  {
    name: "SMAM & Farm Mechanization Subsidy (कृषि यंत्र सब्सिडी)",
    en: "Provides 40% to 50% subsidy on tractors, rotavators, power tillers, seed drills, and laser levellers under the Sub-Mission on Agricultural Mechanization (SMAM). Register on agrimachinery.nic.in.",
    hi: "ट्रैक्टर, रोटावेटर, पावर टिलर और सीड ड्रिल पर 40% से 50% तक की सरकारी सब्सिडी। agrimachinery.nic.in या राज्य कृषि पोर्टल पर ऑनलाइन टोकन प्राप्त करें।",
  },
  {
    name: "PM-KUSUM Solar Pump Scheme (पीएम कुसुम सोलर पंप)",
    en: "Up to 60% subsidy for installing 3HP to 10HP stand-alone solar agriculture pumps, reducing electricity and diesel expenses to zero. Apply on state renewable energy development portals.",
    hi: "खेतों में 3 से 10 हॉर्सपावर का सोलर पंप लगाने पर 60% तक सब्सिडी। बिजली व डीजल के खर्च से पूरी मुक्ति।",
  },
  {
    name: "Soil Health Card (मृदा स्वास्थ्य कार्ड)",
    en: "Free soil testing provided by Krishi Vigyan Kendras (KVK) with exact N-P-K, Zinc, and Sulfur fertilizer recommendations tailored to your soil pH and organic carbon content.",
    hi: "हर 2 वर्ष में खेत की मिट्टी का निःशुल्क परीक्षण। मिट्टी के pH व पोषक तत्वों के आधार पर सटीक खाद डालने की सलाह।",
  },
];

export const CLIMATE_ADVISORIES = {
  frost: {
    en: "❄️ **Frost & Cold Wave Protection Advisory (पाला व ठंड से बचाव)**:\n\n1. **Evening Irrigation**: Give light irrigation in the evening. Moist soil retains heat and raises canopy temperature by 1–2°C.\n2. **Smoke Barrier**: Burn dried weed piles along the north/west boundary at night so smoke blankets the field.\n3. **Foliar Spray**: Spray 0.1% commercial Sulfuric acid (1 ml per 1 liter water) or Water-Soluble Sulfur 80% WP @ 3 g/L to prevent cellular freezing.\n4. **Polyhouse/Covering**: Cover tender nursery and vegetable beds with straw or polythene sheets.",
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

const FALLBACK_GENERAL: Record<string, string> = {
  en: "I can help with mandi rates, fertilizer doses, irrigation schedules, pest & disease control, and govt schemes. Try: \"Soybean mandi price\", \"Wheat fertilizer dose\", \"yellow leaves on tomato\", or \"irrigation schedule for maize\".",
  hi: "मैं मंडी भाव, खाद की मात्रा, सिंचाई कार्यक्रम, कीट-रोग नियंत्रण और सरकारी योजनाओं में मदद कर सकता हूं। पूछें: \"सोयाबीन का मंडी भाव\", \"गेहूं की खाद मात्रा\", \"टमाटर की पत्तियां पीली\", या \"मक्का की सिंचाई\"।",
};

const detectCrop = (query: string): string | null => {
  const entity = extractEntities(query);
  if (entity.crop) return entity.crop;

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

export const getLocalAnswer = (
  query: string,
  profile: FarmProfile,
  lang?: string,
  history?: Array<{ role: string; content: string }>
): LocalAnswer => {
  const hi = lang === "hi" || (lang !== "en" && (hasDevanagari(query) || isHinglish(query)));
  const q = query.toLowerCase().trim();

  // Multi-turn context resolution: If user specified a mandi (e.g. "Indore") or a follow-up answer
  let crop = detectCrop(q);
  const mandiInQuery = extractMandiLocation(q);

  if (!crop && history && history.length > 0) {
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
    const greetingText = hi
      ? "नमस्ते किसान भाई! 👋 मैं Kisan Sahayak (किसान सहायक) हूँ। आप मुझसे फसल प्रबंधन, मंडी भाव, मौसम, कीट-रोग नियंत्रण, खाद की मात्रा, सिंचाई या सरकारी योजनाओं के बारे में पूछ सकते हैं।"
      : "Hello! 👋 I am Kisan Sahayak — your farming assistant. You can ask me about crops, live mandi prices, weather alerts, pest & disease control, fertilizer doses, irrigation schedules, or government schemes.";
    return { text: greetingText, matched: true, kind: "general" };
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
  if (crop) return cropAnswer(crop, profile, hi);

  return { text: FALLBACK_GENERAL[hi ? "hi" : "en"], matched: false, kind: "general" };
};
