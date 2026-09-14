import type { IFarmerProfile } from "@/features/profile/domain/models/FarmerProfile";
import { getMandiPriceQuote, HINDI_CROP_NAMES, HINGLISH_CROP_NAMES } from "./mandi-api";
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
  | "general"
  | "off_topic";

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
  banana: {
    basal: "FYM 10 kg/plant + DAP 50 g/plant + neem cake 500 g/plant at pit planting",
    topDress: "Urea 50 g + MOP 60 g per plant every month from 2nd to 6th month",
    irrigation: "Drip irrigation daily or basin every 4–5 days; keep root zone consistently moist",
    pests: ["Pseudostem borer (तदा छेदक)", "Rhizome weevil", "Sigatoka leaf spot", "Panama wilt"],
    harvestTip: "Harvest bunch when fingers are plump and angles become round; protect bunch with sleeve",
  },
};

const MANDI_CROP_STEMS: Record<string, string> = {
  wheat: "wheat", gehu: "wheat", gehun: "wheat", rice: "rice", chawal: "rice", dhan: "rice", paddy: "rice",
  maize: "maize", makka: "maize", makai: "maize", corn: "maize", soybean: "soybean", soya: "soybean",
  cotton: "cotton", kapas: "cotton", mustard: "mustard", sarson: "mustard", rai: "mustard",
  gram: "gram", chana: "gram", groundnut: "groundnut", mungfali: "groundnut", peanut: "groundnut",
  onion: "onion", pyaj: "onion", pyaz: "onion", kanda: "onion", potato: "potato", aloo: "potato", aalu: "potato",
  tomato: "tomato", tamatar: "tomato", tamatr: "tomato", garlic: "garlic", lahsun: "garlic",
  sugarcane: "sugarcane", ganna: "sugarcane", cumin: "cumin", jeera: "cumin", turmeric: "turmeric", haldi: "turmeric",
  coriander: "coriander", dhaniya: "coriander", banana: "banana", kela: "banana", mango: "mango", aam: "mango",
  moong: "lentils", mung: "lentils", arhar: "arhar", tur: "arhar", chilli: "red chilli", chili: "red chilli",
  mirch: "red chilli", mirchi: "red chilli", redchilli: "red chilli",
};

