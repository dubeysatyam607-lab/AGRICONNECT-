/**
 * VoiceEngine — automatic language detection.
 *
 * Detects the writing system of user input (Devanagari, Gurmukhi, Bengali,
 * Tamil, Telugu, Kannada, Malayalam, Gujarati, Odia, Latin) and recognises
 * common Hinglish farming vocabulary so the assistant can continue the
 * conversation in the language the farmer is actually using.
 */

export type DetectResult = { lang: string; script: string };

const HINGLISH_WORDS = new Set([
  "kya", "kyu", "kaise", "kitna", "kahan", "hai", "nahi", "bhai", "ji",
  "mandi", "bhav", "khet", "kheti", "fasal", "paani", "khaad", "khad",
  "bimari", "rogi", "beej", "bees", "dap", "urea", "pesticide", "upay",
  "karne", "krishi", "ghas", "phool", "tarika", "sahayata", "yojana",
  "subsidy", "sarkar", "aman", "kharif", "rabi", "ganna", "gobar",
]);

const SCRIPT_RANGES: Array<{ script: string; lang: string; start: number; end: number }> = [
  { script: "devanagari", lang: "hi", start: 0x0900, end: 0x097f },
  { script: "gurmukhi", lang: "pa", start: 0x0a00, end: 0x0a7f },
  { script: "gujarati", lang: "gu", start: 0x0a80, end: 0x0aff },
  { script: "bengali", lang: "bn", start: 0x0980, end: 0x09ff },
  { script: "tamil", lang: "ta", start: 0x0b80, end: 0x0bff },
  { script: "telugu", lang: "te", start: 0x0c00, end: 0x0c7f },
  { script: "kannada", lang: "kn", start: 0x0c80, end: 0x0cff },
  { script: "malayalam", lang: "ml", start: 0x0d00, end: 0x0d7f },
  { script: "odia", lang: "or", start: 0x0b00, end: 0x0b7f },
];

/** Return the locale + script of a piece of text, or null when unclear. */
export function detectLanguageOf(text: string): DetectResult | null {
  if (!text) return null;
  const counts = new Map<string, number>();
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code >= 0x41 && code <= 0x5a || code >= 0x61 && code <= 0x7a) {
      counts.set("latin", (counts.get("latin") || 0) + 1);
      continue;
    }
    for (const range of SCRIPT_RANGES) {
      if (code >= range.start && code <= range.end) {
        counts.set(range.script, (counts.get(range.script) || 0) + 1);
        break;
      }
    }
  }
  if (counts.size === 0) return null;

  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;

  if (best[0] === "latin") {
    // Mixed Latin script — is it Hinglish?
    const words = text.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
    const hits = words.filter((w) => HINGLISH_WORDS.has(w)).length;
    if (hits >= 2 && hits / Math.max(words.length, 1) >= 0.25) {
      return { lang: "hi", script: "hinglish" };
    }
    return { lang: "en", script: "latin" };
  }

  const range = SCRIPT_RANGES.find((r) => r.script === best[0]);
  return range ? { lang: range.lang, script: range.script } : null;
}

/** Map an ISO 639-1 code to an Indian BCP47 voice/STT tag. */
export function localeForLang(lang: string): string {
  switch (lang) {
    case "hi": return "hi-IN";
    case "pa": return "pa-IN";
    case "mr": return "mr-IN";
    case "gu": return "gu-IN";
    case "bn": return "bn-IN";
    case "ta": return "ta-IN";
    case "te": return "te-IN";
    case "kn": return "kn-IN";
    case "ml": return "ml-IN";
    case "or": return "or-IN";
    case "as": return "bn-IN"; // Assamese shares the Bengali script family
    default: return "en-IN";
  }
}

/** Human-friendly language name for a detected code. */
export const langLabel = (lang: string): string => {
  switch (lang) {
    case "hi": return "हिंदी";
    case "pa": return "ਪੰਜਾਬੀ";
    case "mr": return "मराठी";
    case "gu": return "ગુજરાતી";
    case "bn": return "বাংলা";
    case "ta": return "தமிழ்";
    case "te": return "తెలుగు";
    case "kn": return "ಕನ್ನಡ";
    case "ml": return "മലയാളം";
    case "or": return "ଓଡ଼ିଆ";
    case "as": return "অসমীয়া";
    default: return "English";
  }
};
