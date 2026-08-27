/**
 * VoiceEngine — automatic language detection & auto-adaptation.
 *
 * Detects whether the farmer spoke Devanagari Hindi, Hinglish (Roman Hindi),
 * regional Indian languages, or English.
 *
 * HARD RULE: Kisan AI must always reply in the same language/style as the farmer.
 */

export type DetectResult = {
  lang: string;
  script: 'devanagari' | 'hinglish' | 'latin' | 'gurmukhi' | 'gujarati' | 'bengali' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'odia';
};

// Hindi / Hinglish exclusive words (never appear in standard English)
const HINDI_EXCLUSIVE_WORDS = new Set([
  // Question words
  'kya', 'kyu', 'kyun', 'kaise', 'kitna', 'kitne', 'kitni', 'kahan', 'kaha', 'kab', 'kaun', 'kaunsa', 'kaunsi', 'konsa', 'konsi', 'kisko', 'kisme', 'kismein',
  // Common verbs & auxiliaries
  'hai', 'hain', 'ho', 'hoga', 'hogi', 'hoge', 'tha', 'thi', 'the', 'raha', 'rahe', 'rahi', 'rha', 'rhe', 'rhi',
  'batao', 'bataiye', 'bolo', 'bata', 'bataye', 'chahiye', 'kare', 'karein', 'karna', 'karo', 'dena', 'dijiye',
  'chal', 'lag', 'gaya', 'gayi', 'gaye', 'aayega', 'aayegi', 'milega', 'milegi',
  // Agricultural Hindi words
  'bhav', 'bhaav', 'daam', 'kimat', 'keemat', 'fasal', 'khet', 'kheti', 'kisan', 'kisano',
  'beej', 'bij', 'khad', 'khaad', 'dawa', 'dawai', 'keeda', 'kida', 'rog', 'bimari', 'ill', 'illi', 'sundi',
  'paani', 'pani', 'sinchai', 'mitti', 'janch', 'patta', 'patti', 'peeli', 'peela', 'sukha',
  'yojana', 'karz',
  // Crop names exclusive to Hindi/Hinglish
  'tamatar', 'tamatr', 'gehu', 'gehun', 'gehoon', 'soyabean', 'soya',
  'pyaz', 'pyaj', 'pyaaz', 'kanda', 'aloo', 'aalu', 'batata', 'lahsun', 'lasun', 'lehsun',
  'kapas', 'sarson', 'rai', 'toria', 'dhan', 'chawal',
  'makka', 'makai', 'bhutta', 'ganna', 'mungfali', 'moongfali', 'chana', 'mirch', 'mirchi',
  'adrak', 'haldi', 'jeera',
  // Conversational markers & postpositions
  'bhai', 'ji', 'sahab', 'sahib', 'namaste', 'pranam', 'ram', 'meri', 'mera', 'mere', 'apna', 'apne', 'apni',
  'aaj', 'kal', 'ab', 'abhi', 'thoda', 'jyada', 'zyada', 'accha', 'achha', 'theek', 'shukriya', 'dhanyawad',
  'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'par', 'pe', 'aur', 'ya', 'nahi', 'mat', 'sirf',
]);

const SCRIPT_RANGES: Array<{ script: DetectResult['script']; lang: string; start: number; end: number }> = [
  { script: 'devanagari', lang: 'hi', start: 0x0900, end: 0x097f },
  { script: 'gurmukhi', lang: 'pa', start: 0x0a00, end: 0x0a7f },
  { script: 'gujarati', lang: 'gu', start: 0x0a80, end: 0x0aff },
  { script: 'bengali', lang: 'bn', start: 0x0980, end: 0x09ff },
  { script: 'tamil', lang: 'ta', start: 0x0b80, end: 0x0bff },
  { script: 'telugu', lang: 'te', start: 0x0c00, end: 0x0c7f },
  { script: 'kannada', lang: 'kn', start: 0x0c80, end: 0x0cff },
  { script: 'malayalam', lang: 'ml', start: 0x0d00, end: 0x0d7f },
  { script: 'odia', lang: 'or', start: 0x0b00, end: 0x0b7f },
];

/** Return the locale + script of a piece of text, or null when unclear. */
export function detectLanguageOf(text: string): DetectResult {
  if (!text || !text.trim()) {
    return { lang: 'hi', script: 'hinglish' };
  }

  const counts = new Map<string, number>();
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      counts.set('latin', (counts.get('latin') || 0) + 1);
      continue;
    }
    for (const range of SCRIPT_RANGES) {
      if (code >= range.start && code <= range.end) {
        counts.set(range.script, (counts.get(range.script) || 0) + 1);
        break;
      }
    }
  }

  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  // 1. Devanagari Hindi or other Indian Indic scripts
  if (best && best[0] !== 'latin') {
    const range = SCRIPT_RANGES.find((r) => r.script === best[0]);
    if (range) {
      // Disambiguate Bengali vs Assamese (shared Unicode block 0x0980-0x09FF)
      if (range.lang === 'bn') {
        const assameseChars = text.match(/[ৰৱ]/g);
        // Bengali-specific chars incl. vowel signs (combining marks) — intentional
        // eslint-disable-next-line no-misleading-character-class
        const bengaliOnlyChars = text.match(/[\u09E7\u0982\u0983\u0981\u09BC\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC]/g);
        if (assameseChars && assameseChars.length > 0 && (!bengaliOnlyChars || assameseChars.length >= bengaliOnlyChars.length)) {
          return { lang: 'as', script: 'bengali' };
        }
      }
      return { lang: range.lang, script: range.script };
    }
  }

  // 2. Latin script — analyze if Hinglish vs pure English
  const cleanText = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const words = cleanText.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { lang: 'hi', script: 'hinglish' };
  }

  const hindiHits = words.filter((w) => HINDI_EXCLUSIVE_WORDS.has(w)).length;

  // If there is ANY strong Hindi-exclusive word (e.g. "tamatar", "bhav", "kya", "batao", "gehu", "pyaz", "chahiye")
  if (hindiHits > 0) {
    return { lang: 'hi', script: 'hinglish' };
  }

  // Pure English structure check (e.g. "what is", "how to", "price of", "where can", "tell me")
  const hasEnglishPattern = /\b(what is|what's|how to|how do|how can|where is|tell me|when to|price of|rate of|is there|can you)\b/i.test(text);
  if (hasEnglishPattern) {
    return { lang: 'en', script: 'latin' };
  }

  // Mixed or short phrases like "mandi" or loanwords
  if (words.some((w) => w === 'mandi' || w === 'mandy')) {
    return { lang: 'hi', script: 'hinglish' };
  }

  return { lang: 'en', script: 'latin' };
}