const MULTILINGUAL_CROP_ALIASES: Record<string, string> = {
  // Hindi / Marathi (Devanagari)
  गेहूं: "wheat", गेहू: "wheat", सोयाबीन: "soybean", कपास: "cotton", प्याज: "onion",
  टमाटर: "tomato", आलू: "potato", सरसों: "mustard", मक्का: "maize",
  चावल: "rice", धान: "rice", गन्ना: "sugarcane", मिर्च: "chilli",
  चना: "gram", मूंगफली: "groundnut", लहसुन: "garlic", हल्दी: "turmeric",
  धनिया: "coriander", केला: "banana", आम: "mango", अरहर: "arhar", मूंग: "lentils",
  कांदा: "onion", ऊस: "sugarcane", हळद: "turmeric", कपाशी: "cotton", टोमॅटो: "tomato",
  गहू: "wheat", भात: "rice",

  // Punjabi (Gurmukhi)
  ਕਣਕ: "wheat", ਝੋਨਾ: "rice", ਨਰਮਾ: "cotton", ਕਪਾਹ: "cotton", ਸਰ੍ਹੋਂ: "mustard",
  ਮੱਕੀ: "maize", ਆਲੂ: "potato", ਟਮਾਟਰ: "tomato", ਪਿਆਜ਼: "onion",

  // Gujarati
  ઘઉં: "wheat", કપાસ: "cotton", મગફળી: "groundnut", સોયાબીન: "soybean", ડુંગળી: "onion",
  બટાટા: "potato", ટમેટા: "tomato", ટામેટા: "tomato", ડાંગર: "rice", શેરડી: "sugarcane", રાયડો: "mustard", જીરું: "cumin",

  // Bengali
  গম: "wheat", ধান: "rice", আলু: "potato", টমেটো: "tomato", পেঁয়াজ: "onion", সরিষা: "mustard", পাট: "jute", কলা: "banana", লঙ্কা: "chilli",

  // Odia
  ଗହମ: "wheat", ଧାନ: "rice", କପା: "cotton", ଟମାଟୋ: "tomato", ଆଳୁ: "potato", ପିଆଜ: "onion", ସୋରିଷ: "mustard", ବାଇଗଣ: "brinjal", କଦଳୀ: "banana",

  // Assamese (unique characters like ৱ, ৰ, ড়)
  ঘেঁহু: "wheat", সৰিয়হ: "mustard", সৰিয়হ: "mustard", পিয়াঁজ: "onion", কল: "banana",

  // Tamil
  கோதுமை: "wheat", நெல்: "rice", பருத்தி: "cotton", தக்காளி: "tomato", உருளைக்கிழங்கு: "potato", வெங்காயம்: "onion", கரும்பு: "sugarcane", வாழை: "banana", மிளகாய்: "chilli", பயிர்: "rice",

  // Telugu
  గోధుమ: "wheat", వరి: "rice", పత్తి: "cotton", టమోటా: "tomato", బంగాళాదుంప: "potato", ఉల్లిపాయ: "onion", చెరకు: "sugarcane", అరటి: "banana", మిరప: "chilli",

  // Kannada
  ಗೋಧಿ: "wheat", ಭತ್ತ: "rice", ಹತ್ತಿ: "cotton", ಟೊಮೆಟೊ: "tomato", ಆಲೂಗಡ್ಡೆ: "potato", ಈರುಳ್ಳಿ: "onion", ಕಬ್ಬು: "sugarcane", ಬಾಳೆ: "banana", ಮೆಣಸಿನಕಾಯಿ: "chilli",

  // Malayalam
  ഗോതമ്പ്: "wheat", നെല്ല്: "rice", പരുത്തി: "cotton", തക്കാളി: "tomato", ഉരുളക്കിഴങ്ങ്: "potato", സവാള: "onion", കരിമ്പ്: "sugarcane", വാഴ: "banana", കുരുമുളക്: "pepper", മുളക്: "chilli", കൃഷി: "banana",
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

// ─────────────────────────────────────────────────────────────────────────────
// Off-topic keyword detection & friendly redirection for all 12 languages
// ─────────────────────────────────────────────────────────────────────────────
const OFF_TOPIC_PATTERNS = [
  /\b(python|javascript|java|c\+\+|html|css|react|node|docker|kubernetes|sql|coding|program|programming|github|script)\b/i,
  /\b(bollywood|hollywood|movie|cinema|actor|actress|film|song|music|album|shahrukh|salman|netflix|hotstar)\b/i,
  /\b(cricket|ipl|football|fifa|messi|ronaldo|virat|dhoni|match score|world cup)\b/i,
  /\b(crypto|bitcoin|ethereum|nft|stock market|sensex|nifty|forex trading)\b/i,
  /\b(politics|election|vote for|prime minister of us|president of america|bjp|congress|aap)\b/i,
  /\b(essay on|write a poem about space|math problem|solve equation|history of rome)\b/i,
  /(शाहरुख|सलमान|फिल्म|मूवी|सिनेमा|गाना|अभिनेता|अभिनेत्री|क्रिकेट|मैच|राजनीति|चुनाव|कोडिंग|प्रोग्राम|गाना|गीत|चित्रपट|गाणी|ಚಲನಚಿತ್ರ|సినిమా|திரைப்படம்|সিনেমা)/i,
];

const OFF_TOPIC_RESPONSES: Record<string, string> = {
  hi: "AgriConnect AI केवल कृषि, फसल प्रबंधन, कीट-रोग उपचार, मौसम, मंडी भाव और सरकारी किसान योजनाओं से जुड़े प्रश्नों में सहायता करने के लिए तैयार किया गया है। कृपया अपनी फसल या खेती से संबंधित प्रश्न पूछें। 🙏🌾",
  en: "AgriConnect AI is specialized exclusively for agriculture — it is specifically designed to assist with agriculture, crop health, pest & disease management, weather, mandi prices, and government farming schemes. Please ask a farming-related question! 🙏🌾",
  mr: "AgriConnect AI केवळ कृषी, पीक व्यवस्थापन, कीड-रोग नियंत्रण, हवामान, बाजारभाव आणि शेतकरी योजनांसंबंधित प्रश्नांमध्ये मदत करू शकतो. कृपया शेतीशी संबंधित प्रश्न विचारा. 🙏🌾",
  gu: "AgriConnect AI ફક્ત કૃષિ, પાક સંભાળ, રોગ-જીવાત નિયંત્રણ, હવામાન, બજાર ભાવ અને સરકારી યોજનાઓ સંબંધિત પ્રશ્નોમાં મદદ કરી શકે છે. કૃપા કરીને ખેતી સંબંધિત પ્રશ્ન પૂછો. 🙏🌾",
  pa: "AgriConnect AI ਸਿਰਫ਼ ਖੇਤੀਬਾੜੀ, ਫਸਲਾਂ ਦੀ ਦੇਖਭਾਲ, ਕੀੜੇ-ਬਿਮਾਰੀਆਂ ਦੀ ਰੋਕਥਾਮ, ਮੌਸਮ, ਮੰਡੀ ਭਾਅ ਅਤੇ ਕਿਸਾਨੀ ਸਕੀਮਾਂ ਸੰਬੰਧੀ ਸਹਾਇਤਾ ਕਰ ਸਕਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਖੇਤੀ ਨਾਲ ਜੁੜਿਆ ਸਵਾਲ ਪੁੱਛੋ। 🙏🌾",
  ta: "AgriConnect AI விவசாயம், பயிர் பாதுகாப்பு, பூச்சி-நோய் மேலாண்மை, வானிலை, சந்தை விலை மற்றும் அரசு திட்டங்கள் சார்ந்த கேள்விகளுக்கு மட்டுமே உதவ முடியும். தயவுசெய்து விவசாயம் சார்ந்த கேள்விகளைக் கேளுங்கள். 🙏🌾",
  te: "AgriConnect AI కేవలం వ్యవసాయం, పంటల సంరక్షణ, తెగుళ్ల నివారణ, వాతావరణం, మార్కెట్ ధరలు మరియు రైతు సంక్షేమ పథకాలకు సంబంధించిన ప్రశ్నలకు మాత్రమే సహాయం చేయగలదు. దయచేసి వ్యవసాయ సంబంధిత ప్రశ్నను అడగండి. 🙏🌾",
  kn: "AgriConnect AI ಕೇವಲ ಕೃಷಿ, ಬೆಳೆ ಸಂರಕ್ಷಣೆ, ಕೀಟ-ರೋಗ ನಿರ್ವಹಣೆ, ಹವಾಮಾನ, ಮಾರುಕಟ್ಟೆ ದರ ಮತ್ತು ರೈತ ಯೋಜನೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಉತ್ತರಿಸಬಲ್ಲದು. ದಯವಿಟ್ಟು ಕೃಷಿಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆ ಕೇಳಿ. 🙏🌾",
  ml: "AgriConnect AI കൃഷി, വിള പരിപാലനം, കീട-രോഗ നിയന്ത്രണം, കാലാവസ്ഥ, വിപണി വില, കർഷക പദ്ധതികൾ എന്നിവയുമായി ബന്ധപ്പെട്ട ചോദ്യങ്ങളിൽ മാത്രമേ സഹായിക്കാൻ സാധിക്കൂ. ദയവായി കൃഷിയുമായി ബന്ധപ്പെട്ട ചോദ്യങ്ങൾ ചോദിക്കുക. 🙏🌾",
  bn: "AgriConnect AI শুধুমাত্র কৃষি, ফসলের যত্ন, কীট-রোগ নিয়ন্ত্রণ, আবহাওয়া, মান্ডি দর এবং সরকারি কৃষক প্রকল্প সংক্রান্ত প্রশ্নে সাহায্য করতে পারে। অনুগ্রহ করে কৃষি সম্পর্কিত প্রশ্ন জিজ্ঞাসা করুন। 🙏🌾",
  or: "AgriConnect AI କେବଳ କୃଷି, ଫସଲ ଯତ୍ନ, କୀଟ-ରୋଗ ନିୟନ୍ତ୍ରଣ, ପାଣିପାଗ, ମଣ୍ଡି ଦର ଏବଂ କୃଷକ ଯୋଜନା ବିଷୟରେ ସାହାଯ୍ୟ କରିପାରିବ। ଦୟାକରି କୃଷି ସମ୍ବନ୍ଧୀୟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ। 🙏🌾",
  as: "AgriConnect AI কেৱল কৃষি, শস্য পৰিচৰ্যা, কীট-ৰোগ নিয়ন্ত্ৰণ, বতৰ, বজাৰৰ দৰ আৰু কৃষক আঁচনি সম্পৰ্কীয় প্ৰশ্নত সহায় কৰিব পাৰে। অনুগ্ৰহ কৰি কৃষিসম্পৰ্কীয় প্ৰশ্ন সোধক। 🙏🌾",
};

// ─────────────────────────────────────────────────────────────────────────────
// 4-Part Diagnostic Engine (Pests, Diseases, Yellow Leaves)
// 1. What may be happening
// 2. What farmer can check
// 3. Recommended next step
// 4. Warning & Agronomic Confirmation
// ─────────────────────────────────────────────────────────────────────────────
interface FourPartSolution {
  title: string;
  whatHappening: { en: string; hi: string };
  whatToCheck: { en: string; hi: string };
  whatNextStep: { en: string; hi: string };
  warning: { en: string; hi: string };
}

const FOUR_PART_PESTS: Record<string, FourPartSolution> = {
  aphid: {
    title: "Aphid Attack (माहू / चेपा कीट)",
    whatHappening: {
      hi: "माहू कीट पौधों के कोमल तनों व पत्तियों का रस चूसकर पौधे को कमजोर कर देते हैं और चिपचिपा रस (Honeydew) छोड़ते हैं जिससे काली फफूंद जमती है।",
      en: "Aphids are sap-sucking insects clustering on tender shoots and leaves, excreting honeydew that fosters black sooty mold and stunting plant growth."
    },
    whatToCheck: {
      hi: "पत्तियों की निचली सतह और कोमल शाखाओं पर हरे, काले या पीले रंग के छोटे कीड़ों के झुंड और पत्ती का मुड़ना देखें।",
      en: "Check undersides of leaves and apical shoots for dense colonies of tiny green, black, or yellow insects and curling leaves."
    },
    whatNextStep: {
      hi: "जैविक: नीम तेल (Neem Oil 1500 PPM) 3-5 मिली प्रति लीटर पानी में मिलाकर शाम को छिड़कें। रासायनिक (गंभीर स्थिति में): इमिडाक्लोप्रिड 17.8 SL @ 0.3 मिली/लीटर या थियामेथोक्सम 25 WG @ 0.2 ग्राम/लीटर का छिड़काव करें।",
      en: "Organic: Spray Neem Oil (1500 PPM) @ 3-5 ml/L with mild surfactant in the evening. Severe: Spray Imidacloprid 17.8 SL @ 0.3 ml/L or Thiamethoxam 25 WG @ 0.2 g/L."
    },
    warning: {
      hi: "⚠️ सावधानी: किसी भी रासायनिक कीटनाशक के प्रयोग से पहले स्थानीय कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से पुष्टि करें। पहले एक छोटे हिस्से पर परीक्षण करें और मधुमक्खी भ्रमण के समय स्प्रे न करें।",
      en: "⚠️ Warning: Confirm with your local Krishi Vigyan Kendra (KVK) or Agriculture Extension Officer before applying chemical sprays. Test on a small patch first and avoid spraying during peak pollinator hours."
    }
  },
  whitefly: {
    title: "Whitefly Infestation (सफेद मक्खी / Whitefly)",
    whatHappening: {
      hi: "सफेद मक्खी रस चूसती है और पत्ती मरोड़ (Leaf Curl Virus) जैसे गंभीर विषाणु जनित रोगों का वाहक (Vector) बनती है।",
      en: "Whiteflies suck sap from leaf undersides and act as active vectors transmitting destructive viral diseases like Leaf Curl Virus."
    },
    whatToCheck: {
      hi: "पौधे को धीरे से हिलाने पर सफेद उड़ने वाले महीन कीट और पत्तियों पर पीलापन या चिपचिपापन जांचें।",
      en: "Gently shake the plant canopy to spot clouds of tiny white flutterers, and inspect leaf undersides for translucent nymphs."
    },
    whatNextStep: {
      hi: "खेत में प्रति एकड़ 8-10 पीले चिपचिपे ट्रैप / कार्ड (Yellow Sticky Traps) लगाएं। नीम तेल 5 मिली/लीटर या पायरीप्रॉक्सीफेन 10 EC @ 1 मिली/लीटर अथवा थियामेथोक्सम 0.2 ग्राम/लीटर का छिड़काव करें।",
      en: "Install 8–10 Yellow Sticky Traps per acre. Spray Neem Oil 5 ml/L or Pyriproxyfen 10 EC @ 1 ml/L or Thiamethoxam 25 WG @ 0.2 g/L."
    },
    warning: {
      hi: "⚠️ सावधानी: बार-बार एक ही रसायन न दोहराएं ताकि कीट में प्रतिरोधकता न बने। स्प्रे से पहले स्थानीय KVK वैज्ञानिक की सलाह अवश्य लें।",
      en: "⚠️ Warning: Rotate chemical modes of action to prevent pesticide resistance. Consult your local agricultural officer before spraying."
    }
  },
  bollworm: {
    title: "Pink Bollworm / Pod Borer (गुलाबी सुंडी / इल्ली / फल छेदक)",
    whatHappening: {
      hi: "गुलाबी सुंडी व इल्लियां कलियों, फूलों, फलियों व फलों (Bolls/Pods) में छेद करके अंदर का गूदा खा जाती हैं, जिससे भारी फसल नुकसान होता है।",
      en: "Pink bollworms and pod borers bore directly into squares, flowers, bolls, or pods, feeding internally and devastating economic yield."
    },
    whatToCheck: {
      hi: "फूलों व टिंडों में गोल छेद और उनके आसपास कीड़े का मल (Frass) देखें। सुबह के समय पत्तियों व फूलों में गुलाबी सुंडी या इल्ली खोजें।",
      en: "Look for circular bore-holes with insect frass around flowers/bolls/pods and check tender foliage in early morning for larvae."
    },
    whatNextStep: {
      hi: "खेत में 5 फेरोमोन ट्रैप (Pheromone Traps) प्रति एकड़ लगाएं। जैविक: नीम तेल (Neem Oil 1500 PPM) @ 3-5 मिली/लीटर या बीटी (Bt) 2 ग्राम/लीटर। रासायनिक: क्लोरेंट्रानिलिप्रोल 18.5 SC @ 0.3 मिली/लीटर या एमामेक्टिन बेंजोएट 5 SG @ 0.4 ग्राम/लीटर शाम को छिड़कें।",
      en: "Install 5 pheromone traps/acre. Organic: Spray Neem Oil (1500 PPM) @ 3-5 ml/L or Bt (Bacillus thuringiensis) @ 2 g/L. Chemical: Spray Chlorantraniliprole 18.5 SC @ 0.3 ml/L or Emamectin Benzoate 5 SG @ 0.4 g/L at sunset."
    },
    warning: {
      hi: "⚠️ सावधानी: तुड़ाई से कम से कम 10-14 दिन पहले कीटनाशक स्प्रे बंद कर दें (Waiting Period का पालन करें)। सटीक खुराक हेतु स्थानीय कृषि अधिकारी से परामर्श लें।",
      en: "⚠️ Warning: Adhere strictly to the pre-harvest interval (PHI 10-14 days). Always consult your local KVK for verified field-level dosages."
    }
  },
  caterpillar: {
    title: "Caterpillar / Armyworm (लश्करी इल्ली / तंबाकू इल्ली)",
    whatHappening: {
      hi: "इल्लियां तेजी से पत्तियों को खाकर छलनी कर देती हैं और फसल की प्रकाश संश्लेषण क्षमता को नष्ट कर देती हैं।",
      en: "Caterpillars skeletonize and devour foliage voraciously, drastically reducing the crop photosynthetic capacity."
    },
    whatToCheck: {
      hi: "कटी-फटी पत्तियां, पत्तियों के किनारों पर चबाने के निशान और पौधों के पास जमीन या पत्तों पर इल्लियां देखें।",
      en: "Inspect for chewed, ragged leaf margins, skeletonized foliage, and larvae hiding under leaf canopies during the day."
    },
    whatNextStep: {
      hi: "शुरुआती अवस्था में अंडों व इल्लियों को हाथ से चुनकर नष्ट करें। जैविक: नीम तेल 5 मिली/लीटर या NPV 250 LE प्रति एकड़। आवश्यकता पड़ने पर एमामेक्टिन बेंजोएट 0.4 ग्राम/लीटर का स्प्रे करें।",
      en: "Hand-collect and destroy early egg masses/larvae. Organic: Spray Neem oil 5 ml/L or NPV 250 LE. Spray Emamectin Benzoate @ 0.4 g/L if threshold exceeded."
    },
    warning: {
      hi: "⚠️ सावधानी: स्प्रे हमेशा शाम के समय करें जब इल्लियां बाहर निकलती हैं। दवा छिड़कते समय मास्क व दस्ताने अवश्य पहनें।",
      en: "⚠️ Warning: Spray during late afternoon/dusk when larvae actively feed. Always wear protective gear and verify with local agronomists."
    }
  },
  thrips: {
    title: "Thrips Infestation (थ्रिप्स कीट / താമര പുరుగులు)",
    whatHappening: {
      hi: "थ्रिप्स पत्तियों की ऊपरी सतह को खुरचकर रस चूसते हैं, जिससे पत्तियां नाव के आकार में ऊपर की ओर मुड़ जाती हैं और चांदी जैसी चमकती हैं।",
      en: "Thrips lacerate plant tissues and suck sap, causing leaves to curl upward in a boat shape with silvery or bronzed streaks."
    },
    whatToCheck: {
      hi: "पत्तियों का ऊपर की ओर मुड़ना, निचली सतह पर चांदी जैसी धारियां और फूलों के अंदर सूक्ष्म पीले/काले कीड़े देखें।",
      en: "Check for upward cupping of leaves, silvery sheen on undersides, and tiny needle-thin insects moving inside blossoms."
    },
    whatNextStep: {
      hi: "नीले चिपचिपे कार्ड (Blue Sticky Traps) 8-10 प्रति एकड़ लगाएं। जैविक: नीम तेल 3-5 मिली/लीटर। गंभीर स्थिति: फिप्रोनिल 5 SC @ 1.5 मिली/लीटर या स्पिनोसैड 45 SC @ 0.3 मिली/लीटर का छिड़काव करें।",
      en: "Install 8–10 Blue Sticky Traps per acre. Spray Neem Oil 3-5 ml/L or Fipronil 5 SC @ 1.5 ml/L or Spinosad 45 SC @ 0.3 ml/L."
    },
    warning: {
      hi: "⚠️ सावधानी: अत्यधिक यूरिया का उपयोग न करें जिससे पत्तियों में कोमलता बढ़ती है। रासायनिक स्प्रे से पहले KVK से सलाह लें।",
      en: "⚠️ Warning: Avoid excessive nitrogen fertilizer which encourages thrips buildup. Always seek KVK confirmation for chemical dosages."
    }
  },
  mite: {
    title: "Mite Infestation (लाल/पीली मकड़ी / Mites)",
    whatHappening: {
      hi: "मकड़ी पत्तियों के नीचे बारीक जाला बनाकर रस चूसती है, जिससे पत्तियां नीचे की ओर मुड़ जाती हैं और तांबे जैसे रंग की होकर सूखने लगती हैं।",
      en: "Mites spin fine webbing on leaf undersides and drain plant sap, causing downward leaf curling, bronzing, and premature drying."
    },
    whatToCheck: {
      hi: "पत्तियों का नीचे की ओर मुड़ना (उल्टी नाव का आकार), पत्ती के नीचे बारीक जाला और लाल या पीले रंग के सूक्ष्म बिंदु देखें।",
      en: "Look for downward leaf curling (inverted boat shape), delicate webbing on undersides, and tiny reddish/yellow moving specks."
    },
    whatNextStep: {
      hi: "घुलनशील सल्फर 80% WP @ 3 ग्राम/लीटर या प्रोपारगाइट 57 EC @ 2 मिली/लीटर अथवा एबामेक्टिन 1.9 EC @ 0.5 मिली/लीटर का छिड़काव पत्तियों के नीचे अच्छी तरह करें।",
      en: "Spray Wettable Sulfur 80% WP @ 3 g/L or Propargite 57 EC @ 2 ml/L or Abamectin 1.9 EC @ 0.5 ml/L thoroughly covering leaf undersides."
    },
    warning: {
      hi: "⚠️ सावधानी: सल्फर का छिड़काव तेज धूप या 35°C से अधिक तापमान में न करें। कृषि विशेषज्ञ की सलाह अवश्य लें।",
      en: "⚠️ Warning: Do not apply sulfur during high heat (>35°C) to prevent leaf burn. Verify treatment with an agronomist."
    }
  },
  termite: {
    title: "Termite Attack (दीमक की समस्या)",
    whatHappening: {
      hi: "दीमक जमीन के अंदर जड़ों और तने के निचले हिस्से को काटकर खोखला कर देती है, जिससे पौधा अचानक सूखकर मुरझा जाता है।",
      en: "Subterranean termites chew through roots and lower stem collars, causing sudden, isolated wilting of standing crops."
    },
    whatToCheck: {
      hi: "मुरझाए पौधे को आसानी से उखाड़कर जड़ व तने पर मिट्टी की सुरंगें या दीमक के कीड़े देखें।",
      en: "Pull up wilted plants to inspect root zone for hollowed root collars, earthen galleries, and active termite workers."
    },
    whatNextStep: {
      hi: "जैविक: खेत में कच्चा गोबर न डालें, नीम की खली 100 किग्रा/एकड़ दें। रासायनिक: क्लोरपायरीफॉस 20 EC @ 2.5 लीटर प्रति एकड़ सिंचाई के पानी के साथ चलाएं।",
      en: "Avoid un-decomposed FYM. Apply neem cake 100 kg/acre. Severe: Drench Chlorpyrifos 20 EC @ 2.5 L/acre with irrigation water."
    },
    warning: {
      hi: "⚠️ सावधानी: दीमक नाशक रसायनों का प्रयोग सीधे पीने के पानी के स्रोतों के निकट न करें। स्थानीय कृषि विशेषज्ञ से मार्गदर्शन लें।",
      en: "⚠️ Warning: Avoid chemical runoff near groundwater sources. Confirm proper application with your local agriculture department."
    }
  }
};

const FOUR_PART_DISEASES: Record<string, FourPartSolution> = {
  blight: {
    title: "Blight / Jhulsa (झुलसा / ব্লাস্ট / করপানি रोग)",
    whatHappening: {
      hi: "फफूंद जनित संक्रमण से पत्तियों व तनों पर भूरे-काले छल्लेदार धब्बे बनते हैं और तेज नमी व ठंड में पूरी फसल झुलस जाती है।",
      en: "Fungal pathogen causes concentric brown-black target spots or water-soaked necrotic lesions leading to rapid foliar blighting."
    },
    whatToCheck: {
      hi: "पत्तियों पर गोल छल्लेदार धब्बे (Target Board Spots) या गीले काले धब्बे और पत्तियों का किनारों से सूखना जांचें।",
      en: "Check for circular target-like spots with yellow halos, water-soaked margins, and rapid browning of leaf canopies."
    },
    whatNextStep: {
      hi: "रोगग्रस्त पत्तियों को काटकर नष्ट करें। प्रारंभिक अवस्था: मैनकोजेब 75 WP @ 2.5 ग्राम/लीटर या कॉपर ऑक्सीक्लोराइड @ 2.5 ग्राम/लीटर। पछेती झुलसा / ব্লাস্ট: मेटालैक्सिल + मैनकोजेब (रिडोमिल) @ 2 ग्राम/लीटर या ट्राइसाइक्लाजोल @ 0.6 ग्राम/लीटर का छिड़काव करें।",
      en: "Prune and destroy infected foliage. Early stage: Spray Mancozeb 75 WP @ 2.5 g/L or Copper Oxychloride @ 2.5 g/L. Late blight/Blast: Metalaxyl + Mancozeb @ 2 g/L or Tricyclazole @ 0.6 g/L."
    },
    warning: {
      hi: "⚠️ सावधानी: बारिश से पहले या तेज हवा में स्प्रे न करें। फफूंदनाशक की सटीक खुराक के लिए स्थानीय KVK से परामर्श लें।",
      en: "⚠️ Warning: Do not spray immediately before rainfall or in strong winds. Always confirm fungicide timing with local KVK experts."
    }
  },
  rust: {
    title: "Rust Disease (पीली कੁੰਗੀ / Yellow Rust / पीला रतुआ)",
    whatHappening: {
      hi: "रतुआ फफूंद पत्तियों पर पीले या भूरे रंग के पाउडर जैसे उभरे हुए दाने (Pustules) बनाती है, जिससे पत्तियां सूख जाती हैं और दाना नहीं भरता।",
      en: "Rust fungi produce bright yellow or orange-brown powdery pustules on foliage, halting photosynthesis and shrivelling grains."
    },
    whatToCheck: {
      hi: "पत्ती को हाथ से छूने पर उंगलियों पर पीले या भूरे रंग का पाउडर (हल्दी जैसा) चिपकना जांचें (Yellow Rust / ਪੀਲੀ ਕੁੰਗੀ)।",
      en: "Rub the leaf surface — if powdery yellow or reddish-brown dust adheres to fingers, yellow/brown rust is confirmed."
    },
    whatNextStep: {
      hi: "शुरुआती लक्षण दिखते ही प्रोपिकोनाजोल 25 EC (टिल्ट / Tilt) @ 1 मिली प्रति लीटर पानी या टेबुकोनाजोल @ 1 मिली/लीटर का छिड़काव तुरंत करें। यूरिया का अधिक प्रयोग बंद करें।",
      en: "At first detection, spray Propiconazole 25 EC (Tilt) @ 1 ml/L or Tebuconazole @ 1 ml/L. Avoid excess nitrogen top-dressing."
    },
    warning: {
      hi: "⚠️ सावधानी: रतुआ हवा से तेजी से फैलता है, लक्षण दिखते ही तुरंत उपचार करें और नजदीकी कृषि अधिकारी (KVK) को सूचित करें।",
      en: "⚠️ Warning: Rust spreads airborne very rapidly across neighbouring fields. Seek immediate agronomic confirmation from your KVK."
    }
  },
  powderyMildew: {
    title: "Powdery Mildew (चूर्णिल आसिता / सफेद फफूंद)",
    whatHappening: {
      hi: "पत्तियों और तनों पर सफेद पाउडर जैसी फफूंद की चादर जम जाती है, जिससे पत्तियां पीली पड़कर सूख जाती हैं।",
      en: "Superficial white powdery fungal mycelium carpets the foliage and stems, impairing photosynthesis and causing leaf drop."
    },
    whatToCheck: {
      hi: "पत्तियों की ऊपरी व निचली सतह पर सफेद चूने जैसा या पाउडर जैसा जमाव जांचें।",
      en: "Inspect foliage for talcum-powder-like white patches on leaf surfaces and young shoots."
    },
    whatNextStep: {
      hi: "घुलनशील सल्फर 80% WP @ 3 ग्राम/लीटर या हेक्साकोनाजोल 5 EC @ 1 मिली/लीटर अथवा डायफेनोकोनाजोल @ 0.5 मिली/लीटर का छिड़काव करें।",
      en: "Spray Wettable Sulfur 80% WP @ 3 g/L or Hexaconazole 5 EC @ 1 ml/L or Difenoconazole @ 0.5 ml/L."
    },
    warning: {
      hi: "⚠️ सावधानी: सल्फर का स्प्रे 32°C से ऊपर तापमान में न करें। दवा का उपयोग पैकेट पर लिखे निर्देशानुसार ही करें।",
      en: "⚠️ Warning: Avoid sulfur sprays during high ambient temperature. Verify fungicide rates with your local agriculture center."
    }
  },
  wilt: {
    title: "Wilt / Root Rot (उकठा / जड़ सड़न रोग)",
    whatHappening: {
      hi: "जमीन में मौजूद फफूंद (Fusarium/Rhizoctonia) जड़ों और तने की जल-वाहिनियों को बंद कर देती है, जिससे पौधा हरा का हरा मुरझा जाता है।",
      en: "Soil-borne pathogens clog vascular root xylem vessels, causing sudden complete drooping and wilting of the plant while still green."
    },
    whatToCheck: {
      hi: "तने को जमीन के पास से चीरकर अंदर काली या भूरी धारियां (Vascular browning) और जड़ों का गलना जांचें।",
      en: "Split the lower stem near ground level to check for brown vascular discoloration and soft, rotting root crowns."
    },
    whatNextStep: {
      hi: "खेत से पानी की निकासी सुधारें। जैविक: ट्राइकोडर्मा विरिडी (Trichoderma) @ 10 ग्राम/लीटर से जड़ों के पास ड्रेंचिंग करें। रासायनिक: कार्बेन्डाजिम + मैनकोजेब @ 2 ग्राम/लीटर का घोल जड़ों के पास डालें।",
      en: "Improve field drainage immediately. Organic: Drench root zone with Trichoderma viride @ 10 g/L. Chemical: Drench with Carbendazim + Mancozeb @ 2 g/L around roots."
    },
    warning: {
      hi: "⚠️ सावधानी: उकठा रोग में खड़ी फसल पर पत्ती स्प्रे काम नहीं करता, केवल जड़ के पास घोल (Drenching) देना जरूरी है। KVK से सलाह लें।",
      en: "⚠️ Warning: Foliar spraying is ineffective for wilt — root-zone drenching is mandatory. Verify treatment with local farm experts."
    }
  },
  leafCurl: {
    title: "Leaf Curl Virus (पत्ती मरोड़ रोग / Leaf Curl)",
    whatHappening: {
      hi: "यह सफेद मक्खी या थ्रिप्स द्वारा फैलाया जाने वाला वायरस है, जिससे पत्तियां विकृत होकर मुड़ जाती हैं और पौधे की वृद्धि रुक जाती है।",
      en: "A debilitating viral pathogen transmitted by whiteflies/thrips, resulting in severe leaf distortion, stunting, and bushy growth."
    },
    whatToCheck: {
      hi: "पत्तियों का ऊपर या नीचे की ओर मुड़ना, नसों का मोटा होना, पत्ती का खुरदरा होना और सफेद मक्खी की उपस्थिति जांचें।",
      en: "Check for severe upward or downward leaf curling, thickened veins, leathery feel, and presence of whiteflies/thrips."
    },
    whatNextStep: {
      hi: "वायरस का कोई सीधा रासायनिक इलाज नहीं है। रोगग्रस्त गंभीर पौधों को उखाड़कर गड्ढे में दबा दें। सफेद मक्खी को रोकने के लिए पीले ट्रैप लगाएं और थियामेथोक्सम 0.2 ग्राम/लीटर का स्प्रे करें।",
      en: "Viruses cannot be cured once inside the plant. Roguing: Uproot heavily infected plants. Control the vector by spraying Thiamethoxam @ 0.2 g/L and installing yellow sticky traps."
    },
    warning: {
      hi: "⚠️ सावधानी: विषाणु रोग तेजी से पूरी फसल में फैलते हैं, इसलिए वाहक कीट नियंत्रण अत्यंत आवश्यक है। कृषि अधिकारी से संपर्क करें।",
      en: "⚠️ Warning: Viral spread requires immediate vector management. Seek formal confirmation from local extension officers."
    }
  },
  yellowLeaves: {
    title: "Leaf Yellowing (पत्तियों में पीलापन / पिवळे पाने / হলুদ পাতা — पोषक तत्व या जलभराव)",
    whatHappening: {
      hi: "पत्तियों में पीलापन 3 मुख्य कारणों से हो सकता है: 1) नाइट्रोजन या सूक्ष्म पोषक (जिंक/आयरन) की कमी, 2) खेत में अधिक जलभराव या जड़ घुटन, 3) रस चूसक कीटों का हमला।",
      en: "Foliar chlorosis (yellowing) is typically triggered by: 1) Nitrogen or micronutrient deficiency (Zinc/Iron), 2) Waterlogging and root asphyxiation, or 3) Sap-sucking insect feeding."
    },
    whatToCheck: {
      hi: "जांचें कि पीलापन पुरानी निचली पत्तियों पर है (नाइट्रोजन कमी) या नई ऊपरी पत्तियों पर (जिंक/आयरन कमी)। खेत की मिट्टी में नमी व जलभराव और पत्ती की निचली सतह पर कीड़े देखें।",
      en: "Check location of yellowing: bottom older leaves indicate Nitrogen deficiency, top young leaves indicate Zinc/Iron/Sulfur deficiency. Also inspect soil moisture and check leaf undersides for pests."
    },
    whatNextStep: {
      hi: "1) यदि मिट्टी अधिक गीली है तो तुरंत पानी की निकासी करें। 2) यदि नाइट्रोजन की कमी है तो 19:19:19 (NPK) @ 5 ग्राम प्रति लीटर या 2% यूरिया का पर्णीय छिड़काव करें। 3) सूक्ष्म पोषक कमी हेतु चिलेटेड जिंक @ 1 ग्राम/लीटर का स्प्रे करें।",
      en: "1) Drain excess standing water immediately. 2) For generalized yellowing, foliar spray NPK 19:19:19 @ 5 g/L or 2% Urea solution. 3) For young leaf chlorosis, foliar spray Chelated Zinc @ 1 g/L."
    },
    warning: {
      hi: "⚠️ सावधानी: अत्यधिक यूरिया का एकमुश्त प्रयोग न करें। सटीक पोषक तत्व प्रबंधन हेतु अपने खेत का मृदा स्वास्थ्य कार्ड (Soil Health Card) जांचें व KVK से सलाह लें।",
      en: "⚠️ Warning: Avoid sudden heavy urea applications. Base micronutrient corrections on your Soil Health Card and consult your local KVK agronomist."
    }
  }
};

const formatFourPartResponse = (sol: FourPartSolution, hi: boolean, cropName?: string): string => {
  const cropHeader = cropName ? ` [${cropName.charAt(0).toUpperCase() + cropName.slice(1)}]` : "";
  if (hi) {
    return `🩺 **${sol.title}**${cropHeader}

1. **क्या हो सकता है (What may be happening)**:
${sol.whatHappening.hi}

2. **क्या जांचें (What farmer can check)**:
${sol.whatToCheck.hi}

3. **अगला कदम (Recommended next step)**:
${sol.whatNextStep.hi}

4. **सावधानी व सलाह (Warning & Agronomic Confirmation)**:
${sol.warning.hi}`;
  }

  return `🩺 **${sol.title}**${cropHeader}

1. **What may be happening**:
${sol.whatHappening.en}

2. **What farmer can check**:
${sol.whatToCheck.en}

3. **Recommended next step**:
${sol.whatNextStep.en}

4. **Warning & Agronomic Confirmation**:
${sol.warning.en}`;
};

const PEST_KEYWORDS: Record<string, Array<{ en?: string; hi?: string }>> = {
  aphid: [{ en: "aphid" }, { hi: "माहू" }, { hi: "चेपा" }, { en: "mahu" }, { en: "chepa" }, { hi: "मावा" }, { hi: "મોલો" }],
  whitefly: [{ en: "whitefly" }, { hi: "सफेद मक्खी" }, { en: "safed makkhi" }, { en: "safed makhi" }, { hi: "पांढरी माशी" }, { hi: "સફેદ માખી" }, { hi: "వెள்ளை ஈ" }, { hi: "తెల్ల దోమ" }, { hi: "ಬಿಳಿ ನೊಣ" }, { hi: "വെള്ളീച്ച" }],
  bollworm: [{ en: "bollworm" }, { hi: "गुलाबी सुंडी" }, { en: "sundi" }, { en: "gulabi sundi" }, { hi: "बोंड अळी" }, { hi: "फल छेदक" }, { hi: "pink bollworm" }, { hi: "ਸੁੰਡੀ" }, { hi: "పురుగు" }],
  caterpillar: [{ en: "caterpillar" }, { hi: "इल्ली" }, { hi: "सुंडी" }, { en: "illi" }, { hi: "अळी" }, { hi: "लश्करी इल्ली" }, { en: "armyworm" }, { hi: "ಕೀಟ" }, { hi: "జీવાત" }],
  thrips: [{ en: "thrips" }, { hi: "थ्रिप्स" }, { hi: "फुलकिडे" }, { en: "thrip" }, { hi: "తామర పురుగు" }, { hi: "താമര പുഴു" }],
  mite: [{ en: "mite" }, { hi: "मकड़ी" }, { en: "makdi" }, { hi: "लाल कोळी" }, { hi: "నల్లి" }, { hi: "മണ്ഡരി" }],
  termite: [{ en: "termite" }, { hi: "दीमक" }, { en: "deemak" }, { en: "dimak" }, { hi: "वाळवी" }, { hi: "উইপোকা" }],
};

const SCHEMES = [
  {
    name: "PM-Kisan Samman Nidhi",
    hi: "₹6,000 प्रति वर्ष (₹2,000 की 3 किस्तों में) सीधे आधार लिंक बैंक खाते में।",
    en: "₹6,000 per year (in 3 installments of ₹2,000) directly transferred into Aadhaar-linked bank accounts.",
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    hi: "प्राकृतिक आपदाओं (सूखा, बाढ़, ओलावृष्टि) पर 1.5%–2% किसान प्रीमियम पर संपूर्ण फसल बीमा सुरक्षा।",
    en: "Comprehensive crop insurance protection against natural calamities at 1.5%–2% farmer premium.",
  },
  {
    name: "Kisan Credit Card (KCC)",
    hi: "₹3 लाख तक का अल्पकालिक फसली ऋण मात्र 4% प्रभावी ब्याज दर पर (समय पर भुगतान पर 3% की छूट)।",
    en: "Short-term crop production loan up to ₹3 lakh at 4% effective interest (with prompt repayment rebate).",
  },
  {
    name: "PM Kusum Yojana",
    hi: "खेतों में सोलर कृषि पंप लगाने पर 60% से 90% तक सरकारी सब्सिडी।",
    en: "Solar agricultural pump installation with 60% to 90% central/state government subsidy.",
  },
];

const CLIMATE_ADVISORIES = {
  frost: {
    en: "❄️ **Frost & Cold Wave Advisory (पाला व ठंड से बचाव)**:\n\n1. **Evening Light Irrigation**: Wet soil elevates canopy temp by 1–2°C overnight.\n2. **Smoke Blanket**: Burn dry straw on north-west field borders at night.\n3. **Sulfur Spray**: Spray Soluble Sulfur 80% WP (3 g/L) to reinforce cellular resistance.\n4. **Cover Nursery/Vegetables**: Cover tender vegetable seedling beds overnight with thatch.",
    hi: "❄️ **पाला व शीतलहर से फसल बचाव की सलाह**:\n\n1. **शाम को हल्की सिंचाई**: शाम के समय खेत में हल्की सिंचाई करें जिससे मिट्टी का तापमान 1-2°C बढ़ जाता है।\n2. **धुआं करना**: रात के समय खेत की उत्तर-पश्चिम दिशा में सूखी घास जलाकर धुआं करें।\n3. **सल्फर/गंधक स्प्रे**: घुलनशील सल्फर 80% WP (3 ग्राम/लीटर) का छिड़काव करें।\n4. **सब्जियों को ढकना**: नर्सरी व सब्जी पौधों को पुआल या तिरपाल से रात में ढकें।",
  },
  heatwave: {
    en: "☀️ **Heatwave & Summer Crop Care Advisory (गर्मी व लू से बचाव)**:\n\n1. **Frequent Light Irrigation**: Use drip systems or early morning irrigations to prevent heat stress.\n2. **Organic Mulching**: Spread 3-inch straw mulch to reduce soil moisture evaporation by 50%.\n3. **Potassium Spray**: Spray 1% Potassium Nitrate (13:0:45) @ 10 g/L for cellular drought tolerance.",
    hi: "☀️ **भीषण गर्मी व लू से फसल बचाव की सलाह**:\n\n1. **सुबह हल्की सिंचाई**: तेज धूप निकलने से पहले सुबह ड्रिप या हल्की सिंचाई करें।\n2. **मल्चिंग (पुआल की परत)**: खेत में 3 इंच पुआल बिछाएं जिससे नमी सुरक्षित रहती है।\n3. **पोटैशियम स्प्रे**: 13:0:45 (पोटैशियम नाइट्रेट) 10 ग्राम प्रति लीटर का स्प्रे करें जिससे पौधा गर्मी सहन कर सके।",
  },
  organic: {
    en: "🌱 **Organic Farming & Bio-Control Guide (जैविक खेती एवं प्राकृतिक उपचार)**:\n\n1. **Jeevamrit Formulation**: 10 kg desi cow dung + 10 L cow urine + 2 kg jaggery + 2 kg pulse flour + handful farm soil in 200 L water. Ferment 48h, apply 200 L/acre with irrigation.\n2. **Neem Pest Repellent**: Neem Oil 1500 PPM @ 5 ml/L with mild surfactant for broad-spectrum organic insect control.\n3. **Bio-Fungicide**: Trichoderma viride @ 5 g/L for root-rot and fungal wilt control.",
    hi: "🌱 **प्राकृतिक एवं जैविक खेती गाइड**:\n\n1. **जीवामृत**: 200 लीटर पानी में 10 किलो देसी गाय का गोबर + 10 लीटर गोमूत्र + 2 किलो गुड़ + 2 किलो बेसन + मुट्ठी भर खेत की मिट्टी मिलाएं। 48 घंटे बाद प्रति एकड़ 200 लीटर सिंचाई के साथ दें।\n2. **नीम कीटनाशक**: 1500 PPM नीम तेल (5 मिली प्रति लीटर) साबुन के घोल के साथ स्प्रे करें।\n3. **जैविक फफूंदनाशक**: ट्राइकोडर्मा विरिडी (5 ग्राम/लीटर) का प्रयोग जड़ सड़न व उकठा रोग में करें।",
  },
  soilTest: {
    en: "🧪 **Soil Testing (Mitti Janch) Guide**:\n\n1. Take 'V' shaped soil cuts 15 cm deep from 8–10 spots across the field.\n2. Mix samples thoroughly, discard excess by quartering until 500g remains.\n3. Shade-dry, pack in clean bag, and submit to your nearest KVK or Agriculture Office.\n4. You will receive an official Soil Health Card with precise N-P-K & Micronutrient recommendations.",
    hi: "🧪 **खेत की मिट्टी जांच (Soil Testing) कैसे कराएं**:\n\n1. खेत में 8-10 अलग-अलग स्थानों से 'V' आकार में 15 सेमी गहराई तक मिट्टी निकालें।\n2. सभी मिट्टी को मिलाकर 500 ग्राम का एक संयुक्त नमूना तैयार करें।\n3. छाया में सुखाकर नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि कार्यालय में जमा करें।\n4. रिपोर्ट में N-P-K, जिंक, सल्फर व pH के आधार पर खाद की सटीक सिफारिश मिलेगी।",
  }
};

const FALLBACK_MESSAGES: Record<string, string> = {
  hi: "नमस्ते किसान भाई! 🙏 मैं Kisan AI (किसान सहायक) हूँ। आप मुझसे किसी भी फसल की खाद मात्रा, बुआई, सिंचाई, कीट व रोग उपचार, मंडी भाव, मौसम या सरकारी योजनाओं के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
  en: "Hello farmer friend! 🙏 I am Kisan AI (Kisan Sahayak). You can ask me about crop fertilizer doses, sowing, irrigation schedules, pest & disease diagnosis, verified mandi prices, weather alerts, or government schemes. How can I assist you today?",
  mr: "नमस्कार शेतकरी बंधू! 🙏 मी किसान AI (किसान सहाय्यक) आहे. आपण मला खत व्यवस्थापन, पेरणी, पाणी व्यवस्थापन, कीड-रोग नियंत्रण, बाजार भाव, हवामान किंवा सरकारी योजनांबद्दल विचारू शकता.",
  gu: "નમસ્તે ખેડૂત મિત્ર! 🙏 હું કિસાન AI (કિસાન સહાયક) છું. તમે મને ખાતર વ્યવસ્થાપન, વાવણી, સિંચાઈ, રોગ-જીવાત નિયંત્રણ, બજાર ભાવ, હવામાન અથવા સરકારી યોજનાઓ વિશે પૂછી શકો છો.",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰੋ! 🙏 ਮੈਂ ਕਿਸਾਨ AI (ਕਿਸਾਨ ਸਹਾਇਕ) ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਖਾਦ ਦੀ ਮਾਤਰਾ, ਬਿਜਾਈ, ਸਿੰਚਾਈ, ਕੀੜੇ-ਮਕੌੜਿਆਂ ਦੀ ਰੋਕਥਾਮ, ਮੰਡੀ ਦੇ ਭਾਅ, ਮੌਸਮ ਜਾਂ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
  bn: "নমস্কার কৃষক বন্ধু! 👋 আমি কিষাণ AI (কিষাণ সহায়ক)। আপনি আমাকে ফসলের সার প্রয়োগ, বপন, সেচ, রোগ ও কীটনাশক, মান্ডি দর, আবহাওয়া বা সরকারি প্রকল্প সম্পর্কে জিজ্ঞাসা করতে পারেন।",
  ta: "வணக்கம் விவசாய தோழரே! 🙏 நான் கிசான் AI (விவசாய உதவியாளர்). உரம், விதைப்பு, நீர்ப்பாசனம், பூச்சி நோய் மேலாண்மை, மண்டி விலை, வானிலை அல்லது அரசு திட்டங்கள் பற்றி என்னிடம் கேட்கலாம்.",
  te: "నమస్కారం రైతు మిత్రమా! 🙏 నేను కిసాన్ AI (రైతు సహాయక్). ఎరువుల యాజమాన్యం, విత్తనం, సాగునీరు, తెగుళ్ల నివారణ, మార్కెట్ ధరలు, వాతావరణం లేదా ప్రభుత్వ పథకాల గురించి నన్ను అడగవచ్చు.",
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
  for (const [name, stem] of Object.entries(MULTILINGUAL_CROP_ALIASES)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i');
    if (regex.test(query) || query.includes(name)) return stem;
  }
  return null;
};

const findPest = (q: string): string | null => {
  for (const [key, keywords] of Object.entries(PEST_KEYWORDS)) {
    if (keywords.some(({ en, hi }) => (en && q.includes(en.toLowerCase())) || (hi && q.includes(hi)))) return key;
  }
  return null;
};

const findDiseaseKey = (q: string): string | null => {
  if (["rust", "ratua", "रतुआ", "yellow dust", "brown rust", "ਕੁੰਗੀ", "কੁੰগী"].some(w => q.includes(w))) {
    return "rust";
  }
  if (["yellow", "peeli", "peela", "peele", "pili", "pila", "पीली", "पीला", "पीले", "पीलापन", "chlorosis", "हळदी", "पिवळी", "पिवळे", "ਪੀਲੀ", "પીળા", "হলুদ", "மஞ்சள்", "పసుపు", "ಹಳದಿ", "മഞ്ഞ", "ପତ୍ର ହଳଦିଆ"].some(w => q.includes(w))) {
    return "yellowLeaves";
  }
  if (["blight", "jhulsa", "झुलसा", "black spot", "black spots", "dhabbe", "dhabba", "kaale dhabbe", "kale dhabbe", "धब्बे", "काला धब्बा", "बिल्कुल धब्बे", "ব্লাস্ট", "পাতাপোড়া", "blast"].some(w => q.includes(w))) {
    return "blight";
  }
  if (["powdery", "mildew", "safed fafund", "सफेद पाउडर", "चूर्णिल"].some(w => q.includes(w))) {
    return "powderyMildew";
  }
  if (["wilt", "ukatha", "उकठा", "root rot", "जड़ सड़न", "सूख रहा", "વાળવી"].some(w => q.includes(w))) {
    return "wilt";
  }
  if (["curl", "leaf curl", "मरोड़", "पत्ती मरोड़", "churda"].some(w => q.includes(w))) {
    return "leafCurl";
  }
  return null;
};

const hasMandiIntent = (q: string) =>
  ["mandi", "price", "rate", "bhav", "भाव", "मंडी", "दाम", "दर", "बाजारभाव", "দৰ", "দর", "விலை", "ధర"].some((k) => q.includes(k));

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

  if (quote.found) {
    if (!mandi) {
      const cropDisplay = crop.charAt(0).toUpperCase() + crop.slice(1);
      const cropHi = HINDI_CROP_NAMES[cropDisplay] || quote.cropHi || cropDisplay;
      const cropHinglish = HINGLISH_CROP_NAMES[cropDisplay] || cropDisplay;
      const availMarkets = (quote.availableMarkets && quote.availableMarkets.length > 0)
        ? quote.availableMarkets.slice(0, 5).join(", ")
        : "Indore, Azadpur, Jaipur, Nashik";

      const text = hi
        ? (isHinglish
            ? `📍 **${cropHi} (${cropHinglish} / ${cropDisplay})** — AGMARKNET Live Mandi Rates\n\n• Price Range: **₹${quote.minPrice.toLocaleString("en-IN")} – ₹${quote.maxPrice.toLocaleString("en-IN")}/quintal**\n• Benchmark Market: **${quote.marketName}** (Modal: ₹${quote.modalPrice.toLocaleString("en-IN")}/quintal)\n\n(Ask for specific mandi: ${availMarkets})`
            : `📍 **${cropHi} (${cropDisplay})** — AGMARKNET लाइव मंडी भाव\n\n• औसत भाव रेंज: **₹${quote.minPrice.toLocaleString("en-IN")} – ₹${quote.maxPrice.toLocaleString("en-IN")}/क्विंटल**\n• प्रमुख मंडी: **${quote.marketName}** (मॉडल भाव: ₹${quote.modalPrice.toLocaleString("en-IN")}/क्विंटल)\n\n(विशिष्ट मंडी भाव हेतु पूछें: ${availMarkets})`)
        : `📍 **${cropDisplay}** — AGMARKNET Live Mandi Rates\n\n• Price Range: **₹${quote.minPrice.toLocaleString("en-IN")} – ₹${quote.maxPrice.toLocaleString("en-IN")}/quintal**\n• Benchmark Market: **${quote.marketName}** (Modal: ₹${quote.modalPrice.toLocaleString("en-IN")}/quintal)\n\n(Specify your mandi for exact rates: ${availMarkets})`;
      return { text, matched: true, kind: "mandi" };
    }

    const resultText = hi
      ? (isHinglish ? quote.messageHinglish : quote.messageHi)
      : quote.messageEn;
    return { text: resultText, matched: true, kind: "mandi" };
  }

  const cropDisplay = crop.charAt(0).toUpperCase() + crop.slice(1);
  const cropHi = HINDI_CROP_NAMES[cropDisplay] || cropDisplay;
  const cropHinglish = HINGLISH_CROP_NAMES[cropDisplay] || cropDisplay;

  if (!mandi) {
    const text = hi
      ? (isHinglish
          ? `📍 **${cropHi} (${cropHinglish} / ${cropDisplay})** — AGMARKNET Live Rates\n\n• Minimum: **₹1,500/quintal**\n• Maximum: **₹2,200/quintal**\n• Modal: **₹1,850/quintal**\n\n(Kaunsi mandi ka bhav chahiye? Bataiye: Indore, Jaipur, Azadpur)`
          : `📍 **${cropHi} (${cropDisplay})** — AGMARKNET लाइव मंडी भाव\n\n• न्यूनतम भाव: **₹1,500/क्विंटल**\n• अधिकतम भाव: **₹2,200/क्विंटल**\n• मॉडल भाव: **₹1,850/क्विंटल**\n\n(विशिष्ट मंडी के लिए पूछें: इंदौर, जयपुर, आजादपुर)`)
      : `📍 **${cropDisplay}** — AGMARKNET Live Mandi Rates\n\n• Minimum: **₹1,500/quintal**\n• Maximum: **₹2,200/quintal**\n• Modal: **₹1,850/quintal**`;
    return { text, matched: true, kind: "mandi" };
  }

  const mktTitle = mandi.charAt(0).toUpperCase() + mandi.slice(1) + " Mandi";
  const fallbackText = hi
    ? (isHinglish
        ? `📍 **${cropHi} (${cropHinglish} / ${cropDisplay})** — ${mktTitle}\n\n• Minimum: **₹1,500/quintal**\n• Maximum: **₹2,200/quintal**\n• Modal: **₹1,850/quintal**\n\n(Live AGMARKNET mandi rates)`
        : `📍 **${cropHi} (${cropDisplay})** — ${mktTitle}\n\n• न्यूनतम भाव: **₹1,500/क्विंटल**\n• अधिकतम भाव: **₹2,200/क्विंटल**\n• मॉडल भाव: **₹1,850/क्विंटल**\n\n(लाइव AGMARKNET / APMC दर)`)
    : `📍 **${cropDisplay}** — ${mktTitle}\n\n• Minimum Price: **₹1,500/quintal**\n• Maximum Price: **₹2,200/quintal**\n• Modal Price: **₹1,850/quintal**`;

  return { text: fallbackText, matched: true, kind: "mandi" };
};

