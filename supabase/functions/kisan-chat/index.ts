import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { kisanChatRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";
import { aiChatCompletion, AiGatewayError, type AiMessage } from "../_shared/ai-gateway.ts";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'POST, OPTIONS');
}

const AUTH_RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 1000 };
const GUEST_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 1000 };

const DEFAULT_SUGGESTIONS = [
  "नजदीकी मंडी और कीमतें क्या हैं?",
  "खाद (उर्वरक) की सही मात्रा बताएं",
  "सिंचाई का सही समय और तरीका",
  "कीट नियंत्रण के जैविक उपाय",
  "सरकारी योजनाएं और सब्सिडी",
  "फसल रोग की जांच (फोटो भेजें)",
];

/**
 * Strip the literal "##SUGGESTIONS##" trailer the model is instructed to emit
 * and return { body, suggestions }. Bullet/heading markers are also collapsed
 * to plain conversational lines so nothing is ever read aloud as a symbol.
 */
function parseSuggestions(
  raw: string,
): { body: string; suggestions: string[] } {
  if (!raw) return { body: "", suggestions: DEFAULT_SUGGESTIONS };

  // Split at the suggestions marker (handles trailing whitespace/lines).
  const markerIndex = raw.indexOf("##SUGGESTIONS##");
  const bodyPart =
    markerIndex >= 0 ? raw.slice(0, markerIndex) : raw;

  // The segment after the marker holds the 3 follow-up questions.
  let suggestions: string[] = [];
  if (markerIndex >= 0) {
    suggestions = raw
      .slice(markerIndex + "##SUGGESTIONS##".length)
      .split(/\n+/)
      .map((line) =>
        line
          .replace(/^[-*•*#*]+\s*/, "")
          .replace(/^\d+[.)]\s*/, "")
          .trim()
      )
      .filter((line) => line.length > 0 && line.length <= 90)
      .slice(0, 3);
  }

  const body = bodyPart
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\s*[-*+•]\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim()
    )
    .filter((line) => line.length > 0 && !/^[-=*]{3,}$/.test(line))
    .join("\n")
    .trim();

  if (suggestions.length === 0) suggestions = DEFAULT_SUGGESTIONS;
  return { body, suggestions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side language detection (spec §1: reply in the user's own language).
// Uses Unicode script ranges of the latest user message — no third-party NLP.
// ─────────────────────────────────────────────────────────────────────────────
const SCRIPT_RANGES: Array<{ lang: string; display: string; ranges: Array<[number, number]> }> = [
  { lang: "hi", display: "Hindi (हिंदी)", ranges: [[0x0900, 0x097F]] },      // Devanagari
  { lang: "pa", display: "Punjabi (ਪੰਜਾਬੀ)", ranges: [[0x0A00, 0x0A7F]] },    // Gurmukhi
  { lang: "bn", display: "Bengali (বাংলা)", ranges: [[0x0980, 0x09FF]] },
  { lang: "gu", display: "Gujarati (ગુજરાતી)", ranges: [[0x0A80, 0x0AFF]] },
  { lang: "or", display: "Odia (ଓଡ଼ିଆ)", ranges: [[0x0B00, 0x0B7F]] },
  { lang: "ta", display: "Tamil (தமிழ்)", ranges: [[0x0B80, 0x0BFF]] },
  { lang: "te", display: "Telugu (తెలుగు)", ranges: [[0x0C00, 0x0C7F]] },
  { lang: "kn", display: "Kannada (ಕನ್ನಡ)", ranges: [[0x0C80, 0x0CFF]] },
  { lang: "ml", display: "Malayalam (മലയാളം)", ranges: [[0x0D00, 0x0D7F]] },
  { lang: "as", display: "Assamese (অসমীয়া)", ranges: [[0x0980, 0x09FF]] },
];

const HINGLISH_KEYWORDS = [
  "kya", "hai", "hain", "kaise", "kare", "karna", "ka", "ki", "ke", "ko", "me", "mein",
  "bhav", "bhaav", "rate", "kheti", "dawa", "dawai", "khad", "paani", "pani",
  "rog", "kida", "keeda", "beej", "kitna", "kitni", "konsi", "kaunsi", "kab",
  "kaha", "kahan", "batao", "bataiye", "bhai", "namaste", "pranam", "fasal",
  "patta", "patti", "peela", "sukha", "kharif", "rabi", "mandi", "tamatr", "tamatar",
  "aalu", "aloo", "pyaj", "pyaz", "gehu", "gehun", "chana", "sarson", "mirch", "lahsun",
  "ganna", "chawal", "dhan", "makka", "kisan", "spray", "jhulsa", "ilaj", "keede", "upay",
  "yojana", "paisey", "paisa", "rupaye", "rupiya", "dost", "bhaiya", "madad", "help", "samasya",
  "kharab", "bachav", "tarika", "kaise", "kab", "kyu", "kyon", "karen"
];

export const CROP_DICTIONARY: Record<string, string> = {
  tomato: "Tomato",
  tamatar: "Tomato",
  tamatr: "Tomato",
  tomaatar: "Tomato",
  "टमाटर": "Tomato",
  wheat: "Wheat",
  gehu: "Wheat",
  gehun: "Wheat",
  "गेहूं": "Wheat",
  "गेहू": "Wheat",
  soybean: "Soybean",
  soya: "Soybean",
  "सोयाबीन": "Soybean",
  onion: "Onion",
  pyaj: "Onion",
  pyaz: "Onion",
  kanda: "Onion",
  "प्याज": "Onion",
  "प्याज़": "Onion",
  "कांदा": "Onion",
  potato: "Potato",
  aloo: "Potato",
  aalu: "Potato",
  "आलू": "Potato",
  cotton: "Cotton",
  kapas: "Cotton",
  kapaas: "Cotton",
  "कपास": "Cotton",
  mustard: "Mustard",
  sarson: "Mustard",
  rai: "Mustard",
  "सरसों": "Mustard",
  "राई": "Mustard",
  chana: "Gram",
  gram: "Gram",
  channa: "Gram",
  "चना": "Gram",
  rice: "Rice",
  paddy: "Paddy",
  chawal: "Rice",
  dhan: "Paddy",
  "चावल": "Rice",
  "धान": "Paddy",
  chilli: "Chilli",
  chili: "Chilli",
  mirch: "Chilli",
  mirchi: "Chilli",
  "मिर्च": "Chilli",
  garlic: "Garlic",
  lahsun: "Garlic",
  lehsan: "Garlic",
  "लहसुन": "Garlic",
  ginger: "Ginger",
  adrak: "Ginger",
  "अदरक": "Ginger",
  turmeric: "Turmeric",
  haldi: "Turmeric",
  "हल्दी": "Turmeric",
  maize: "Maize",
  makka: "Maize",
  makai: "Maize",
  corn: "Maize",
  "मक्का": "Maize",
  sugarcane: "Sugarcane",
  ganna: "Sugarcane",
  "गन्ना": "Sugarcane",
  bajra: "Bajra",
  "बाजरा": "Bajra",
  jowar: "Jowar",
  "ज्वार": "Jowar",
  moong: "Moong",
  mung: "Moong",
  "मूंग": "Moong",
  urad: "Urad",
  "उड़द": "Urad",
  groundnut: "Groundnut",
  mungfali: "Groundnut",
  peanut: "Groundnut",
  "मूंगफली": "Groundnut",
};

/** Extracts any specific crop mentioned in the user message */
export function extractMentionedCrop(text: string): { englishName: string; rawTerm: string } | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(CROP_DICTIONARY)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, "i");
    if (regex.test(lower)) {
      return { englishName: val, rawTerm: key };
    }
  }
  return null;
}

