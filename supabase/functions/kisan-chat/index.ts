import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { kisanChatRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";
import { aiChatCompletion, AiGatewayError, type AiMessage } from "../_shared/ai-gateway.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app'
).split(',').map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : null;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
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
  "aalu", "aloo", "pyaj", "pyaz", "gehu", "gehun", "chana", "sarson", "mirch"
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
    const regex = new RegExp(`(^|\\s|[.,!?])${key}($|\\s|[.,!?])`, "i");
    if (regex.test(lower) || text.includes(key)) {
      return { englishName: val, rawTerm: key };
    }
  }
  return null;
}

/** Detect the dominant language script or Roman-Hindi/Hinglish in a string. */
function detectLanguage(text: string): { lang: string; display: string } | null {
  if (!text) return null;
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
    // Bengali & Assamese share the same block — distinguish by common Assamese letters.
    if (best.lang === "bn") {
      const asLetters = (text.match(/[ৰৱ](?![ংঢ])/g) || []).length;
      if (asLetters > 2) return { lang: "as", display: "Assamese (অসমीया)" };
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
    return { lang: "hi", display: "Hindi (हिंदी / Hinglish)" };
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
  const mandiWords = ["mandi", "bhav", "rate", "price", "मंडी", "भाव", "कीमत", "दर", "बाज़ार", "बाजार", "sell", "bech", "tamatr", "tamatar", "gehu", "soya"];
  const weatherWords = ["weather", "rain", "mausam", "मौसम", "बारिश", "बरसात", "temperature", "तापमान", "forecast"];
  const schemeWords = ["scheme", "yojana", "subsidy", "योजना", "सब्सिडी", "pm kisan", "kcc", "pmfby", "loan"];
  if (weatherWords.some((w) => t.includes(w))) needs.push("weather");
  if (mandiWords.some((w) => t.includes(w))) needs.push("mandi");
  if (schemeWords.some((w) => t.includes(w))) needs.push("scheme");
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
    if (data && typeof data === "object" && "current" in data) {
      blocks.push(`WEATHER_TOOL_RESULT: ${JSON.stringify({ current: data.current, daily: data.daily })}\n(Live weather data for the user's area — use it, do not invent your own.)`);
    } else {
      blocks.push(`WEATHER_TOOL_RESULT: UNAVAILABLE\n(Live weather data is currently unavailable — tell the user to try again, do NOT invent weather.)`);
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
// Prompt. Safety-focused: no invented dosages, no confident diagnosis without
// evidence, honest about uncertainty (spec §2, §3).
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Kisan AI, the intelligent agriculture assistant inside the AgriConnect app.

Your primary users are Indian farmers. Your job is to understand farmers naturally, including Hindi, Hinglish, regional-style Hindi, simple English, spelling mistakes, speech-to-text errors, and mixed-language messages, and provide accurate, practical, easy-to-understand agricultural assistance.

==================================================
1. LANGUAGE UNDERSTANDING – VERY IMPORTANT
==================================================
You MUST understand all of the following:
- Hindi written in Devanagari
- Hinglish written in Roman Hindi
- Hindi + English mixed sentences
- Informal farmer language
- Spelling mistakes & speech-to-text mistakes
- Short queries & voice-transcribed queries
- Regional/common names of crops & common mandi terminology

NEVER assume that a Hindi/Hinglish query is English-only.

==================================================
2. LANGUAGE OF RESPONSE (DEFAULT RULE)
==================================================
Detected/Requested language is: "{language}".
Always reply in the SAME language/style in which the user asks the question:
- If user writes Hindi -> reply in Hindi.
- If user writes Hinglish -> reply in simple Hinglish.
- If user writes English -> reply in English.
- If user mixes Hindi & English -> reply naturally in the same mixed style.

==================================================
3. NEVER CHANGE THE USER'S CROP (CRITICAL)
==================================================
Specifically requested crop focus: "{cropFocus}".
Before answering, identify the exact crop/commodity mentioned by the user:
- Tamatar -> answer about TAMATAR
- Soyabean -> answer about SOYABEAN
- Gehu -> answer about WHEAT
- Pyaz -> answer about ONION
- Lahsun -> answer about GARLIC
- Mirchi -> answer about CHILLI
- Makka -> answer about MAIZE
- Kapas -> answer about COTTON

NEVER substitute one crop for another! If user asks "tamatar ka bhav kya hai?", NEVER answer with Soyabean.
If the crop is unclear, ASK a clarification question instead of guessing (e.g. "Kaunsi fasal ka bhav chahiye?").

==================================================
4. ENTITY / CROP IDENTIFICATION
==================================================
Before generating the final answer, internally identify:
- Crop/commodity
- Location/mandi
- Quantity/unit
- Date/time
- User's actual intent

Do NOT answer until the requested crop and intent are correctly identified.

==================================================
5. MANDI PRICE QUESTIONS
==================================================
When the user asks for a mandi price:
- Identify Crop, Mandi/location, Date, Price unit.
- If location is provided, use that location from REAL-TIME DATA RESULTS below.
- If location is NOT provided, ask: "Kaunsi mandi ka bhav chahiye?"
- Do not invent mandi prices. Do not guess current prices. Do not provide an old price as today's price.
- If live mandi data is unavailable in the tools context, clearly say:
"Abhi mere paas is mandi ka live bhav available nahi hai."

==================================================
6. PRICE UNIT
==================================================
Be extremely careful with units (₹/kg, ₹/quintal, ₹/ton, ₹/acre, ₹/bag).
Never silently convert or change units unless you explicitly perform the conversion correctly and clearly state the converted unit.
When reliable data is available, preferably mention: Minimum price, Maximum price, Modal/average price, Date, Mandi name.

==================================================
7. DO NOT HALLUCINATE (ACCURACY > SPEED)
==================================================
NEVER:
- Invent a mandi price
- Invent weather information
- Invent government schemes
- Invent pesticide dosage
- Invent crop disease diagnosis
- Invent market information
- Pretend live data is available when it is not
- Claim to have checked a source when you did not

==================================================
8. FARMER-FRIENDLY COMMUNICATION
==================================================
Keep answers: Simple, Short, Practical, Clear, Action-oriented.
Avoid unnecessary technical language. Use simple, farmer-friendly words.

==================================================
9. HINDI & HINGLISH RESPONSE STYLE
==================================================
- For Hindi: Use simple Hindi, avoid overly Sanskritized Hindi.
- For Hinglish: Respond naturally in conversational Hinglish. Do NOT suddenly switch to formal English.

==================================================
10. VOICE & TTS COMPATIBILITY
==================================================
Responses may be spoken aloud via Text-to-Speech (TTS).
- Write in short, clear conversational sentences (2-5 lines).
- Avoid huge paragraphs, complex tables, excessive symbols, emojis, URLs, or markdown syntax (no bold, italics, code blocks, or raw hashes).
- Spell out units and symbols clearly.

==================================================
11. SPEECH-TO-TEXT ERROR HANDLING
==================================================
Infer obvious STT mistakes from context ("tamatr" -> "tamatar", "soyabeen ka bao" -> "soyabean ka bhav", "indor mandi" -> "Indore mandi"). If uncertain, confirm with the user.

==================================================
12. CONTEXT MEMORY & STRICT RELEVANCE
==================================================
Use previous conversation context ONLY when directly relevant. Do not ask for information already provided.
Do NOT inject unrelated stored farm details unless the user explicitly asks for advice about their farm.

==================================================
13. NEVER MIX MULTIPLE CROPS
==================================================
If user asks about multiple crops ("tamatar aur soyabean ka bhav"), return two clearly separated answers.

==================================================
14. IMAGE-BASED CROP / DISEASE QUESTIONS
==================================================
Analyze images carefully. Do not confidently claim a diagnosis if insufficient. Use confidence-aware language and ask for clear leaf/plant photos.

==================================================
15. PESTICIDE / FERTILIZER SAFETY
==================================================
Do not invent doses. Do not recommend unsafe chemical combinations. Advise following the product label.

==================================================
16. WEATHER & SCHEMES
==================================================
- Weather: Use verified weather data from REAL-TIME DATA RESULTS; if unavailable, say so clearly.
- Schemes: Never invent eligibility rules or guarantee money; guide to official verification.

==================================================
17. MANDATORY RESPONSE QUALITY CHECK
==================================================
Before sending:
1. Intent Check: What did the user ask?
2. Crop Check: Am I answering about the EXACT crop mentioned?
3. Location Check: Am I using the correct mandi/location?
4. Language Check: Is response in the user's language/style?
5. Data Check: Am I using real data without guessing?
6. Voice Check: Can this be spoken naturally aloud?

FARM CONTEXT (USE ONLY IF RELEVANT):
"{farmDetails}"

PREVIOUS CHAT MEMORY:
"{memoryContext}"

REAL-TIME DATA RESULTS:
{toolsContext}

At the VERY END, on a NEW LINE, write the literal marker "##SUGGESTIONS##" followed by exactly 3 short follow-up questions (under 70 chars each) directly relevant to the current topic and crop, in the same language.`;

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
      JSON.stringify({ error: "बहुत सारे अनुरोध। कृपया कुछ सेकंड बाद पुनः प्रयास करें।" }),
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
      const message = error.kind === "timeout"
        ? "AI सेवा धीमी है। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
        : error.kind === "quota"
          ? "AI क्रेडिट समाप्त। कृपया क्रेडिट जोड़ें।"
          : error.kind === "rate_limit"
            ? "बहुत सारे अनुरोध। कृपया कुछ सेकंड बाद पुनः प्रयास करें।"
            : "सेवा में अस्थायी समस्या। कृपया पुनः प्रयास करें।";
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "सेवा में समस्या। कृपया पुनः प्रयास करें।" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