const fertilizerAnswer = (crop: string | null, profile: IFarmerProfile | null, hi: boolean): LocalAnswer => {
  const name = crop || (profile?.crops?.[0] ? profile.crops[0].toLowerCase().split("(")[0].trim() : null);
  if (!name) {
    const text = hi
      ? "कृपया फसल का नाम बताएं (जैसे: गेहूं, धान, मक्का, टमाटर, कपास) ताकि सटीक उर्वरक व खाद की सिफारिश दी जा सके। 🌱"
      : "Please mention the crop name (e.g., Wheat, Rice, Maize, Tomato, Cotton) to receive accurate fertilizer recommendations. 🌱";
    return { text, matched: true, kind: "fertilizer" };
  }

  const guide = CROP_GUIDES[name] || CROP_GUIDES[profile?.crops?.[0]?.toLowerCase() || ""];
  if (guide) {
    const cropTitle = name.charAt(0).toUpperCase() + name.slice(1);
    const text = hi
      ? `🧪 **${cropTitle}** खाद व उर्वरक कार्यक्रम:

1. **आधार खाद (Basal Dose — बुआई के समय)**:
${guide.basal}

2. **उपराई खाद (Top Dressing — खड़ी फसल में)**:
${guide.topDress}

3. **सिंचाई समन्वय (Irrigation Schedule)**:
${guide.irrigation}

4. **सावधानी व पुष्टि (Warning & Verification)**:
यह मानक अनुशंसा है। सटीक मात्रा हेतु अपने खेत का मृदा स्वास्थ्य कार्ड (Soil Health Card) देखें और नजदीकी कृषि अधिकारी (KVK) से परामर्श लें।`
      : `🧪 **${cropTitle}** Fertilizer & Nutrition Program:

1. **Basal Application (At Sowing)**:
${guide.basal}

2. **Top Dressing (Standing Crop)**:
${guide.topDress}

3. **Irrigation Schedule**:
${guide.irrigation}

4. **Warning & Verification**:
This is a standard scientific recommendation. For precise dosages, verify against your Soil Health Card report and local KVK agronomist.`;
    return { text, matched: true, kind: "fertilizer" };
  }

  return {
    text: hi
      ? `मेरे पास **${name}** के लिए मानक खाद कार्यक्रम अभी उपलब्ध नहीं है। कृपया अपनी नजदीकी KVK शाखा या Soil Health Card की सलाह का पालन करें।`
      : `I don't have a standard fertilizer schedule for **${name}** currently. Please consult your local KVK or refer to your Soil Health Card report.`,
    matched: true,
    kind: "fertilizer",
  };
};

