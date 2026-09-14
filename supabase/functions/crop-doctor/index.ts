import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { cropDoctorRequestSchema, parseAndValidate } from "../_shared/validators.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";
import { aiChatCompletion, AiGatewayError, type AiMessage } from "../_shared/ai-gateway.ts";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'POST, OPTIONS');
}

const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60 * 1000 };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;      // raw base64 payload cap
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const SCAN_BUCKET = "crop-scan-images";
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 3600; // 7 days, refreshed on next scan

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Structured error payload: stable `code` + bilingual copy for the client. */
function errPayload(code: string, messageEn: string, messageHi: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ error: messageEn, error_hi: messageHi, code, ...extra });
}

// ── Image validation (spec §11): format + size + corrupt/base64 sanity. ──────
function validateImage(imageBase64: string): { ok: true; mime: string; base64: string } | { ok: false; error: string; errorHi: string } {
  // Base64 inflates binary ~1.33x; this string-level guard is only a cheap
  // pre-screen. The authoritative size limit is applied on the DECODED bytes
  // below (MAX_IMAGE_BYTES = 8MB binary).
  if (imageBase64.length > MAX_IMAGE_BYTES * 1.5) {
    return { ok: false, error: "Image too large. Please upload an image smaller than 8MB.", errorHi: "छवि बहुत बड़ी है। कृपया 8MB से छोटी तस्वीर अपलोड करें।" };
  }

  const dataUrlMatch = imageBase64.match(/^data:([^;,]+);base64,(.+)$/s);
  let mime = "";
  let b64 = imageBase64;

  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase();
    b64 = dataUrlMatch[2];
  } else if (/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
    // Raw base64 with no prefix — sniff the magic bytes for jpeg/png/webp.
    try {
      const header = b64.slice(0, 32);
      const bytes = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
      if (bytes[0] === 0xff && bytes[1] === 0xd8) mime = "image/jpeg";
      else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) mime = "image/png";
      else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) mime = "image/webp";
    } catch {
      return { ok: false, error: "Image data is corrupted. Please upload the image again.", errorHi: "छवि डेटा खराब है। कृपया तस्वीर दोबारा अपलोड करें।" };
    }
  } else {
    return { ok: false, error: "Unsupported image format. Please upload a JPG, PNG or WEBP image.", errorHi: "असमर्थित छवि प्रारूप। कृपया JPG, PNG या WEBP तस्वीर अपलोड करें।" };
  }

  if (!mime || !ALLOWED_MIME.has(mime)) {
    return { ok: false, error: "Unsupported image format. Please upload a JPG, PNG or WEBP image.", errorHi: "असमर्थित छवि प्रारूप। कृपया JPG, PNG या WEBP तस्वीर अपलोड करें।" };
  }

  // Corrupt-image + real size guard: decode once, then apply the binary
  // 8MB cap and the "non-trivial image" minimum on actual bytes.
  let decoded: string;
  try {
    decoded = atob(b64.replace(/\s/g, ""));
  } catch {
    return { ok: false, error: "Image data is corrupted. Please upload the image again.", errorHi: "छवि डेटा खराब है। कृपया तस्वीर दोबारा अपलोड करें।" };
  }
  if (decoded.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image too large. Please upload an image smaller than 8MB.", errorHi: "छवि बहुत बड़ी है। कृपया 8MB से छोटी तस्वीर अपलोड करें।" };
  }
  if (decoded.length < 500) {
    return { ok: false, error: "The image appears to be empty or too small to analyze. Please upload a clear photo.", errorHi: "तस्वीर खाली या विश्लेषण के लिए बहुत छोटी लगती है। कृपया स्पष्ट फोटो अपलोड करें।" };
  }

  return { ok: true, mime, base64: b64 };
}

async function logUsage(userId: string, provider?: string) {
  try {
    await supabaseAdmin.rpc("ai_log_usage", {
      p_user_id: userId,
      p_feature: "crop_scan",
      p_provider: provider ?? null,
      p_images: 1,
    });
  } catch (err) {
    console.error("crop scan usage log error:", err);
  }
}