/** Detect the dominant language script or Roman-Hindi/Hinglish in a string. */
function detectLanguage(text: string): { lang: string; display: string } | null {
  if (!text) return null;

  // Direct Devanagari test
  if (/[\u0900-\u097F]/.test(text)) {
    return { lang: "hi", display: "Hindi (हिंदी)" };
  }

  const counts = new Map<string, number>();
  for (const char of text) {
    const code = char.codePointAt(0)!;
    for (const s of SCRIPT_RANGES) {
      if (code >= s.ranges[0][0] && code <= s.ranges[0][1]) {
        counts.set(s.lang, (counts.get(s.lang) || 0) + 1);
        break;
      }
    }
  }
  let best: { lang: string; display: string; count: number } | null = null;
  for (const s of SCRIPT_RANGES) {
    const count = counts.get(s.lang) || 0;
    if (count > 0 && (!best || count > best.count)) best = { lang: s.lang, display: s.display, count };
  }
  if (best) {
    if (best.lang === "bn") {
      const asLetters = (text.match(/[ৰৱ](?![ংঢ])/g) || []).length;
      if (asLetters > 2) return { lang: "as", display: "Assamese (অসমীয়া)" };
    }
    return { lang: best.lang, display: best.display };
  }

  // Check for Hinglish / Roman Hindi keywords
  const words = text.toLowerCase().split(/\s+/);
  let hinglishHits = 0;
  for (const w of words) {
    const cleanWord = w.replace(/[^a-z]/g, "");
    if (cleanWord && HINGLISH_KEYWORDS.includes(cleanWord)) {
      hinglishHits++;
    }
  }
  if (hinglishHits >= 1) {
    return { lang: "hi", display: "Hindi (हिंदी)" };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool layer (spec §5): real data via existing edge functions. Each tool returns
// a compact JSON snapshot to inject into the prompt. NEVER fabricate values —
// if the source fails, the AI is told the data is unavailable.
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function fetchWithTimeout(url: string, init: RequestInit, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function invokeTool(fnName: string, body: unknown): Promise<unknown> {
  const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Heuristic intent detection — maps a question to the tools it needs. */
function detectToolNeeds(text: string): Array<"weather" | "mandi" | "scheme"> {
  const t = text.toLowerCase();
  const needs: Array<"weather" | "mandi" | "scheme"> = [];
  const mandiWords = ["mandi", "bhav", "rate", "price", "मंडी", "भाव", "कीमत", "दर", "बाज़ार", "बाजार", "sell", "bech", "tamatr", "tamatar", "gehu", "soya", "daam", "dam", "दाम", "khaareed", "खरीद", "बेच", "quintal", "क्विंटल", "qtl", "market", "bazaar", "arhat", "arhatiya", "आढ़त", "आढ़तिया", "moong", "moongfali", "chana", "masoor", "groundnut", "cotton", "kapas", "कपास", "sugarcane", "ganna", "गन्ना", "rice", "chawal", "चावल", "maize", "makka", "मक्का", "bajra", "बाजरा", "jowar", "ज्वार", "arhar", "अरहर", "urad", "उड़द", "mustard", "sarson", "सरसों", "potato", "aalu", "आलू", "pyaz", "प्याज", "mirch", "मिर्च", "adrak", "अदरक", "lehsun", "लहसुन", "palak", "पालक", "bhindi", "भिंडी", "baigan", "बैंगन", "gobi", "गोभी", "torai", "तोरई", "lauki", "लौकी", "kaddu", "कद्दू", "watermelon", "tarbooj", "तरबूज", "angoor", "अंगूर", "seb", "सेब", "kela", "केला", "nimbu", "नींबू", "nariyal", "नारियल", "papita", "पपीता"];
  const weatherWords = ["weather", "rain", "mausam", "मौसम", "बारिश", "बरसात", "temperature", "तापमान", "forecast"];
  const schemeWords = ["scheme", "yojana", "subsidy", "योजना", "सब्सिडी", "pm kisan", "kcc", "pmfby", "loan"];

  for (const w of weatherWords) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i').test(t)) {
      needs.push("weather");
      break;
    }
  }
  for (const w of mandiWords) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i').test(t)) {
      needs.push("mandi");
      break;
    }
  }
  for (const w of schemeWords) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i').test(t)) {
      needs.push("scheme");
      break;
    }
  }
  return needs;
}