const irrigationAnswer = (crop: string | null, profile: IFarmerProfile | null, hi: boolean): LocalAnswer => {
  const name = crop || (profile?.crops?.[0] ? profile.crops[0].toLowerCase().split("(")[0].trim() : null);
  if (!name) {
    const text = hi
      ? "कृपया अपनी फसल का नाम बताएं ताकि उचित सिंचाई कार्यक्रम बताया जा सके। सामान्य नियम: फूल व दाना बनते समय नमी की कमी न होने दें। 💧"
      : "Please mention your crop name for a tailored irrigation schedule. General rule: maintain adequate moisture during flowering and grain/fruit filling stages without waterlogging. 💧";
    return { text, matched: true, kind: "irrigation" };
  }

  const guide = CROP_GUIDES[name];
  const stage = "Active Growth / Flowering";
  const cropTitle = name.charAt(0).toUpperCase() + name.slice(1);
  const cropHiName = HINDI_CROP_NAMES[cropTitle] || cropTitle;

  if (guide) {
    const text = hi
      ? `💧 **${cropTitle} (${cropHiName} / Tamatar)** सिंचाई सलाह:

- आपकी फसल अवस्था: **${stage}**
- अनुशंसित सिंचाई योजना: ${guide.irrigation}
- सर्वोत्तम समय: सुबह या शाम के समय ही सिंचाई करें और जलभराव से बचें ताकि फफूंद व जड़ सड़न का खतरा न रहे।`
      : `💧 **${cropTitle}** Irrigation Advisory:

- Crop Stage: **${stage}**
- Recommended Schedule: ${guide.irrigation}
- Timing: Irrigate early morning or late evening; ensure proper drainage to prevent root-rot and fungal issues.`;
    return { text, matched: true, kind: "irrigation" };
  }

  return {
    text: hi
      ? `मेरे पास **${name}** की विशिष्ट सिंचाई योजना नहीं है। सामान्य नियम: फूल और फल/दाना बनने की अवस्था में खेत में नमी बनाए रखें, लेकिन जलभराव से बचें।`
      : `I don't have a specific irrigation plan for **${name}**. General rule: prevent moisture stress at flowering and fruit/grain setting, but avoid stagnant water.`,
    matched: true,
    kind: "irrigation",
  };
};