/** Map an ISO 639-1 code to an Indian BCP47 voice/STT tag. */
export function localeForLang(lang: string): string {
  switch (lang) {
    case 'hi':
      return 'hi-IN';
    case 'pa':
      return 'pa-IN';
    case 'mr':
      return 'mr-IN';
    case 'gu':
      return 'gu-IN';
    case 'bn':
      return 'bn-IN';
    case 'ta':
      return 'ta-IN';
    case 'te':
      return 'te-IN';
    case 'kn':
      return 'kn-IN';
    case 'ml':
      return 'ml-IN';
    case 'or':
      return 'or-IN';
    case 'as':
      return 'as-IN';
    default:
      return 'en-IN';
  }
}

/** Human-friendly language name for a detected code. */
export const langLabel = (lang: string): string => {
  switch (lang) {
    case 'hi':
      return 'हिंदी / Hinglish';
    case 'pa':
      return 'ਪੰਜਾਬੀ';
    case 'mr':
      return 'मराठी';
    case 'gu':
      return 'ગુજરાતી';
    case 'bn':
      return 'বাংলা';
    case 'ta':
      return 'தமிழ்';
    case 'te':
      return 'తెలుగు';
    case 'kn':
      return 'ಕನ್ನಡ';
    case 'ml':
      return 'മലയാളം';
    case 'or':
      return 'ଓଡ଼ିଆ';
    case 'as':
      return 'অসমীয়া';
    default:
      return 'English';
  }
};

/**
 * Sarvam AI Text-to-Speech Unified Configuration for all 12 Indian languages.
 * Default voice: Subh (clear, warm, conversational, farmer-friendly).
 */
export interface SarvamLanguageConfig {
  appLang: string;
  sarvamCode: string;
  displayName: string;
  speaker: string;
  fallbackLanguage: string;
}

export const SARVAM_LANGUAGE_MAP: Record<string, SarvamLanguageConfig> = {
  en: { appLang: 'en', sarvamCode: 'en-IN', displayName: 'English (India)', speaker: 'shubh', fallbackLanguage: 'hi-IN' },
  hi: { appLang: 'hi', sarvamCode: 'hi-IN', displayName: 'Hindi (हिंदी)', speaker: 'shubh', fallbackLanguage: 'en-IN' },
  mr: { appLang: 'mr', sarvamCode: 'mr-IN', displayName: 'Marathi (मराठी)', speaker: 'shubh', fallbackLanguage: 'hi-IN' },
  gu: { appLang: 'gu', sarvamCode: 'gu-IN', displayName: 'Gujarati (ગુજરાતી)', speaker: 'shubh', fallbackLanguage: 'hi-IN' },
  pa: { appLang: 'pa', sarvamCode: 'pa-IN', displayName: 'Punjabi (ਪੰਜਾਬੀ)', speaker: 'shubh', fallbackLanguage: 'hi-IN' },
  ta: { appLang: 'ta', sarvamCode: 'ta-IN', displayName: 'Tamil (தமிழ்)', speaker: 'shubh', fallbackLanguage: 'en-IN' },
  te: { appLang: 'te', sarvamCode: 'te-IN', displayName: 'Telugu (తెలుగు)', speaker: 'shubh', fallbackLanguage: 'en-IN' },
  kn: { appLang: 'kn', sarvamCode: 'kn-IN', displayName: 'Kannada (ಕನ್ನಡ)', speaker: 'shubh', fallbackLanguage: 'en-IN' },
  ml: { appLang: 'ml', sarvamCode: 'ml-IN', displayName: 'Malayalam (മലയാളം)', speaker: 'shubh', fallbackLanguage: 'en-IN' },
  bn: { appLang: 'bn', sarvamCode: 'bn-IN', displayName: 'Bengali (বাংলা)', speaker: 'shubh', fallbackLanguage: 'hi-IN' },
  or: { appLang: 'or', sarvamCode: 'od-IN', displayName: 'Odia (ଓଡ଼ିଆ)', speaker: 'shubh', fallbackLanguage: 'hi-IN' },
  as: { appLang: 'as', sarvamCode: 'as-IN', displayName: 'Assamese (অসমীয়া)', speaker: 'shubh', fallbackLanguage: 'bn-IN' },
};

export function getSarvamLanguageCode(lang: string = 'hi'): string {
  if (!lang) return 'hi-IN';
  const clean = lang.toLowerCase().split('-')[0].trim();
  return SARVAM_LANGUAGE_MAP[clean]?.sarvamCode || 'hi-IN';
}

export function getSarvamSpeaker(lang: string = 'hi'): string {
  if (!lang) return 'shubh';
  const clean = lang.toLowerCase().split('-')[0].trim();
  return SARVAM_LANGUAGE_MAP[clean]?.speaker || 'shubh';
}

