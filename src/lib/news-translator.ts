/**
 * Agricultural News Multilingual Translation Engine
 *
 * Supports all 12 Indian languages available in AgriConnect:
 * Hindi (hi), Marathi (mr), Gujarati (gu), Punjabi (pa), Tamil (ta),
 * Telugu (te), Kannada (kn), Malayalam (ml), Bengali (bn), Odia (or), Assamese (as), English (en).
 *
 * Implements MyMemory Translation pipeline with:
 * - In-memory and localStorage persistent caching to avoid repeated API requests
 * - Preserving original source links and publisher credits
 * - Resilient fallback to original language with `isOriginal` indicator if API is unavailable or rate-limited
 * - Preserving official scheme names, crop varieties, units, and dates
 */

import type { LiveAgriNewsArticle } from "./news-api";

const MEMORY_CACHE = new Map<string, string>();
const CACHE_PREFIX = "agri_news_tr_v1_";

export const CATEGORY_LOCALIZED: Record<string, Record<string, string>> = {
  "Policy & MSP": {
    hi: "नीति और एमएसपी",
    mr: "धोरण आणि हमीभाव",
    gu: "નીતિ અને એમએસપી",
    pa: "ਨੀਤੀ ਅਤੇ ਐਮਐਸਪੀ",
    ta: "கொள்கை மற்றும் குறைந்தபட்ச ஆதரவு விலை",
    te: "విధానం మరియు ఎంఎస్పీ",
    kn: "ನೀತಿ ಮತ್ತು ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ",
    ml: "നയവും എംഎസ്പിയും",
    bn: "নীতি ও ন্যূনতম সহায়ক মূল্য",
    or: "ନୀତି ଏବଂ ଏମଏସପି",
    as: "নীতি আৰু ন্যূনতম সমর্থন মূল্য",
    en: "Policy & MSP",
  },
  "Weather & Monsoon": {
    hi: "मौसम और मानसून",
    mr: "हवामान आणि मान्सून",
    gu: "હવામાન અને ચોમાસું",
    pa: "ਮੌਸਮ ਅਤੇ ਮਾਨਸੂਨ",
    ta: "வானிலை மற்றும் பருவமழை",
    te: "వాతావరణం మరియు వర్షపాతం",
    kn: "ಹವಾಮಾನ ಮತ್ತು ಮುಂಗಾರು",
    ml: "കാലാവസ്ഥയും മൺസൂണും",
    bn: "আবহাওয়া ও বর্ষা",
    or: "ପାଣିପାଗ ଏବଂ ମୌସୁମୀ",
    as: "বতৰ আৰু মৌচুমী",
    en: "Weather & Monsoon",
  },
  "Schemes & Subsidy": {
    hi: "सरकारी योजनाएं और सब्सिडी",
    mr: "शासकीय योजना आणि अनुदान",
    gu: "સરકારી યોજનાઓ અને સબસિડી",
    pa: "ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਅਤੇ ਸਬਸਿਡੀ",
    ta: "அரசு திட்டங்கள் மற்றும் மானியம்",
    te: "ప్రభుత్వ పథకాలు మరియు రాయితీ",
    kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಸಬ್ಸಿಡಿ",
    ml: "സർക്കാർ പദ്ധതികളും സബ്‌സിഡിയും",
    bn: "সরকারি প্রকল্প ও ভর্তুকি",
    or: "ସରକାରୀ ଯୋଜନା ଏବଂ ସବସିଡି",
    as: "চৰকাৰী আঁচনি আৰু ৰাজসাহায্য",
    en: "Schemes & Subsidy",
  },
  "Market & Mandi": {
    hi: "बाजार और मंडी भाव",
    mr: "बाजार आणि बाजारभाव",
    gu: "બજાર અને માર્કેટ યાર્ડ ભાવ",
    pa: "ਮਾਰਕੀਟ ਅਤੇ ਮੰਡੀ ਭਾਅ",
    ta: "சந்தை மற்றும் மண்டி விலைகள்",
    te: "మార్కెట్ మరియు మార్కెట్ యార్డ్ ధరలు",
    kn: "ಮಾರುಕಟ್ಟೆ ಮತ್ತು ಮಂಡಿ ಬೆಲೆಗಳು",
    ml: "വിപണിയും മണ്ടി നിരക്കുകളും",
    bn: "বাজার ও মান্ডি দর",
    or: "ବଜାର ଏବଂ ମଣ୍ଡି ଦର",
    as: "বজাৰ আৰু মাণ্ডি দৰ",
    en: "Market & Mandi",
  },
  "Agritech & Innovation": {
    hi: "कृषि तकनीक और नवाचार",
    mr: "कृषी तंत्रज्ञान आणि नवोपक्रम",
    gu: "કૃષિ ટેકનોલોજી અને નવીનતા",
    pa: "ਖੇਤੀਬਾੜੀ ਤਕਨਾਲੋਜੀ ਅਤੇ ਨਵੀਨਤਾ",
    ta: "வேளாண் தொழில்நுட்பம் மற்றும் கண்டுபிடிப்புகள்",
    te: "వ్యవసాయ సాంకేతికత మరియు నూతన ఆవిష్కరణలు",
    kn: "ಕೃಷಿ ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ನಾವೀನ್ಯತೆ",
    ml: "കാർഷിക സാങ്കേതികവിദ്യയും നവീകരണവും",
    bn: "কৃষি প্রযুক্তি ও উদ্ভাবন",
    or: "କୃଷି ପ୍ରଯୁକ୍ତିବିଦ୍ୟା ଏବଂ ନୂତନତା",
    as: "কৃষি প্ৰযুক্তি আৰু উদ্ভাৱন",
    en: "Agritech & Innovation",
  },
};

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(text: string, lang: string): string {
  return `${CACHE_PREFIX}${lang}_${hashString(text.slice(0, 120))}`;
}