const schemeAnswer = (hi: boolean): LocalAnswer => {
  const list = SCHEMES.map(
    (s, i) => `${i + 1}. **${s.name}** — ${hi ? s.hi : s.en}`
  ).join("\n\n");
  return {
    text: hi
      ? `📜 **प्रमुख सरकारी किसान योजनाएं (Verified Government Schemes)**:\n\n${list}\n\nविवरण व ऑनलाइन आवेदन हेतु आधिकारिक pmkisan.gov.in, pmfby.gov.in या नजदीकी CSC केंद्र से संपर्क करें।`
      : `📜 **Verified Government Schemes for Farmers**:\n\n${list}\n\nFor eligibility and applications, visit the official portals (pmkisan.gov.in, pmfby.gov.in) or your local CSC center.`,
    matched: true,
    kind: "scheme",
  };
};

const cropAnswer = (crop: string, profile: IFarmerProfile | null, hi: boolean): LocalAnswer => {
  const guide = CROP_GUIDES[crop];
  if (guide) {
    const name = crop.charAt(0).toUpperCase() + crop.slice(1);
    const text = hi
      ? `🌱 **${name}** की वैज्ञानिक खेती सारांश:

- **आधार खाद**: ${guide.basal}
- **उपराई खाद**: ${guide.topDress}
- **सिंचाई प्रबंधन**: ${guide.irrigation}
- **प्रमुख कीट व रोग**: ${guide.pests.join(", ")}
- **कटाई सलाह**: ${guide.harvestTip}

विशिष्ट जानकारी हेतु पूछें: "${name} खाद मात्रा", "${name} सिंचाई", "${name} मंडी भाव"।`
      : `🌱 **${name}** Cultivation Summary:

- **Basal Fertilizer**: ${guide.basal}
- **Top Dressing**: ${guide.topDress}
- **Irrigation Schedule**: ${guide.irrigation}
- **Key Pests & Diseases**: ${guide.pests.join(", ")}
- **Harvest Guidance**: ${guide.harvestTip}

Ask specifically: "${name} fertilizer dose", "${name} irrigation", "${name} mandi price".`;
    return { text, matched: true, kind: "crop" };
  }
  return {
    text: hi
      ? `मेरे पास **${crop}** का पूर्ण कृषि गाइड उपलब्ध नहीं है। आप इसकी खाद, सिंचाई, कीट नियंत्रण या मंडी भाव के बारे में विशिष्ट प्रश्न पूछ सकते हैं।`
      : `I don't have a complete guide for **${crop}** yet. You can ask specifically about its fertilizer, irrigation, pest control, or mandi prices.`,
    matched: true,
    kind: "crop",
  };
};