async function createSignedImageUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(SCAN_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

async function persistScan(
  userId: string,
  result: Record<string, unknown>,
  mime?: string,
  language?: string,
  storagePath?: string | null,
  imageUrl?: string | null,
) {
  try {
    const { error } = await supabaseAdmin.from("crop_scans").insert({
      user_id: userId,
      mime_type: mime ?? null,
      language: language ?? null,
      storage_path: storagePath ?? null,
      image_url: imageUrl ?? null,
      crop: result.crop ?? null,
      plant_part: result.plant_part ?? null,
      health_status: result.health_status ?? null,
      possible_issue: result.possible_issue ?? null,
      confidence: result.confidence ?? null,
      symptoms: Array.isArray(result.symptoms) ? result.symptoms : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      urgency: result.urgency ?? null,
      raw_result: result,
    });
    if (error) console.error("persist scan error:", error.message);
  } catch (err) {
    console.error("persist scan exception:", err);
  }
}

const SYSTEM_PROMPT = `You are an expert agricultural plant pathologist (Crop Doctor / फसल डॉक्टर) analyzing 1 to 4 photos of a crop or leaf provided by a farmer.

LANGUAGE RULE (STRICT):
- The user's selected language is: "{language}".
- Respond ENTIRELY in that language.

FARM CONTEXT:
"{farmContext}"

HONESTY (ABSOLUTE — never violate):
- You provide an AI assessment, NEVER a definitive diagnosis. The user is explicitly told "AI assessment — not a definitive diagnosis."
- Never state a disease as confirmed fact from photos alone. Use hedged language: "possible", "likely", "image suggests", "AI confidence".
- NEVER invent a disease name. Only name a specific disease if the symptoms are unmistakable AND well-known; otherwise say "unknown — needs expert confirmation" or describe symptoms only.
- NEVER invent pesticide/fertilizer dosages, chemical names, or mixing ratios. Give cultural guidance only (e.g. "remove affected leaves", "avoid excess nitrogen", "sanitation"), and recommend consulting a local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551) for exact doses.
- Identify the crop only if reasonably confident from the photo or context; otherwise set "crop" to null.

IMAGE QUALITY FIRST (ABSOLUTE):
- Before diagnosing, assess image quality across all provided images. If the photos are blurry, too dark, too distant, or do not clearly show the affected plant part, set "needs_clearer_image" to true, lower confidence (below 40), and clearly ask for a closer, well-lit photo. Do NOT guess a diagnosis from bad images.

ANALYSIS & STRUCTURED OUTPUT:
1. Identify the crop (only if visually confident or provided in context).
2. Identify the plant part (leaf, stem, root, fruit, whole plant).
3. Assess health: healthy / possible disease / possible pest / possible deficiency / possible water stress / possible environmental stress / unclear.
4. List visible symptoms (observation only).
5. State possible causes and immediate cultural actions (no fake chemical doses).
6. Give prevention guidance.
7. Provide 1 to 3 concise follow-up questions if image evidence is incomplete.
8. State the urgency: low / medium / high / urgent.
9. State when to seek expert confirmation (KVK, local agri extension officer).

OUTPUT — STRICT JSON, no markdown fences, no prose before or after:
{
  "crop": "Wheat" or null,
  "plant_part": "Leaf" or null,
  "health_status": "possible disease | possible pest | possible deficiency | possible water stress | possible environmental stress | healthy | unclear",
  "possible_issue": "Short hedged statement, e.g. 'Likely fungal leaf spot, needs field confirmation'",
  "confidence": 0-100 or null,
  "symptoms": ["visible symptom 1", "..."],
  "possible_causes": ["possible cause 1", "..."],
  "immediate_actions": ["practical action 1", "..."],
  "prevention": ["prevention step 1", "..."],
  "questions": ["concise follow-up question 1"],
  "recommendations": ["general advice 1", "..."],
  "urgency": "low" | "medium" | "high" | "urgent",
  "needs_clearer_image": true/false,
  "next_steps_for_farmer": ["..."],
  "expert_confirm": "When to seek expert confirmation, in the user's language"
}
Respond in the user's language for every string value.`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = getCORSHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers });

  const authResult = await validateAuth(req);
  if (!authResult.authenticated) {
    return authErrorResponse(authResult.error || "Unauthorized", headers);
  }

  const rateLimitResult = await checkRateLimit(authResult.userId!, 'crop-doctor', RATE_LIMIT_CONFIG);
  if (!rateLimitResult.allowed) {
    return new Response(
      errPayload(
        "rate_limit",
        "Too many requests. Please wait a moment and try again.",
        "बहुत सारे अनुरोध। कृपया कुछ सेकंड बाद पुनः प्रयास करें।",
      ),
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

  const parseResult = await parseAndValidate(req, cropDoctorRequestSchema, headers);
  if (!parseResult.success) return parseResult.response;

  const { description, imageBase64, imagesBase64, language = "Hindi (हिंदी)", storagePath, farmContext } = parseResult.data;

  // Gather image list (support single or array up to 4)
  const rawImages: string[] = [];
  if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
    rawImages.push(...imagesBase64.slice(0, 4));
  } else if (imageBase64) {
    rawImages.push(imageBase64);
  }

  if (rawImages.length === 0) {
    return new Response(
      errPayload(
        "validation",
        "Please attach a crop photo to analyze it.",
        "विश्लेषण के लिए कृपया फसल की तस्वीर संलग्न करें।",
        { needs_clearer_image: true },
      ),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const validImages: Array<{ mime: string; base64: string }> = [];
  for (const img of rawImages) {
    const val = validateImage(img);
    if (!val.ok) {
      return new Response(
        errPayload("validation", val.error, val.errorHi, { needs_clearer_image: true }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    validImages.push({ mime: val.mime, base64: val.base64 });
  }

  // Only accept a storage path already scoped to this user's own folder.
  const safeStoragePath =
    typeof storagePath === "string" && storagePath.startsWith(`${authResult.userId}/`)
      ? storagePath
      : null;

  try {
    const farmCtxStr = farmContext
      ? [
          farmContext.crop ? `Crop: ${farmContext.crop}` : null,
          farmContext.variety ? `Variety: ${farmContext.variety}` : null,
          farmContext.stage ? `Stage: ${farmContext.stage}` : null,
          farmContext.area ? `Area: ${farmContext.area}` : null,
          farmContext.soil ? `Soil: ${farmContext.soil}` : null,
          farmContext.location ? `Location: ${farmContext.location}` : null,
        ].filter(Boolean).join(", ")
      : "None provided.";

    const systemPrompt = SYSTEM_PROMPT.replace("{language}", language).replace("{farmContext}", farmCtxStr);

    const userContentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
      {
        type: "text",
        text: description || "Please analyze these crop images. Identify the crop, plant part, health status, possible issue, visible symptoms, immediate actions, and prevention."
      },
      ...validImages.map((img) => ({
        type: "image_url" as const,
        image_url: { url: `data:${img.mime};base64,${img.base64}` }
      }))
    ];

    const messages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContentParts }
    ];

    const { text: raw, provider } = await aiChatCompletion(messages, {
      temperature: 0.2,
      maxTokens: 1536,
    });

    // Parse the strict JSON result (spec §15). Fall back to a clear-error result
    // if the model didn't return valid JSON — never show a fake diagnosis.
    let result: Record<string, unknown>;
    try {
      const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object") throw new Error("non-object");
      result = parsed;
    } catch {
      result = {
        crop: farmContext?.crop || null,
        plant_part: null,
        health_status: "unclear",
        possible_issue: null,
        confidence: null,
        symptoms: [],
        possible_causes: [],
        immediate_actions: [],
        prevention: [],
        questions: [],
        recommendations: [],
        urgency: "low",
        needs_clearer_image: true,
        next_steps_for_farmer: [],
        expert_confirm: "Please try again with a clearer, well-lit close-up photo of the affected part.",
      };
    }

    await logUsage(authResult.userId!, provider);

    // Persist with a server-generated signed URL for the private bucket so the
    // user's own scan history can show the photo without a public bucket.
    const signedUrl = await createSignedImageUrl(safeStoragePath);
    await persistScan(authResult.userId!, result, validImages[0]?.mime, language, safeStoragePath, signedUrl);

    return new Response(
      JSON.stringify({ result }),
      {
        headers: {
          ...headers,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error: unknown) {
    console.error("Crop doctor error:", error);

    if (error instanceof AiGatewayError) {
      const status = error.kind === "rate_limit" ? 429 : error.kind === "quota" ? 402 : error.kind === "timeout" ? 504 : error.kind === "config" ? 503 : 502;
      const code = error.kind === "timeout" ? "timeout" : error.kind === "quota" ? "quota" : error.kind === "rate_limit" ? "rate_limit" : error.kind === "config" ? "config" : "api";
      const copy: Record<string, { en: string; hi: string }> = {
        timeout: { en: "The analysis service is taking too long. Please try again shortly.", hi: "विश्लेषण सेवा धीमी है। कृपया थोड़ी देर बाद पुनः प्रयास करें।" },
        quota: { en: "AI credits exhausted. Please try again later.", hi: "AI क्रेडिट समाप्त। कृपया बाद में पुनः प्रयास करें।" },
        rate_limit: { en: "Too many requests. Please wait a few seconds and retry.", hi: "बहुत सारे अनुरोध। कृपया कुछ सेकंड बाद पुनः प्रयास करें।" },
        config: { en: "AI analysis is not configured yet. Please contact support.", hi: "AI विश्लेषण अभी कॉन्फ़िगर नहीं है। कृपया सहायता से संपर्क करें।" },
        api: { en: "Temporary problem in the analysis service. Please try again later.", hi: "विश्लेषण सेवा में अस्थायी समस्या। कृपया बाद में पुनः प्रयास करें।" },
      };
      return new Response(
        errPayload(code, copy[code].en, copy[code].hi),
        { status, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      errPayload(
        "api",
        "Something went wrong with the analysis. Please try again.",
        "विश्लेषण में समस्या आई। कृपया पुनः प्रयास करें।",
      ),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
