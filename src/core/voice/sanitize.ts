/**
 * VoiceEngine — Text Preprocessor for Speech Synthesis (TTS).
 *
 * Sanitizes raw AI response text before sending to ElevenLabs so that NOTHING
 * is ever read aloud except natural human speech:
 * 1. Strips code blocks, inline code, HTML tags, JSON snippets, raw URLs.
 * 2. Strips all Markdown formatting (#, **, *, __, _, ~~, >, ---, |, bullets).
 * 3. Removes emojis and un-speakable unicode symbols.
 * 4. Expands abbreviations and replaces symbols (units, %, ₹, °, &, +, =, /)
 *    with natural human speech in Hindi or English.
 * 5. Collapses stray formatting characters so TTS never reads colons, hashes,
 *    asterisks, brackets, backslashes or danda-separated fragments aloud.
 */

const EMOJI_AND_SYMBOLS_REGEX =
  // eslint-disable-next-line no-misleading-character-class -- intentional: variation selectors U+FE0F attach to emoji glyphs we must strip
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FB}\u{25FC}\u{25B6}\u{25C0}\u{1F200}-\u{1F251}\u{FE00}-\u{FE0F}]/gu;

/** Characters that can survive to TTS. Everything else is spacing / speech. */
// eslint-disable-next-line no-misleading-character-class -- intentional: Devanagari/Tamil/etc. whitelist includes combining vowel signs (matras)
const KEEP_REGEX = /[^a-zA-Z\u{0900}-\u{097F}\u{0A00}-\u{0A7F}\u{0980}-\u{09FF}\u{0A80}-\u{0AFF}\u{0B00}-\u{0B7F}\u{0B80}-\u{0BFF}\u{0C00}-\u{0C7F}\u{0C80}-\u{0CFF}\u{0D00}-\u{0D7F}\u{1F00}-\u{1FFF}\u{0E00}-\u{0E7F}\u{0F00}-\u{0FFF}0-9.,!?।…'’-]/gu;

/**
 * Main sanitization function for TTS inputs. Guarantees the output contains
 * only speakable characters — no markdown, no HTML, no JSON, no URLs, no
 * symbols, no emoji — for both Hindi (Devanagari) and English.
 */
export function prepareTextForTTS(text: string, lang: string = "hi-IN"): string {
  if (!text || typeof text !== "string") return "";

  const isHindi = (lang || "").toLowerCase().startsWith("hi");
  let out = text;

  // 1. Remove code blocks (```...```) and inline code (`...`)
  out = out.replace(/```[\s\S]*?```/g, " ");
  out = out.replace(/`([^`]+)`/g, "$1");

  // 2. Remove JSON-like structures if accidentally included
  out = out.replace(/\{[\s\S]*?\}/g, " ");
  out = out.replace(/\[[\s\S]*?\]/g, (match) => {
    // Only strip if looks like JSON array (e.g. ["a", "b"]) rather than link text
    if (/^\s*\[\s*["'{]/.test(match)) return " ";
    return match;
  });

  // 3. Remove HTML tags
  out = out.replace(/<[^>]*>/g, " ");

  // 4. Remove URLs unless explicitly requested by context (e.g. http://, https://, www.)
  out = out.replace(/\bhttps?:\/\/\S+/gi, " ");
  out = out.replace(/\bwww\.\S+/gi, " ");

  // 5. Clean Markdown link syntax [link text](url) -> keep link text
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 6. Remove Markdown headers (# Header, ##SUGGESTIONS## etc.)
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/\s+#{1,6}\s+/g, " ");
  out = out.replace(/^##[^\n]*$/gm, " ");
  out = out.replace(/\s##[^\n]*$/gm, " ");

  // 7. Remove horizontal rules (---, ***, ___)
  out = out.replace(/^[-*_]{3,}\s*$/gm, " ");

  // 8. Remove blockquotes (>)
  out = out.replace(/^\s*>\s*/gm, "");

  // 9. Remove Markdown list bullet markers (- , * , + , • , 1. , 2. )
  out = out.replace(/^\s*[-*+•]\s+/gm, "");
  out = out.replace(/^\s*\d+[.)]\s+/gm, "");

  // 10. Remove table pipes (|) and formatting separators
  out = out.replace(/\|/g, " ");

  // 11. Remove bold, italics, strikethrough (**, *, __, _, ~~)
  out = out.replace(/\*\*(.*?)\*\*/g, "$1");
  out = out.replace(/\*(.*?)\*/g, "$1");
  out = out.replace(/__(.*?)__/g, "$1");
  out = out.replace(/_(.*?)_/g, "$1");
  out = out.replace(/~~(.*?)~~/g, "$1");

  // 12. Replace abbreviations and common technical/agri terms
  if (isHindi) {
    out = out.replace(/\bPM-?Kisan\b/gi, "पीएम किसान");
    out = out.replace(/\bPMFBY\b/gi, "प्रधानमंत्री फसल बीमा योजना");
    out = out.replace(/\bKCC\b/gi, "किसान क्रेडिट कार्ड");
    out = out.replace(/\bNPK\b/gi, "एनपीके");
    out = out.replace(/\bMSP\b/gi, "एमएसपी");
    out = out.replace(/\bFPO\b/gi, "एफपीओ");
    out = out.replace(/\bAPMC\b/gi, "एपीएमसी");
    out = out.replace(/\bKVK\b/gi, "कृषि विज्ञान केंद्र");
    out = out.replace(/\bUrea\b/gi, "यूरिया");
    out = out.replace(/\bDAP\b/gi, "डीएपी");
    out = out.replace(/\bDr\.?\b/gi, "डॉक्टर");
    out = out.replace(/\betc\.?\b/gi, "वगैरह");
    out = out.replace(/\be\.?g\.?\b/gi, "उदाहरण के लिए");
    out = out.replace(/\bi\.?e\.?\b/gi, "यानी");
    out = out.replace(/\bapprox\.?\b/gi, "लगभग");
    out = out.replace(/\bvs\.?\b/gi, "बनाम");
    out = out.replace(/\bmax\.?\b/gi, "अधिकतम");
    out = out.replace(/\bmin\.?\b/gi, "न्यूनतम");
    out = out.replace(/\bNo\.\b/gi, "नंबर");

    // Units in Hindi
    out = out.replace(/(\d+)\s*°\s*C\b/gi, "$1 डिग्री सेल्सियस");
    out = out.replace(/(\d+)\s*°\s*F\b/gi, "$1 डिग्री फ़ारेनहाइट");
    out = out.replace(/°\s*C\b/gi, "डिग्री सेल्सियस");
    out = out.replace(/°\s*F\b/gi, "डिग्री फ़ारेनहाइट");
    out = out.replace(/°/g, " डिग्री ");
    out = out.replace(/(\d+)\s*%/g, "$1 प्रतिशत");
    out = out.replace(/%/g, " प्रतिशत ");
    out = out.replace(/(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, "$1 रुपये");
    out = out.replace(/(?:₹|Rs\.?|INR)/gi, " रुपये ");
    out = out.replace(/(\b\d+)\s*kg\b/gi, "$1 किलोग्राम");
    out = out.replace(/\bkg\/acre\b/gi, "किलोग्राम प्रति एकड़");
    out = out.replace(/\bkg\/ha\b/gi, "किलोग्राम प्रति हेक्टेयर");
    out = out.replace(/\bkg\b/gi, "किलोग्राम");
    out = out.replace(/\bqtl\b/gi, "क्विंटल");
    out = out.replace(/\bquintal\b/gi, "क्विंटल");
    out = out.replace(/\bacre\b/gi, "एकड़");
    out = out.replace(/\bha\b/gi, "हेक्टेयर");
    out = out.replace(/\bmm\b/gi, "मिलीमीटर");
    out = out.replace(/\bcm\b/gi, "सेंटिमीटर");
    out = out.replace(/\bkm\b/gi, "किलोमीटर");
    out = out.replace(/\bper\b/gi, "प्रति");
    out = out.replace(/\//g, " प्रति ");
  } else {
    out = out.replace(/(\d+)\s*°\s*C\b/gi, "$1 degrees Celsius");
    out = out.replace(/(\d+)\s*°\s*F\b/gi, "$1 degrees Fahrenheit");
    out = out.replace(/°\s*C\b/gi, "degrees Celsius");
    out = out.replace(/°\s*F\b/gi, "degrees Fahrenheit");
    out = out.replace(/°/g, " degrees ");
    out = out.replace(/(\d+)\s*%/g, "$1 percent");
    out = out.replace(/%/g, " percent ");
    out = out.replace(/(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, "$1 rupees");
    out = out.replace(/(?:₹|Rs\.?|INR)/gi, " rupees ");
    out = out.replace(/\bkg\/acre\b/gi, "kilogram per acre");
    out = out.replace(/\bkg\/ha\b/gi, "kilogram per hectare");
    out = out.replace(/\bkg\b/gi, "kilogram");
    out = out.replace(/\bqtl\b/gi, "quintal");
    out = out.replace(/\bDr\.?\b/gi, "Doctor");
    out = out.replace(/\betc\.?\b/gi, "etcetera");
    out = out.replace(/\be\.?g\.?\b/gi, "for example");
    out = out.replace(/\bi\.?e\.?\b/gi, "that is");
    out = out.replace(/\bapprox\.?\b/gi, "approximately");
    out = out.replace(/\bvs\.?\b/gi, "versus");
    out = out.replace(/\bmax\.?\b/gi, "maximum");
    out = out.replace(/\bmin\.?\b/gi, "minimum");
    out = out.replace(/\bNo\.\b/gi, "number");
    out = out.replace(/\//g, " per ");
  }

  // 13. Replace common mathematical / relational symbols with words
  out = out.replace(/\s*\+\s*/g, isHindi ? " प्लस " : " plus ");
  out = out.replace(/\s*=\s*/g, isHindi ? " बराबर " : " equals ");
  out = out.replace(/\s*&\s*/g, isHindi ? " और " : " and ");
  out = out.replace(/\s*@\s*/g, " at ");
  out = out.replace(/~/g, isHindi ? " लगभग " : " approximately ");
  out = out.replace(/>=\s*(\d)/g, isHindi ? " कम से कम $1 " : " at least $1 ");
  out = out.replace(/<=\s*(\d)/g, isHindi ? " अधिकतम $1 " : " at most $1 ");
  out = out.replace(/>\s*(\d)/g, isHindi ? " $1 से अधिक " : " above $1 ");
  out = out.replace(/<\s*(\d)/g, isHindi ? " $1 से कम " : " below $1 ");

  // 14. Remove emojis and pictograms
  out = out.replace(EMOJI_AND_SYMBOLS_REGEX, "");

  // 15. Kill any remaining stray formatting characters so they are NEVER spoken
  out = out.replace(/[:<>#[\]{}()^*\\~`|]/g, " ");
  out = out.replace(/["\u201c\u201d\u2018\u2019]/g, "");
  out = out.replace(/\s-\s/g, ", ");
  out = out.replace(/--+/g, ", ");

  // 16. Drop anything that is not a speakable letter/digit/pause character
  out = out.replace(KEEP_REGEX, " ");

  // 17. Normalize whitespace and trailing punctuation
  out = out.replace(/\s+/g, " ").trim();

  // Remove orphan punctuation at start
  out = out.replace(/^[,.!?।…\s]+/, "");

  if (out && !/[.!?।…]$/.test(out)) {
    out += isHindi ? "।" : ".";
  }

  return out;
}