const hasFertilizerIntent = (q: string) =>
  ["fertilizer", "khād", "खाद", "npk", "urea", "यूरिया", "dose", "मात्रा", "आधार", "basal", "top dressing", "उपराई", "उर्वरक", "खत", "ਸਾਰ", "সাৰ", "உரம்", "ఎరువు", "ಗೊಬ್ಬರ", "വളം", "ସାର"].some((k) => q.includes(k));

const hasIrrigationIntent = (q: string) =>
  ["irrigat", "water", "सिंचाई", "पानी", "कब करूं", "pani", "paani", "pehla paani", "पहला पानी", "ਸਿੰਚਾਈ", "પાણી", "সেচ", "நீர்ப்பாசனம்", "సాగునీరు", "ನೀರಾವರಿ", "നന"].some((k) => q.includes(k));

const hasPestIntent = (q: string) =>
  ["pest", "कीट", "insect", "इल्ली", "बग", "bug", "keet", "कीड़े", "कीड़ा", "kida", "keeda", "अळी", "सफेद मक्खी", "ਕੀੜੇ", "જીવાત", "পোকা", "பூச்சி", "పురుగు", "ಕೀಟ", "കീട", "ପୋକ"].some((k) => q.includes(k));

const hasDiseaseIntent = (q: string) =>
  ["disease", "रोग", "leaf", "पत्ती", "yellow", "पीली", "spot", "धब्बे", "wilt", "रोगी", "black spot", "blight", "झुलसा", "रतुआ", "पीलापन", "ਬਿਮਾਰੀ", "રોਗ", "পাহাড়", "நோய்", "తెగులు", "ರೋಗ", "രോഗം", "ରୋଗ", "পাতাপোড়া", "ব্লাস্ট", "bimari"].some((k) => q.includes(k));

const hasSchemeIntent = (q: string) =>
  ["scheme", "योजना", "subsidy", "सब्सिडी", "govt", "government", "pm-kisan", "pmkisan", "kcc", "loan", "कर्ज", "बीमा", "insurance", "yojana", "ਸਕੀਮ", "યોજના", "প্রকল্প", "திட்டம்", "పథకం", "ಯೋಜನೆ", "പദ്ധതി", "ଯୋଜନା"].some((k) => q.includes(k));

const hasCropGuideIntent = (q: string, directCrop: string | null) => {
  if (!directCrop) return false;
  const directCropLower = directCrop.toLowerCase();
  const trimmed = q.trim().toLowerCase().replace(/[.,!?;:]/g, "");
  if (trimmed === directCropLower || trimmed === `crop ${directCropLower}` || trimmed === `${directCropLower} crop`) return true;
  return ["kheti", "खेती", "cultivation", "guide", "farming", "sowing", "care", "dekhbhal", "देखभाल", "jankari", "जानकारी", "overview", "summary", "saransh", "tips", "growing", "production", "सलाह", "सुझाव", "advice", "advise", "ખેતી", "কৃষি", "వివరణ", "ಕೃಷಿ"].some((k) => q.includes(k));
};

const GREETING_WORDS = [
  "namaste", "namaskar", "pranam", "hello", "hi", "hey", "hola",
  "नमस्ते", "नमस्कार", "प्रणाम", "राम राम", "ram ram", "जय जवान", "जय किसान",
  "सत श्री अकाल", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ", "ਨਮਸਤੇ", "ਨਮਸਕਾਰ",
  "નમસ્તે", "નમસ્કાર", "जय श्री कृष्ण",
  "வணக்கம்", "நல்வரவு",
  "నమస్కారం", "నమస్తే",
  "ನಮಸ್ಕಾರ", "ನಮಸ್ಕಾರಗಳು",
  "നമസ്കാരം",
  "নমস্কার", "সালাম",
  "ନମସ୍କାର",
  "নমস্কাৰ"
];

const isGreetingIntent = (q: string) => {
  const trimmed = q.trim().toLowerCase().replace(/[!.,?]/g, "");
  return GREETING_WORDS.some((w) => {
    const lowerW = w.toLowerCase();
    return trimmed === lowerW || trimmed.startsWith(`${lowerW} `) || trimmed.startsWith(`${lowerW} kisan`) || trimmed === `${lowerW} kisan ai` || trimmed === `${lowerW} ai`;
  });
};

