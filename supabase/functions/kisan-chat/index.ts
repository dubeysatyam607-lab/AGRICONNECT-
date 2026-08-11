import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { kisanChatRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";
import { aiChatCompletion, AiGatewayError, type AiMessage } from "../_shared/ai-gateway.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000,http://localhost:8000,https://agriconnect.in'
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

/** Detect the dominant language script in a string. Returns {lang, display} or null for Latin. */
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
  if (!best) return null;
  // Bengali & Assamese share the same block — distinguish by common Assamese letters.
  if (best.lang === "bn") {
    const asLetters = (text.match(/[ৰৱ](?![ংঢ])/g) || []).length;
    if (asLetters > 2) return { lang: "as", display: "Assamese (অসমীয়া)" };
  }
  return { lang: best.lang, display: best.display };
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
  const mandiWords = ["mandi", "bhav", "rate", "price", "मंडी", "भाव", "कीमत", "दर", "बाज़ार", "बाजार", "sell", "bech"];
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
): Promise<{ toolsContext: string; toolsUsed: string[] }> {
  const needs = detectToolNeeds(userMessage);
  if (needs.length === 0) return { toolsContext: "", toolsUsed: [] };

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
    const commodityMatch = userMessage.match(/\b(wheat|soybean|rice|onion|tomato|potato|cotton|maize|गेहूं|सोयाबीन|चावल|प्याज)\b/i);
    const data = await invokeTool("mandi-prices", commodityMatch ? { searchQuery: commodityMatch[1] } : {});
    if (data && Array.isArray((data as { prices?: unknown[] }).prices) && (data as { prices: unknown[] }).prices.length > 0) {
      blocks.push(`MANDI_TOOL_RESULT: ${JSON.stringify(data)}\n(Current mandi price data — quote these exact rates, do not fabricate any price.)`);
    } else {
      blocks.push(`MANDI_TOOL_RESULT: UNAVAILABLE\n(Live mandi prices are currently unavailable — say so, do NOT invent a price.)`);
    }
  }

  if (needs.includes("scheme")) {
    toolsUsed.push("get_government_schemes");
    const data = await invokeTool("scheme-finder", {});
    if (data && Array.isArray((data as { schemes?: unknown[] }).schemes)) {
      const schemes = (data as { schemes: unknown[] }).schemes.slice(0, 5);
      blocks.push(`GOVERNMENT_SCHEMES_TOOL_RESULT: ${JSON.stringify(schemes)}\n(Current government schemes — only mention what is listed here, do not invent scheme names or amounts.)`);
    } else {
      blocks.push(`GOVERNMENT_SCHEMES_TOOL_RESULT: UNAVAILABLE\n(Govt scheme data is currently unavailable — say so, do NOT invent scheme names.)`);
    }
  }

  return { toolsContext: blocks.join("\n\n"), toolsUsed };
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
const SYSTEM_PROMPT = `You are "Kisan Sahayak" (किसान सहायक), a real agricultural advisor for Indian farmers.

BEHAVE LIKE A KNOWLEDGEABLE HUMAN ADVISOR:
- Warm, practical, respectful. Address the farmer naturally in their language ("किसान भाई", "Kisan Ji", "भाऊ", etc.).
- Do NOT introduce yourself with "Namaste! I am an AI-powered assistant". Never repeat the same intro twice. Just answer the question directly.
- Short, clear answers (3-5 short paragraphs). Use bullets/headings only when they genuinely help. Avoid emoji spam.

LANGUAGE RULE (STRICT):
- The user's language is: "{language}" (auto-detected from what they actually wrote).
- Reply ENTIRELY in that language. Hindi → Devanagari, Hinglish → Hinglish, English → simple Indian English.
- If the user wrote in Hinglish, reply in Hinglish, NOT full Hindi.

AGRICULTURAL SAFETY (ABSOLUTE):
- Never invent pesticide/fertilizer dosages. If you are not certain of the exact dose for the crop/stage/region, ask for the missing details (crop, stage, soil) or recommend consulting a Krishi Vigyan Kendra / Kisan Call Centre 1800-180-1551.
- Never recommend mixing chemicals that could be dangerous. When uncertain, say so.
- Do NOT confidently diagnose a disease without evidence. Say: "I need a photo of the affected leaf to identify this more accurately. This could be X or Y." Never state a diagnosis as fact from description alone.
- Use hedged language: "possible", "likely", "may be", "needs field confirmation".
- Never invent mandi prices, scheme names, subsidy amounts, or weather. Only use data given to you in TOOL_RESULT blocks; if a TOOL_RESULT says UNAVAILABLE, tell the user live data is unavailable.

KNOWN FARMER CONTEXT:
"{memoryContext}"

FARM DETAILS:
"{farmDetails}"

PERSONA INSTRUCTION:
"{persona}"

TOOLS (REAL-TIME DATA):
{toolsContext}

SKILLS — MATCH THE QUESTION TO THE RIGHT SKILL:
1. Crop disease/pest: symptom → possible causes → organic first → safe chemical options → when to call a pro.
2. Fertilizer: NPK ratios, stage-based, soil-based, cost-effective alternatives.
3. Irrigation: stage-based scheduling, drip vs flood, water-saving.
4. Government schemes: general guidance + anything in GOVERNMENT_SCHEMES_TOOL_RESULT.
5. Mandi/market: anything in MANDI_TOOL_RESULT + selling advice.
6. Weather: anything in WEATHER_TOOL_RESULT + crop-planning advice.
7. Soil, sowing, harvesting, farm economics, machinery, IoT data, crop scan results.

OUTPUT:
- At the VERY END, on a NEW LINE, write the literal marker "##SUGGESTIONS##" followed by exactly 3 short follow-up questions (under 70 chars each) the farmer is most likely to ask next, in the same language.`;

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
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString()
        }
      }
    );
  }

  const parseResult = await parseAndValidate(req, kisanChatRequestSchema, corsHeaders);
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
    const { toolsContext, toolsUsed } = await runTools(latestUser?.content ?? "", userLocation);

    const systemPrompt = SYSTEM_PROMPT
      .replace("{language}", replyLanguage)
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
          ...corsHeaders,
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
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "सेवा में समस्या। कृपया पुनः प्रयास करें।" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
