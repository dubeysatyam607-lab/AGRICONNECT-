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

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// ── Image validation (spec §11): format + size + corrupt/base64 sanity. ──────
function validateImage(imageBase64: string): { ok: true; mime: string; base64: string } | { ok: false; error: string } {
  if (imageBase64.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image too large. Please upload an image smaller than 8MB." };
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
      return { ok: false, error: "Image data is corrupted. Please upload the image again." };
    }
  } else {
    return { ok: false, error: "Unsupported image format. Please upload a JPG, PNG or WEBP image." };
  }

  if (!mime || !ALLOWED_MIME.has(mime)) {
    return { ok: false, error: "Unsupported image format. Please upload a JPG, PNG or WEBP image." };
  }

  // Corrupt-image guard: base64 must decode without errors and be non-trivial.
  try {
    const decoded = atob(b64.replace(/\s/g, ""));
    if (decoded.length < 500) {
      return { ok: false, error: "The image appears to be empty or too small to analyze. Please upload a clear photo." };
    }
  } catch {
    return { ok: false, error: "Image data is corrupted. Please upload the image again." };
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

async function persistScan(userId: string, result: Record<string, unknown>, mime?: string, language?: string) {
  try {
    const { error } = await supabaseAdmin.from("crop_scans").insert({
      user_id: userId,
      mime_type: mime ?? null,
      language: language ?? null,
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

const SYSTEM_PROMPT = `You are an expert agricultural plant pathologist (Crop Doctor / फसल डॉक्टर) analyzing a photo of a crop or leaf.

LANGUAGE RULE (STRICT):
- The user's selected language is: "{language}".
- Respond ENTIRELY in that language.

IMAGE QUALITY FIRST (ABSOLUTE):
- Before diagnosing, assess image quality. If the photo is blurry, too dark, too distant, or does not clearly show the affected crop/leaf, you MUST say so and ask for a clearer close-up photo. Do NOT guess a diagnosis from a bad image.

SAFETY (ABSOLUTE):
- Never state a disease as confirmed fact from a photo alone. Use hedged language: "possible", "likely", "may be", "AI confidence".
- Never invent pesticide/fertilizer dosages. Give general guidance only, and recommend consulting a Krishi Vigyan Kendra or Kisan Call Centre 1800-180-1551 for exact doses.
- Distinguish possible causes: disease / pest damage / nutrient deficiency / water stress / environmental stress / healthy.

ANALYSIS:
1. Identify the crop (if visible).
2. Identify the plant part (leaf, stem, root, fruit, whole plant).
3. Assess health: healthy / possible disease / possible pest / possible deficiency / possible stress.
4. List visible symptoms.
5. Give practical next steps (organic first, then chemical in general terms).
6. State the urgency: low / medium / high / urgent (e.g. if the whole field is affected or it spreads fast).
7. Say when to seek expert confirmation (KVK, local agri extension officer, Kisan Call Centre).

OUTPUT — STRICT JSON, no markdown fences, no prose before or after:
{
  "crop": "Wheat" or null,
  "plant_part": "Leaf" or null,
  "health_status": "possible disease | possible pest | possible deficiency | possible water stress | possible environmental stress | healthy | unclear",
  "possible_issue": "Short hedged statement, e.g. 'Likely fungal leaf spot, needs field confirmation'",
  "confidence": 0-100 (only if the image is clear; low confidence when unclear),
  "symptoms": ["visible symptom 1", "..."],
  "recommendations": ["step 1", "..."],
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
      JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
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

  const { description, imageBase64, language = "Hindi (हिंदी)" } = parseResult.data;

  // Image validation before any AI spend (spec §11): clear errors, no hardcoded diagnoses.
  if (!imageBase64) {
    return new Response(
      JSON.stringify({ error: "Please attach a crop photo to analyze it.", needs_clearer_image: true }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const validation = validateImage(imageBase64);
  if (!validation.ok) {
    return new Response(
      JSON.stringify({ error: validation.error, needs_clearer_image: true }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    const systemPrompt = SYSTEM_PROMPT.replace("{language}", language);

    const messages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: description || "Please analyze this crop image. Identify the crop, plant part, health status, possible issue, symptoms and next steps."
          },
          { type: "image_url", image_url: { url: `data:${validation.mime};base64,${validation.base64}` } }
        ]
      }
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
        crop: null,
        plant_part: null,
        health_status: "unclear",
        possible_issue: null,
        confidence: null,
        symptoms: [],
        recommendations: [],
        urgency: "low",
        needs_clearer_image: true,
        next_steps_for_farmer: [],
        expert_confirm: "Please try again with a clearer, well-lit close-up photo of the affected part.",
      };
    }

    await persistScan(authResult.userId!, result, validation.mime, language);
    await logUsage(authResult.userId!, provider);

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
      const message = error.kind === "timeout"
        ? "निदान सेवा धीमी है। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
        : error.kind === "quota"
          ? "AI क्रेडिट समाप्त। कृपया क्रेडिट जोड़ें।"
          : error.kind === "rate_limit"
            ? "बहुत सारे अनुरोध। कृपया कुछ सेकंड बाद पुनः प्रयास करें।"
            : "निदान सेवा में अस्थायी समस्या। कृपया बाद में पुनः प्रयास करें।";
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "निदान सेवा में समस्या। कृपया पुनः प्रयास करें।" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