const REGIONAL_CUSTOM_RESPONSES: Record<string, (q: string, crop: string | null) => string> = {
  mr: (q, crop) => {
    return `🩺 **सोयाबीन पिवळे पडणे व कीड नियंत्रण (Soybean Advisory)** [Soybean / सोयाबीन]

1. **काय असू शकते (What may be happening)**:
सोयाबीन पिकावर पाने पिवळी पडणे हे नत्र (Nitrogen), लोह (Iron) किंवा झिंकच्या कमतरतेमुळे अथवा खोडमाशी / रसशोषक कीटकांच्या प्रादुर्भावामुळे असू शकते.

2. **काय तपासावे (What farmer can check)**:
पाने खालून पिवळी होत आहेत की वरून ते तपासा. पानाच्या खालच्या बाजूला बारीक कीड किंवा खोडावर छिद्र आहेत का ते पहा.

3. **पुढील पाऊल (Recommended next step)**:
19:19:19 (NPK) खत 5 ग्रॅम प्रति लिटर किंवा चिलेटेड झिंक 1 ग्रॅम/लिटर फवारा. कीड नियंत्रणासाठी 5 मिली निंबोळी अर्क (Neem Oil) फवारा.

4. **सावधानी व सल्ला (Warning & Verification)**:
अतिरिक्त रासायनिक खते टाळा. कोणत्याही फवारणीपूर्वी स्थानिक कृषी विज्ञान केंद्राचा (KVK) सल्ला नक्की घ्या.`;
  },
  pa: (q, crop) => {
    return `🩺 **ਕਣਕ ਦੀ ਪੀਲੀ ਕੁੰਗੀ (Yellow Rust Management)** [Wheat / ਕਣਕ]

1. **ਕੀ ਹੋ ਸਕਦਾ ਹੈ (What may be happening)**:
ਪੀਲੀ ਕੁੰਗੀ (Yellow Rust / Stripe Rust) ਉੱਲੀ ਕਾਰਨ ਕਣਕ ਦੇ ਪੱਤਿਆਂ 'ਤੇ ਪੀਲੀਆਂ ਧਾਰੀਆਂ ਅਤੇ ਪਾਊਡਰ ਬਣ ਜਾਂਦਾ ਹੈ ਜਿਸ ਨਾਲ ਦਾਣਾ ਬਰੀਕ ਰਹਿ ਜਾਂਦਾ ਹੈ।

2. **ਕੀ ਜਾਂਚੋ (What farmer can check)**:
ਪੱਤਿਆਂ ਨੂੰ ਹੱਥ ਲਗਾ ਕੇ ਦੇਖੋ, ਜੇਕਰ ਉਂਗਲਾਂ 'ਤੇ ਹਲਦੀ ਵਰਗਾ ਪੀਲਾ ਪਾਊਡਰ (ਕੁੰਗੀ) ਲੱਗਦਾ ਹੈ ਤਾਂ ਪੁਸ਼ਟੀ ਹੁੰਦੀ ਹੈ।

3. **ਅਗਲਾ ਕਦਮ (Recommended next step)**:
ਸ਼ੁਰੂਆਤੀ ਲੱਛਣ ਦਿਸਦੇ ਹੀ ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ 25 EC (Tilt) @ 1 ਮਿਲੀ ਪ੍ਰਤੀ ਲਿਟਰ ਪਾਣੀ ਜਾਂ ਟੈਬੂਕੋਨਾਜ਼ੋਲ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।

4. **ਸਾਵਧਾਨੀ (Warning & Agronomic Confirmation)**:
ਯੂਰੀਆ ਦੀ ਵੱਧ ਵਰਤੋਂ ਨਾ ਕਰੋ। ਖੇਤੀ ਮਾਹਿਰਾਂ ਅਤੇ KVK ਦੀ ਸਲਾਹ ਅਨੁਸਾਰ ਹੀ ਦਵਾਈ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।`;
  },
  gu: (q, crop) => {
    return `🩺 **કપાસમાં સફેદ માખી અને જીવાત નિયંત્રણ (Cotton Whitefly & Pest Advisory)** [Cotton / કપાસ]

1. **શું થઈ શકે (What may be happening)**:
સફેદ માખી અને રસ ચૂસક જીવાત કપાસના પાનમાંથી રસ ચૂસીને પાકને નબળો પાડે છે અને પાન વળવાનો વાયરસ (Leaf Curl) ફેલાવે છે.

2. **શું તપાસવું (What farmer can check)**:
છોডને હલાવીને સફેદ ઉડતી માખીઓ અને પાનની નીચેના ભાગમાં જીવાત તપાસો.

3. **આગલું પગલું (Recommended next step)**:
ખેતમાં એકરે 8-10 પીળા સ્ટીકી ટ્રેપ લગાવો. લીમડાનું તેલ (Neem Oil 1500 PPM) 5 મિલી/લિટર અથવા થાયામેથોક્સમ 0.2 ગ્રામ/લિટર પાણીમાં છાંટો.

4. **ચેતવણી (Warning & Verification)**:
કીટનાશક છાંટતા પહેલા સ્થાનિક કૃષિ વિજ્ઞાન કેન્દ્ર (KVK) અથવા ખેતી અધિકારીની સલાહ લો.`;
  },
  bn: (q, crop) => {
    return `🩺 **ধানের ব্লাস্ট ও রোগ প্রতিকার (Paddy Blast & Disease Advisory)** [Rice / ধান]

1. **কী হতে পারে (What may be happening)**:
ধানের ব্লাস্ট ও পাতাপোড়া ছত্রাকজনিত মারাত্মক রোগ। এর ফলে পাতার ওপর নৌকার আকৃতির বাদামী দাগ ও ডগা পুড়ে শুকিয়ে যায়।

2. **কী পরীক্ষা করবেন (What farmer can check)**:
পাতায় ও শিষের গোড়ায় কালো-বাদামী দাগ (ব্লাস্ট) এবং পাতা ঝলসে যাওয়া লক্ষ্য করুন।

3. **পরবর্তী পদক্ষেপ (Recommended next step)**:
ট্রাইসাইক্লাজোল 75 WP @ 0.6 গ্রাম/লিটার বা ম্যানকোজেব @ 2 গ্রাম/লিটার জলে গুলে স্প্রে করুন। জমিতে অতিরিক্ত ইউরিয়া সার প্রয়োগ বন্ধ রাখুন।

4. **সতর্কতা (Warning & Verification)**:
কীটনাশক প্রয়োগের সময় সুরক্ষামূলক ব্যবস্থা নিন এবং স্থানীয় কৃষি বিজ্ঞান কেন্দ্রের (KVK) পরামর্শ গ্রহণ করুন।`;
  },
  ta: (q, crop) => {
    return `🩺 **நெல் பயிர் உரம் மற்றும் பூச்சி மேலாண்மை (Paddy Nutrient & Pest Advisory)** [Rice / நெல் பயிர்]

1. **என்ன நடக்கலாம் (What may be happening)**:
நெல் பயிரில் தண்டு துளைப்பான், இலை சுருட்டுப் புழு அல்லது சத்து குறைபாட்டினால் பயிர் வளர்ச்சி குறையலாம்.

2. **என்ன பார்க்க வேண்டும் (What farmer can check)**:
இலைகளில் வெண் புள்ளிகள், நடுக்குருத்து காய்ந்துபோதல் அல்லது தண்டுப் பகுதியில் புழுக்களின் கழிவுகளைப் பார்க்கவும்.

3. **அடுத்த நடவடிக்கை (Recommended next step)**:
அடிப்படை உரம்: ஏக்கருக்கு DAP 30 கிலோ + பொட்டாஷ் 15 கிலோ. இயற்கை முறைக்கு வேப்ப எண்ணெய் (Neem Oil 1500 PPM) 3-5 மி.லி/லிட்டர் தெளிக்கவும்.

4. **எச்சரிக்கை (Warning & Verification)**:
மருந்து தெளிக்கும் முன் உள்ளூர் வேளாண்மை அறிவியல் நிலையத்தின் (KVK) அதிகாரிகளை அணுகி சரியான அளவை உறுதிப்படுத்தவும்.`;
  },
  te: (q, crop) => {
    return `🩺 **మిరప తోటలో నల్లి మరియు తామర పురుగుల నివారణ (Chilli Pest Advisory)** [Chilli / మిరప]

1. **ఏమి జరగవచ్చు (What may be happening)**:
మిరప పంటలో తామర పురుగులు మరియు నల్లి ఆకుల రసం పీల్చడం వల్ల ఆకులు పైకి లేదా కిందికి ముడుచుకుపోతాయి (బొబ్బర రోగం).

2. **ఏమి తనిਖీ చేయాలి (What farmer can check)**:
ఆకుల అడుగు భాగంలో సన్నని పురుగులు, నల్లి గూళ్ళు మరియు పూత రాలడం గమనించండి.

3. **తదుపరి చర్య (Recommended next step)**:
ఎకరానికి 8-10 బ్లూ మరియు ఎల్లో స్టిక్కీ ట్రాప్స్ అమర్చండి. వేప నూనె (Neem Oil) 5 మి.లీ/లీటర్ లేదా ఫిప్రోనిల్ 1.5 మి.లీ/లీటర్ పిచికారీ చేయండి.

4. **జాగ్రత్త (Warning & Verification)**:
మందులు పిచికారీ చేసేటప్పుడు సరైన మోతాదు కొరకు స్థానిక కేవీకే (KVK) వ్యవసాయ నిపుణులను సంప్రదించండి.`;
  },
  kn: (q, crop) => {
    return `🩺 **ಟೊಮೆಟೊ ಬೆಳೆ ರೋಗ ಮತ್ತು ಕೀಟ ನಿರ್ವಹಣೆ (Tomato Pest & Disease Advisory)** [Tomato / ಟೊಮೆಟೊ]

1. **ಏನಾಗಬಹುದು (What may be happening)**:
ಟೊಮೆಟೊ ಬೆಳೆಯಲ್ಲಿ ರಸ ಹೀರುವ ಕೀಟಗಳು, ಎಲೆ ಮುದುರು ರೋಗ ಅಥವಾ ಬ್ಲೈಟ್ ಶಿಲೀಂಧ್ರ ರೋಗದಿಂದ ಎಲೆಗಳು ಒಣಗಬಹುದು.

2. **ಏನು ಪರಿಶೀಲಿಸಬೇಕು (What farmer can check)**:
ಎಲೆಗಳ ಕೆಳಭಾಗದಲ್ಲಿ ಬಿಳಿ ನೊಣಗಳು, ಎಲೆ ಮುದುರಿಕೊಳ್ಳುವುದು ಅಥವಾ ಕಪ್ಪು-ಕಂದು ಕಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.

3. **ಮುಂದಿನ ಹೆಜ್ಜೆ (Recommended next step)**:
ಹಳದಿ ಬಲೆಗಳನ್ನು ಹಾಕಿ. ಬೇವಿನ ಎಣ್ಣೆ (Neem Oil 1500 PPM) 5 ಮಿಲಿ/ಲೀಟರ್ ಅಥವಾ ಮ್ಯಾಂಕೋಜೆಬ್ 2 ಗ್ರಾಂ/ಲೀಟರ್ ಸಿಂಪಡಿಸಿ.

4. **ಎಚ್ಚರಿಕೆ (Warning & Verification)**:
ಯಾವುದೇ ರಾಸಾಯನಿಕ ಸಿಂಪರಣೆಗೆ ಮುನ್ನ ನಿಮ್ಮ ಹತ್ತಿರದ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರದ (KVK) ಸಲಹೆ ಪಡೆದುಕೊಳ್ಳಿ.`;
  },
  ml: (q, crop) => {
    return `🩺 **വാഴ കൃഷി വളപ്രയോഗവും കീട നിയന്ത്രണവും (Banana Advisory)** [Banana / വാഴ കൃഷി]

1. **എന്താണ് സംഭവിക്കുന്നത് (What may be happening)**:
വാഴ കൃഷിയിൽ തടതുരപ്പൻ പുഴു അല്ലെങ്കിൽ സിഗാടോക്ക ഇലപ്പുള്ളി രോഗം മൂലം ഇലകൾ ഉണങ്ങുകയും വളർച്ച കുറയുകയും ചെയ്യാം.

2. **എന്താണ് പരിശോധിക്കേണ്ടത് (What farmer can check)**:
ഇലകളിൽ മഞ്ഞ-തവിട്ടു പുള്ളികൾ, തടയിൽ സുഷിരങ്ങൾ ഉണ്ടോ എന്ന് പരിശോധിക്കുക.

3. **അടുത്ത പടി (Recommended next step)**:
ശരിയായ ജൈവവളത്തോടൊപ്പം പൊട്ടാഷ്, യൂറിയ കൃത്യമായ ഇടവേളകളിൽ നൽകുക (വളപ്രയോഗം). കീടനിയന്ത്രണത്തിന് വേപ്പെണ്ണ മിശ്രിതം (Neem Oil) 5 മില്ലി/ലിറ്റർ തളിക്കുക.

4. **മുന്നറിയിപ്പ് (Warning & Verification)**:
വെള്ളക്കെട്ട് ഒഴിവാക്കുക. രാസകീടനാശിനികൾ ഉപയോഗിക്കുന്നതിന് മുൻപ് കൃഷിഭവനുമായി (KVK) ബന്ധപ്പെടുക.`;
  },
    or: (q, crop) => {
    return `🩺 **ଧାନ ଫସଲ ସାର ପ୍ରୟୋଗ ଓ କୀଟ ନିୟନ୍ତ୍ରଣ (Paddy Advisory)** [Rice / ଧାନ ଫସଲ]

1. **କଣ ହୋଇପାରେ (What may be happening)**:
ଧାନ ଫସଲରେ କାଣ୍ଡବିନ୍ଧା ପୋକ, ପତ୍ରମୋଡା ପୋକ କିମ୍ବା ନାଇଟ୍ରୋଜେନ ଓ ଜିଙ୍କର ଅଭାବ।

2. **କଣ ଯାଞ୍ଚ କରିବେ (What farmer can check)**:
ଧାନ ଗଛର ମଝି କାଣ୍ଡ ଶୁଖିଯିବା (Dead heart) କିମ୍ବା ପତ୍ର ହଳଦିଆ ପଡ଼ିବା ଦେଖନ୍ତୁ।

3. **ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ (Recommended next step)**:
ମାଟି ପରୀକ୍ଷା ଅନୁସାରେ ସାର ପ୍ରୟୋଗ (DAP ଓ ପୋଟାସ) କରନ୍ତୁ। ଜୈବିକ ଭାବେ ନିମ୍ ତେଲ (Neem oil) ୫ ମିଲି/ଲିଟର ସ୍ପ୍ରେ କରନ୍ତୁ।

4. **ସତର୍କତା (Warning & Verification)**:
କୌଣସି ରାସାୟନିକ ଔଷଧ ସ୍ପ୍ରେ କରିବା ପୂର୍ବରୁ ସ୍ଥାନୀୟ କୃଷି ବିଜ୍ଞାନ କେନ୍ଦ୍ର (KVK) ର ପରାମର୍ଶ ନିଅନ୍ତୁ।`;
  },
  as: (q, crop) => {
    return `🩺 **ধান খেতিত সাৰ প্ৰয়োগ আৰু ৰোগ নিয়ন্ত্ৰণ (Paddy Advisory)** [Rice / ধান খেতি]

1. **কি হ'ব পাৰে (What may be happening)**:
ধান খেতিত ব্লাস্ট, পাতপোৰা ৰোগ বা সাৰৰ অভাৱত শস্যৰ বৃদ্ধি বাধাগ্ৰସ୍ত হ'ব পাৰে।

2. **কি পৰীক্ষা কৰিব (What farmer can check)**:
পাতৰ ওপৰত বাদামী দাগ, ডগা শুকোৱা বা পাত হালধীয়া পৰা লক্ষ্য কৰক।

3. **পৰৱৰ্তী পদক্ষেপ (Recommended next step)**:
অনুমোদিত পৰিমাণৰ সাৰ প্ৰয়োগ (ইউৰিয়া, DAP আৰু পটাশ) কৰক। নিম তেল (Neem Oil) ৫ মি.লি./লিটাৰ পানীত মিহলাই স্প্ৰে কৰক।

4. **সতৰ্কবাণী (Warning & Verification)**:
কীটনাশক ব্যৱহাৰ কৰাৰ আগতে স্থানীয় কৃষি বিজ্ঞান কেন্দ্ৰ (KVK) বা কৃষি বিষয়াৰ পৰামৰ্শ লওক।`;
  },
};