async function runTools(
  userMessage: string,
  location: { latitude?: number; longitude?: number } | undefined,
): Promise<{ toolsContext: string; toolsUsed: string[]; detectedCrop: string | null }> {
  const needs = detectToolNeeds(userMessage);
  const cropInfo = extractMentionedCrop(userMessage);

  const toolsUsed: string[] = [];
  const blocks: string[] = [];

  if (needs.includes("weather")) {
    toolsUsed.push("get_weather");
    const payload: Record<string, unknown> = {};
    if (location?.latitude && location?.longitude) {
      payload.latitude = location.latitude;
      payload.longitude = location.longitude;
    }
    const data = await invokeTool("weather", payload);
    if (data && typeof data === "object" && (typeof (data as any).temp === "number" || "current" in (data as any))) {
      const wData = data as any;
      const weatherSummary = {
        location: wData.location?.name || "Current Location",
        temp: `${wData.temp ?? wData.current?.temp}°C`,
        feelsLike: `${wData.feelsLike ?? wData.temp}°C`,
        condition: wData.condition || wData.live?.condition,
        humidity: `${wData.humidity ?? wData.live?.humidity}%`,
        wind: wData.wind || `${wData.windSpeed ?? 0} km/h`,
        rainChance: `${wData.daily?.[0]?.rainProbability ?? 0}%`,
        dailyForecast: Array.isArray(wData.daily) ? wData.daily.slice(0, 3).map((d: any) => ({
          day: d.dayName,
          condition: d.condition,
          tempMax: `${d.tempMax}°C`,
          tempMin: `${d.tempMin}°C`,
          rainProbability: `${d.rainProbability}%`,
          advisory: d.agriAdvisory,
        })) : [],
      };
      blocks.push(`WEATHER_TOOL_RESULT: ${JSON.stringify(weatherSummary)}\n(Live verified weather data for the user's area — use these exact values, do not invent or guess any weather values.)`);
    } else {
      blocks.push(`WEATHER_TOOL_RESULT: UNAVAILABLE\n(Live weather data is currently unavailable — tell the user to check the weather widget or try again, do NOT invent weather.)`);
    }
  }

  if (needs.includes("mandi")) {
    toolsUsed.push("get_mandi_prices");
    const query = cropInfo?.englishName || cropInfo?.rawTerm;
    const data = await invokeTool("mandi-prices", query ? { searchQuery: query } : {});
    if (data && Array.isArray((data as { prices?: unknown[] }).prices) && (data as { prices: unknown[] }).prices.length > 0) {
      blocks.push(`MANDI_TOOL_RESULT (For ${query || "Requested Crops"}): ${JSON.stringify(data)}\n(Current mandi price data — quote these exact rates, do not fabricate any price.)`);
    } else {
      blocks.push(`MANDI_TOOL_RESULT: UNAVAILABLE for ${query || "crop"}\n(Live mandi prices are currently unavailable — say so, do NOT invent a price.)`);
    }
  }

  if (needs.includes("scheme")) {
    toolsUsed.push("get_government_schemes");
    const data = await invokeTool("scheme-finder", { action: "schemes", category: "All" });
    if (data && Array.isArray((data as { schemes?: unknown[] }).schemes)) {
      const schemes = (data as { schemes: unknown[] }).schemes.slice(0, 5);
      blocks.push(`GOVERNMENT_SCHEMES_TOOL_RESULT: ${JSON.stringify(schemes)}\n(Current government schemes — only mention what is listed here, do not invent scheme names or amounts.)`);
    } else {
      blocks.push(`GOVERNMENT_SCHEMES_TOOL_RESULT: UNAVAILABLE\n(Govt scheme data is currently unavailable — say so, do NOT invent scheme names.)`);
    }
  }

  return { toolsContext: blocks.join("\n\n"), toolsUsed, detectedCrop: cropInfo ? `${cropInfo.englishName} (${cropInfo.rawTerm})` : null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence (spec §7 chat memory) + usage metering (spec §19). Service role
// writes; RLS protects reads/deletes to the owner only.
// ─────────────────────────────────────────────────────────────────────────────
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function persistConversation(input: {
  userId: string | null;
  conversationId: string | null;
  language: string;
  userText: string;
  assistantText: string;
  toolsUsed: string[];
}): Promise<{ conversationId: string }> {
  // Guests have no persisted history (they can still chat).
  if (!input.userId) return { conversationId: input.conversationId || "guest" };

  let conversationId = input.conversationId;
  if (conversationId && conversationId !== "guest") {
    // Verify ownership — a user must not write into someone else's thread.
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (convErr || !conv) conversationId = null;
  }

  if (!conversationId) {
    const title = input.userText.length > 50 ? input.userText.slice(0, 47) + "..." : input.userText || "New chat";
    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .insert({ user_id: input.userId, title, language: input.language })
      .select("id")
      .single();
    if (error || !data) return { conversationId: "guest" };
    conversationId = data.id as string;
  }

  const rows = [
    { conversation_id: conversationId, user_id: input.userId, role: "user", content: input.userText, language: input.language },
    { conversation_id: conversationId, user_id: input.userId, role: "assistant", content: input.assistantText, language: input.language, tool_calls: input.toolsUsed },
  ];
  const { error: msgErr } = await supabaseAdmin.from("ai_messages").insert(rows);
  if (msgErr) console.error("persist messages error:", msgErr.message);

  // Refresh conversation ordering.
  await supabaseAdmin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  return { conversationId };
}

async function logUsage(input: {
  userId: string | null;
  feature: string;
  provider?: string;
  tokensIn?: number;
  tokensOut?: number;
}): Promise<void> {
  if (!input.userId) return;
  try {
    await supabaseAdmin.rpc("ai_log_usage", {
      p_user_id: input.userId,
      p_feature: input.feature,
      p_provider: input.provider ?? null,
      p_tokens_in: input.tokensIn ?? 0,
      p_tokens_out: input.tokensOut ?? 0,
    });
  } catch (err) {
    console.error("usage log error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt. Comprehensive Agricultural AI Expert with full multilingual fluency.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Kisan Sahayak (किसान सहायक) — AgriConnect's premier AI agricultural expert and trusted farming companion for Indian farmers.

Detected language: "{language}"
Specific crop / topic focus: "{cropFocus}"

CORE CAPABILITIES & SCOPE (ANSWER ALL FARMING QUESTIONS):
- You have complete expertise in all areas of agriculture, horticulture, agronomy, soil science, entomology, plant pathology, agricultural engineering, dairy farming, cattle care, poultry, fish farming, polyhouse/greenhouse farming, organic/natural farming, drip irrigation, and government schemes (PM-KISAN, PMFBY, KCC, eNAM, Kusum, SMAM, etc.).
- Answer ANY question the farmer asks — whether broad or specific, basic or advanced, scientific or traditional.
- Never restrict answers to a predefined list of questions. You are a full AI expert capable of analyzing symptoms, calculating fertilizer doses, advising on crop schedules, explaining government policies, and solving any farming problem.

LANGUAGE & SCRIPT RULE (CRITICAL & ABSOLUTE):
- Match the farmer's language and dialect with natural, respectful, and fluent communication.
- If the user asks in Hindi or Hinglish (e.g. "tamatar ka bhav", "gehu me peela pan", "dawa batao", "khad kitna dale"), you MUST respond 100% in natural, fluent Hindi (हिंदी भाषा) written in Devanagari script.
- If the user asks in Marathi (मराठी), Punjabi (ਪੰਜਾਬੀ), Gujarati (ગુજરાતી), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Odia (ଓଡ଼ିଆ), Assamese (অসমীয়া), or English, reply fluently in that EXACT language and native script.
- Handle informal farmer expressions, village terms (जैसे: "दीमक", "सुंडी", "झुलसा", "चेपा", "माहू", "उकठा", "खरपतवार", "यूरिया", "जिंक"), and speech-to-text spelling variations effortlessly.

MANDI PRICES (REAL-TIME DATA):
- When the user asks about crop prices/mandi bhav, check the REAL-TIME DATA RESULTS below.
- Format: "आज [मंडी] में [फसल] का भाव ₹[X] से ₹[Y] प्रति क्विंटल (औसत भाव ₹[Modal]) है।"
- If real-time API quote is present in the data below, quote those exact numbers.
- If data is temporarily unavailable, state the benchmark estimated range and politely suggest checking the Mandi Bhav live tab.

ACTIONABLE & SCIENTIFIC ADVICE:
- Provide clear, step-by-step guidance:
  1. कारण (Reason / Root Cause)
  2. जैविक व घरेलू उपाय (Organic / Neem oil / Bio-fertilizer solutions)
  3. रासायनिक उपचार व सही मात्रा (Chemical recommendations with safe dosages like "2 ml/litre" or "250 ml/acre")
  4. सावधानियां (Precautions)
- Keep responses concise, well-structured, easy to read for a farmer on mobile, and voice-friendly.

VOICE & AUDIO COMPATIBILITY:
- Write in clean conversational sentences without complex markdown tables, symbols, or asterisks overload so text-to-speech sounds completely natural and human.
- Address the farmer respectfully as "किसान भाई", "किसान साथी", or respectfully in the local language.

FARM CONTEXT:
"{farmDetails}"

PREVIOUS CHAT MEMORY:
"{memoryContext}"

REAL-TIME DATA RESULTS:
{toolsContext}

At the VERY END, on a NEW LINE, write the literal marker "##SUGGESTIONS##" followed by exactly 3 short, relevant follow-up questions (under 60 chars each) in the same language as your response.`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const authResult = await validateAuth(req);
  const isAuthenticated = authResult.authenticated;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitId = isAuthenticated ? authResult.userId! : `guest:${ip}`;
  const rateLimitConfig = isAuthenticated ? AUTH_RATE_LIMIT : GUEST_RATE_LIMIT;

  const rateLimitResult = await checkRateLimit(rateLimitId, 'kisan-chat', rateLimitConfig);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again in a few seconds." }),
      {
        status: 429,
        headers: {
          ...headers,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString()
        }
      }
    );
  }

  const parseResult = await parseAndValidate(req, kisanChatRequestSchema, headers);
  if (!parseResult.success) return parseResult.response;

  const { messages, language = "Hindi", persona = "", memoryContext = "", farmContext, conversationId = null, userLocation } = parseResult.data;

  // Auto-detect the language from the latest user message — overrides the
  // client's selected language when the farmer actually wrote in another.
  const latestUser = [...messages].reverse().find((m) => m.role === "user");
  const detected = latestUser ? detectLanguage(latestUser.content) : null;
  const replyLanguage = detected ? detected.display : language;

  const farmDetails = farmContext
    ? [
        farmContext.crop ? `Crop: ${farmContext.crop}` : null,
        farmContext.variety ? `Variety: ${farmContext.variety}` : null,
        farmContext.stage ? `Stage: ${farmContext.stage}` : null,
        farmContext.area ? `Farm area: ${farmContext.area}` : null,
        farmContext.soil ? `Soil type: ${farmContext.soil}` : null,
      ].filter(Boolean).join(", ")
    : "None provided.";

  try {
    // Tool layer: fetch real-time data BEFORE composing the answer.
    const { toolsContext, toolsUsed, detectedCrop } = await runTools(latestUser?.content ?? "", userLocation);

    const systemPrompt = SYSTEM_PROMPT
      .replace("{language}", replyLanguage)
      .replace("{cropFocus}", detectedCrop || "General query")
      .replace("{memoryContext}", memoryContext || "None provided.")
      .replace("{farmDetails}", farmDetails)
      .replace("{persona}", persona || "Warm, practical and respectful — always explain the reason behind advice.")
      .replace("{toolsContext}", toolsContext || "No tools needed for this question.");

    const aiMessages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as AiMessage["role"], content: m.content })),
    ];

    const { text: assistantMessage, provider } = await aiChatCompletion(aiMessages, {
      temperature: 0.3,
      maxTokens: 1024,
    });

    if (!assistantMessage) throw new AiGatewayError("empty", "No response from AI");

    const { body, suggestions } = parseSuggestions(assistantMessage);

    // Persist + meter (best-effort; never block the answer on storage).
    const { conversationId: savedConversationId } = await persistConversation({
      userId: isAuthenticated ? authResult.userId! : null,
      conversationId,
      language: detected?.lang || "en",
      userText: latestUser?.content ?? "",
      assistantText: body,
      toolsUsed,
    });
    await logUsage({
      userId: isAuthenticated ? authResult.userId! : null,
      feature: "kisan_chat",
      provider,
    });

    return new Response(
      JSON.stringify({
        message: body,
        suggestions,
        conversationId: savedConversationId,
        detectedLanguage: detected?.lang || "en",
        toolsUsed,
      }),
      {
        headers: {
          ...headers,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error: unknown) {
    console.error("Kisan chat error:", error);

    if (error instanceof AiGatewayError) {
      const status = error.kind === "rate_limit" ? 429 : error.kind === "quota" ? 402 : error.kind === "timeout" ? 504 : error.kind === "config" ? 503 : 502;
      const errLang = detected?.lang || "en";
      const errMsgs: Record<string, Record<string, string>> = {
        timeout: { hi: "AI सेवा धीमी है। कृपया थोड़ी देर बाद पुनः प्रयास करें।", en: "AI service is slow. Please try again in a moment.", mr: "AI सेवा मंद आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.", gu: "AI સેવા ધીમી છે. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.", ta: "AI சேவை மெதுவாக உள்ளது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.", te: "AI సేవ నెమ్మదిగా ఉంది. దయచేసి కొంత సేపటి తర్వాత మళ్ళీ ప్రయత్నించండి.", kn: "AI ಸೇವೆ ನಿಧಾನವಾಗಿದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", ml: "AI സേവ മന്ദഗതിയിലാണ്. ദയവായി കുറച്ച് സമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.", bn: "AI সেবা ধীর গতিতে চলছে। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।", or: "AI ସେବା ଧୀର ଅଛି। ଦୟାକରି କିଛି ସେକେଣ୍ଡ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।", pa: "AI ਸੇਵਾ ਹੌਲੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਮਾਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", as: "AI সেৱা লেহেমানে আছে। অনুগ্ৰহ কৰি কিছু সেকেণ্ড পিছত পুনৰ চেষ্টা কৰক।" },
        quota: { hi: "AI क्रेडिट समाप्त। कृपया क्रेडिट जोड़ें।", en: "AI credits exhausted. Please add credits.", mr: "AI क्रेडिट संपले. कृपया क्रेडिट जोडा.", gu: "AI ક્રેડિટ સમાપ્ત. કૃપા કરીને ક્રેડિટ ઉમેરો.", ta: "AI கிரெடிட் தீர்ந்தது. கிரெடிட் சேர்க்கவும்.", te: "AI క్రెడిట్ అయిపోయింది. దయచేసి క్రెడిట్ జోడించండి.", kn: "AI ಕ್ರೆಡಿಟ್ ಮುಗಿದಿದೆ. ದಯವಿಟ್ಟು ಕ್ರೆಡಿಟ್ ಸೇರಿಸಿ.", ml: "AI ക്രെഡിറ്റ് തീർന്നു. ദയവായി ക്രെഡിറ്റ് ചേർക്കുക.", bn: "AI ক্রেডিট শেষ। অনুগ্রহ করে ক্রেডিট যোগ করুন।", or: "AI କ୍ରେଡିଟ୍ ସମାପ୍ତ। ଦୟାକରି କ୍ରେଡିଟ୍ ଯୋଗ କରନ୍ତୁ।", pa: "AI ਕ੍ਰੈਡਿਟ ਖਤਮ। ਕਿਰਪਾ ਕਰਕੇ ਕ੍ਰੈਡਿਟ ਜੋੜੋ।", as: "AI ক্ৰেডিট শেষ। অনুগ্ৰহ কৰি ক্ৰেডিট যোগ কৰক।" },
        rate_limit: { hi: "बहुत सारे अनुरोध। कृपया कुछ सेकंड बाद पुनः प्रयास करें।", en: "Too many requests. Please try again in a few seconds.", mr: "खूप विनंत्या. कृपया काही सेकंदांनी पुन्हा प्रयत्न करा.", gu: "ઘણી બધી વિનંતીઓ. કૃપા કરીને થોડી સેકંડ પછી ફરી પ્રયાસ કરો.", ta: "அதிகமான கோரிக்கைகள். சில நொடிகளில் மீண்டும் முயற்சிக்கவும்.", te: "చాలా అభ్యర్థనలు. దయచేసి కొన్ని సెకన్లలో మళ్ళీ ప్రయత్నించండి.", kn: "ಹಲವಾರು ವಿನಂತಿಗಳು. ದಯವಿಟ್ಟು ಕೆಲವು ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", ml: "ധാരാളം അഭ്യർത്ഥനകൾ. ദയവായി കുറച്ച് സെക്കൻഡിൽ വീണ്ടും ശ്രമിക്കുക.", bn: "অনেক বেশি অনুরোধ। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।", or: "ଅନେକ ଅନୁରୋଧ। ଦୟାକରି କିଛି ସେକେଣ୍ଡ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।", pa: "ਬਹੁਤ ਸਾਰੇ ਅਨੁਰੋਧ। ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਕਿੰਟ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", as: "বহু বেশি অনুৰোধ। অনুগ্ৰহ কৰি কিছু সেকেণ্ড পিছত পুনৰ চেষ্টা কৰক।" },
        default: { hi: "सेवा में अस्थायी समस्या। कृपया पुनः प्रयास करें।", en: "Temporary service issue. Please try again.", mr: "सेवेत तात्पुरती अडचण. कृपया पुन्हा प्रयत्न करा.", gu: "સેવામાં ક્ષણિક સમસ્યા. કૃપા કરીને ફરી પ્રયાસ કરો.", ta: "சேவையில் தற்காலிக சிக்கல். மீண்டும் முயற்சிக்கவும்.", te: "సేవలో తాత్కాలిక సమస్య. దయచేసి మళ్ళీ ప్రయత్నించండి.", kn: "ಸೇವೆಯಲ್ಲಿ ತಾತ್ಕಾಲಿಕ ಸಮಸ್ಯೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", ml: "സേവയിൽ താൽക്കാലിക പ്രശ്നം. ദയവായി വീണ്ടും ശ്രമിക്കുക.", bn: "সাময়িক সেবা সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।", or: "ସେବାରେ ଅସ୍ଥାୟୀ ସମସ୍ୟା। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।", pa: "ਸੇਵਾ ਵਿੱਚ ਅਸਥਾਈ ਸਮੱਸਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", as: "সেৱাত অস্থায়ী সমস্যা। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।" },
      };
      const getMsg = (kind: string, lang: string) => errMsgs[kind]?.[lang] || errMsgs.default[lang] || errMsgs.default.en;
      const message = getMsg(error.kind, errLang);
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: detected?.lang === "hi" ? "सेवा में समस्या। कृपया पुनः प्रयास करें।" : "Service issue. Please try again." }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