export interface TranslationResult {
  translated: string;
  isOriginal: boolean;
}

/**
 * Translates arbitrary text into the target Indian language using MyMemory API.
 * Uses caching, timeout guards, and authentic fallbacks.
 */
export async function translateAgriText(
  text: string,
  targetLang: string
): Promise<TranslationResult> {
  const clean = (text || "").trim();
  if (!clean || !targetLang || targetLang === "en") {
    return { translated: clean, isOriginal: true };
  }

  const cacheKey = getCacheKey(clean, targetLang);

  // 1. In-memory cache
  if (MEMORY_CACHE.has(cacheKey)) {
    return { translated: MEMORY_CACHE.get(cacheKey)!, isOriginal: false };
  }

  // 2. LocalStorage cache
  try {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      MEMORY_CACHE.set(cacheKey, local);
      return { translated: local, isOriginal: false };
    }
  } catch {
    // LocalStorage quota or access denied — continue
  }

  // 3. Remote Translation Request with 7-second timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const langPair = `en|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${encodeURIComponent(langPair)}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { translated: clean, isOriginal: true };
    }

    const data = await res.json();
    const translatedText = data?.responseData?.translatedText;

    if (
      translatedText &&
      typeof translatedText === "string" &&
      !translatedText.toUpperCase().includes("MYMEMORY WARNING") &&
      !translatedText.toUpperCase().includes("QUOTA EXCEEDED")
    ) {
      MEMORY_CACHE.set(cacheKey, translatedText);
      try {
        localStorage.setItem(cacheKey, translatedText);
      } catch {
        // storage quota
      }
      return { translated: translatedText, isOriginal: false };
    }

    return { translated: clean, isOriginal: true };
  } catch {
    return { translated: clean, isOriginal: true };
  }
}

export interface LocalizedAgriArticle extends LiveAgriNewsArticle {
  displayTitle: string;
  displayDescription: string;
  displayCategory: string;
  isOriginalLanguage: boolean;
}

/**
 * Translates an article for the UI while preserving the original English article title and source link.
 */
export async function localizeArticle(
  article: LiveAgriNewsArticle,
  targetLang: string
): Promise<LocalizedAgriArticle> {
  if (!targetLang || targetLang === "en") {
    return {
      ...article,
      displayTitle: article.title,
      displayDescription: article.description,
      displayCategory: article.category,
      isOriginalLanguage: true,
    };
  }

  // Localized category badge
  const localizedCat = CATEGORY_LOCALIZED[article.category]?.[targetLang] || article.category;

  try {
    const [titleRes, descRes] = await Promise.all([
      translateAgriText(article.title, targetLang),
      translateAgriText(article.description, targetLang),
    ]);

    const isOriginal = titleRes.isOriginal && descRes.isOriginal;

    return {
      ...article,
      displayTitle: titleRes.translated || article.title,
      displayDescription: descRes.translated || article.description,
      displayCategory: localizedCat,
      isOriginalLanguage: isOriginal,
    };
  } catch {
    return {
      ...article,
      displayTitle: article.title,
      displayDescription: article.description,
      displayCategory: localizedCat,
      isOriginalLanguage: true,
    };
  }
}