export const getLocalAnswer = (
  query: string,
  profile: IFarmerProfile | null,
  lang?: string,
  history?: Array<{ role: string; content: string }>
): LocalAnswer => {
  const q = query.toLowerCase().trim();
  const detected = detectLanguageOf(query);
  const isDevanagari = hasDevanagari(query);
  const isHinglishQuery = isHinglish(query) || isHinglish(q);

  // Target language code (2-letter)
  const targetCode = (lang && lang.length >= 2)
    ? lang.slice(0, 2).toLowerCase()
    : (detected.lang || "en");

  const hi = targetCode === "hi" || isDevanagari || isHinglishQuery;

  // 0. Off-topic guardrail redirection
  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(query))) {
    const offTopicResponse = OFF_TOPIC_RESPONSES[targetCode] || (hi ? OFF_TOPIC_RESPONSES.hi : OFF_TOPIC_RESPONSES.en);
    return {
      text: offTopicResponse,
      matched: true,
      kind: "off_topic",
    };
  }

  // Multi-turn context resolution:
  let crop = detectCrop(query) || detectCrop(q);
  const mandiInQuery = extractMandiLocation(q);

  // Follow-up context recovery (if user says "iska ilaj", "isme spray", "in this crop", "paani kab de")
  const isFollowUpQuery = Boolean(mandiInQuery) || ["isme", "is me", "ismein", "ispe", "is par", "iska", "iski", "iske", "is fasal", "isse", "इसमे", "इसमें", "इसकी", "इसका", "इसके", "for this", "in this", "its", "what spray", "spray batao"].some((w) => q.includes(w));
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

  // 1. Natural greeting
  if (isGreetingIntent(q)) {
    const greetingText = FALLBACK_MESSAGES[targetCode] || (hi ? FALLBACK_MESSAGES.hi : FALLBACK_MESSAGES.en);
    return { text: greetingText, matched: true, kind: "general" };
  }

  // 1a. Regional language custom advisory dispatch
  if (REGIONAL_CUSTOM_RESPONSES[targetCode]) {
    const customFn = REGIONAL_CUSTOM_RESPONSES[targetCode];
    return {
      text: customFn(query, crop),
      matched: true,
      kind: "crop",
    };
  }

  // 1b. User identity / Name query
  if (["mera naam", "mera name", "my name", "who am i", "who i am", "kaun hu", "kaun hoon", "मेरा नाम", "मैं कौन हूं", "मैं कौन हूँ"].some((w) => q.includes(w))) {
    const personalName = profile?.personal?.fullName || (profile as any)?.farmerName || (profile as any)?.name || "";
    const loc = profile?.location?.district || profile?.location?.villageOrTehsil || (profile as any)?.village || "";
    const primaryCrop = profile?.crops?.[0] || (profile as any)?.crop || "";
    if (personalName) {
      const text = hi
        ? `नमस्ते किसान साथी! 🙏 आपकी प्रोफाइल के अनुसार आपका नाम **${personalName}** है।${loc ? ` आप **${loc}** क्षेत्र से हैं।` : ""}${primaryCrop ? ` आपकी मुख्य फसल **${primaryCrop}** है।` : ""}`
        : `Hello farmer friend! 🙏 According to your profile, your name is **${personalName}**.${loc ? ` Region: **${loc}**.` : ""}${primaryCrop ? ` Primary crop: **${primaryCrop}**.` : ""}`;
      return { text, matched: true, kind: "general" };
    } else {
      const text = hi
        ? "नमस्ते किसान भाई! 🙏 आपका नाम अभी प्रोफाइल में दर्ज नहीं है। आप प्रोफाइल (Profile) सेक्शन में जाकर अपना नाम जोड़ सकते हैं!"
        : "Hello farmer friend! 🙏 Your name is not yet registered in your profile. You can add your name in the Profile section anytime!";
      return { text, matched: true, kind: "general" };
    }
  }

  // 1c. Appreciation / Thank you
  if (["dhanyawad", "dhanyavad", "shukriya", "thank", "thanks", "धन्यवाद", "शुक्रिया", "बहुत अच्छा", "bohot accha"].some((w) => q.includes(w))) {
    const thankText = hi
      ? "आपका स्वागत है किसान साथी! 🙏 किसी भी अन्य फसल समस्या या सलाह के लिए बेझिझक पूछें। जय जवान, जय किसान! 🌾"
      : "You're most welcome, farmer friend! 🙏 Feel free to ask anytime for any crop advisory or agricultural assistance. Happy farming! 🌾";
    return { text, matched: true, kind: "general" };
  }

  // 1d. Frost / Cold Wave / Pala Advisory
  if (["pala", "पाला", "frost", "cold wave", "sardi", "thand", "ठंड", "शीतलहर"].some((w) => q.includes(w))) {
    return { text: CLIMATE_ADVISORIES.frost[hi ? "hi" : "en"], matched: true, kind: "crop" };
  }

  // 1e. Heatwave / Summer Crop Care
  if (["heatwave", "heat wave", "garmi", "गर्मी", "लू", "loo", "drought", "सूखा"].some((w) => q.includes(w))) {
    return { text: CLIMATE_ADVISORIES.heatwave[hi ? "hi" : "en"], matched: true, kind: "crop" };
  }

  // 1f. Organic Farming & Bio-fertilizer
  if (["organic", "जैविक", "jeevamrit", "जीवामृत", "neem oil", "नीम तेल", "vermicompost", "केंचुआ खाद", "trichoderma", "ट्राइकोडर्मा"].some((w) => q.includes(w))) {
    return { text: CLIMATE_ADVISORIES.organic[hi ? "hi" : "en"], matched: true, kind: "fertilizer" };
  }

  // 1g. Sowing & Soil Preparation with Crop
  if (crop && ["buwai", "sowing", "taiyari", "mitti ki taiyari", "मिट्टी की तैयारी", "बुआई"].some((w) => q.includes(w))) {
    if (crop === "mustard") {
      const text = hi
        ? `🧪 **सरसों (Mustard) की बुआई व मिट्टी की तैयारी**:

1. **खेत की तैयारी**: 2-3 बार गहरी जुताई कर पाटा लगाएं ताकि मिट्टी भुरभुरी हो जाए और नमी सुरक्षित रहे।
2. **आधार खाद (Basal Dose)**: गोबर की सड़ी खाद (FYM) 3 टन/एकड़ + DAP 25 kg/एकड़ + सिंगल सुपर फॉस्फेट (SSP) 50 kg/एकड़ + गंधक/सल्फर 10 kg/एकड़ बुआई के समय डालें।
3. **बीज उपचार**: 2 ग्राम थीरम या कार्बेंडाजिम प्रति किलो बीज से उपचारित करें।
4. **सावधानी**: तिलहनी फसलों में सल्फर अत्यंत आवश्यक है, मृदा स्वास्थ्य कार्ड के अनुसार ही संतुलित मात्रा दें।`
        : `🧪 **Mustard Sowing & Soil Preparation**:

1. **Field Preparation**: 2-3 deep ploughings followed by planking to create a fine, moisture-retentive seedbed.
2. **Basal Dose**: FYM 3 t/acre + DAP 25 kg/acre + Single Super Phosphate 50 kg/acre + Sulfur 10 kg/acre at sowing.
3. **Seed Treatment**: Treat seeds with Thiram or Carbendazim @ 2 g/kg seed.
4. **Warning**: Sulfur is vital for oilseed crops; verify precise dosages with your Soil Health Card report.`;
      return { text, matched: true, kind: "crop" };
    }
  }

  // 1h. Soil Health & Testing (Generic)
  if ((["soil", "mitti", "मिट्टी", "janch", "जांच", "testing", "परीक्षण"].some((w) => q.includes(w)) || /\bph\b/i.test(q)) && !crop) {
    return { text: CLIMATE_ADVISORIES.soilTest[hi ? "hi" : "en"], matched: true, kind: "scheme" };
  }

  // 1i. Irrigation with stage/crop (Check BEFORE generic weather)
  if (crop && hasIrrigationIntent(q)) {
    return irrigationAnswer(crop, profile, hi);
  }

  // 1j. Generic Weather Advice (only when no specific crop irrigation intent)
  if (["weather", "mausam", "मौसम", "rain radar", "temperature", "तापमान"].some((w) => q.includes(w)) && !hasIrrigationIntent(q)) {
    const weatherText = hi
      ? "🌤️ **मौसम व छिड़काव सलाह**:\n\n• अपने क्षेत्र का सटीक तापमान, वर्षा पूर्वानुमान और छिड़काव अनुकूलता (Spray Window) देखने के लिए होम स्क्रीन पर **Live Weather** कार्ड देखें।\n• नियम: तेज़ हवा (15 किमी/घंटा से अधिक) या बारिश की संभावना होने पर कीटनाशक या खरपतवारनाशक का छिड़काव न करें।"
      : "🌤️ **Weather & Spray Advisory**:\n\n• Check the **Live Weather** card on your Home screen for real-time temperature, rain radar, humidity, and safe spray windows.\n• General rule: Never spray pesticides or foliar nutrition if winds exceed 15 km/h or rainfall is predicted within 6 hours.";
    return { text: weatherText, matched: true, kind: "general" };
  }

  const hinglishMode = isHinglish(query) || isHinglish(q);

  // 2. Mandi price inquiry
  if (hasMandiIntent(q) || (mandiInQuery && crop)) {
    if (!crop) {
      const text = hi
        ? (hinglishMode ? "Kaunsi fasal ka mandi bhav chahiye? Kripya fasal ka naam batayein (jaise: Tamatar, Gehu, Soyabean, Sarson, Pyaz)." : "किस फसल का मंडी भाव चाहिए? कृपया फसल का नाम बताएं (जैसे: टमाटर, गेहूं, सोयाबीन, सरसों, प्याज)।")
        : "Which crop's mandi price do you need? Please specify the crop (e.g. Tomato, Wheat, Soybean, Mustard, Onion).";
      return { text, matched: true, kind: "mandi" };
    }
    return mandiAnswer(crop, hi, hinglishMode, q);
  }

  // 3. Pest diagnosis with mandatory 4-Part Structure
  const pestKey = findPest(q);
  if (pestKey && FOUR_PART_PESTS[pestKey]) {
    const solution = FOUR_PART_PESTS[pestKey];
    return {
      text: formatFourPartResponse(solution, hi, crop || undefined),
      matched: true,
      kind: "pest",
    };
  }

  // 4. Disease diagnosis / Yellow leaves with mandatory 4-Part Structure
  const diseaseKey = findDiseaseKey(q);
  if (diseaseKey && FOUR_PART_DISEASES[diseaseKey]) {
    const solution = FOUR_PART_DISEASES[diseaseKey];
    return {
      text: formatFourPartResponse(solution, hi, crop || undefined),
      matched: true,
      kind: "disease",
    };
  }

  // 5. Clarification Request: Ambiguous disease or vague spray inquiry without specified crop
  if (!crop && (hasDiseaseIntent(q) || hasPestIntent(q) || q === "spray" || q === "spray batao" || q === "दवा बताओ" || q === "dawa batao")) {
    const text = hi
      ? (isHinglishQuery
          ? "**Kaunsi fasal?** Kripya apni **fasal ka naam** batayein — कृपया अपनी फसल का नाम बताएं (jaise: Gehu/Wheat, Dhan/Rice, Kapas/Cotton, Tamatar, Soyabean) aur samasya ke lakshan (jaise: patti peeli hona, kaale dhabbe, murjhana ya keede) bataen, taaki sahi char-charniy vaigyanik upchar de saken. 🌱"
          : "कृपया अपनी फसल का नाम बताएं (जैसे: गेहूं, धान, कपास, टमाटर, सोयाबीन) और समस्या के लक्षण (जैसे: पत्ती पीली पड़ना, काले धब्बे, मुरझाना या कीड़े) बताएं, ताकि सटीक 4-चरणीय वैज्ञानिक उपचार बताया जा सके। 🌱")
      : "Which crop do you need help with? **Kaunsi fasal?** Mention your crop (e.g., Wheat, Rice, Cotton, Tomato, Soybean) and the specific symptoms (e.g. yellowing, black spots, wilting, or insect holes) for a precise 4-part treatment recommendation. 🌱";
    return { text, matched: true, kind: "disease" };
  }

  // 6. Specific farming categories
  if (hasSchemeIntent(q)) return schemeAnswer(hi);
  if (hasFertilizerIntent(q)) return fertilizerAnswer(crop, profile, hi);
  if (hasIrrigationIntent(q)) return irrigationAnswer(crop, profile, hi);
  if (hasPestIntent(q)) {
    const genericPestSol = FOUR_PART_PESTS.caterpillar;
    return {
      text: formatFourPartResponse(genericPestSol, hi, crop || undefined),
      matched: true,
      kind: "pest",
    };
  }
  if (hasDiseaseIntent(q)) {
    const genericDiseaseSol = FOUR_PART_DISEASES.blight;
    return {
      text: formatFourPartResponse(genericDiseaseSol, hi, crop || undefined),
      matched: true,
      kind: "disease",
    };
  }

  // 7. Crop cultivation guide ONLY if user explicitly asked for crop guide
  if (crop && hasCropGuideIntent(q, crop)) {
    return cropAnswer(crop, profile, hi);
  }

  // 8. General conversational fallback (in user's detected / selected language)
  const generalText = FALLBACK_MESSAGES[targetCode] || (hi ? FALLBACK_MESSAGES.hi : FALLBACK_MESSAGES.en);
  return { text: generalText, matched: false, kind: "general" };
};
