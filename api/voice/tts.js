/**
 * Vercel Serverless Function — ElevenLabs Neural Text-to-Speech
 *
 * Handles POST /api/voice/tts with { text, languageCode } body.
 * Streams MP3 audio back from ElevenLabs API.
 *
 * Required env var (set in Vercel Dashboard → Settings → Environment Variables):
 *   ELEVEN_LABS_API_KEY=sk_...
 *
 * Optional env vars:
 *   ELEVEN_LABS_VOICE_ID  (default: 21m00Tcm4TlvDq8ikWAM)
 *   ELEVEN_LABS_MODEL_ID  (default: eleven_v3_conversational)
 */

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const OUTPUT_FORMAT = "mp3_44100_192";
const MAX_TEXT_LENGTH = 1500;

const MODEL_CHAIN = [
  process.env.ELEVEN_LABS_MODEL_ID || "eleven_v3_conversational",
  "eleven_v3",
  "eleven_multilingual_v2",
];

const VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.85,
  style: 0.3,
  use_speaker_boost: true,
};

/** Strip markdown, symbols, emojis so TTS never reads them aloud. */
function sanitizeForSpeech(text) {
  let out = text;
  out = out.replace(/```[\s\S]*?```/g, " ");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\{[\s\S]*?\}/g, " ");
  out = out.replace(/<[^>]*>/g, " ");
  out = out.replace(/\bhttps?:\/\/\S+/gi, " ");
  out = out.replace(/\bwww\.\S+/gi, " ");
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/^[-*_]{3,}\s*$/gm, " ");
  out = out.replace(/^\s*>\s*/gm, "");
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+[.)]\s+/gm, "");
  out = out.replace(/\|/g, " ");
  out = out.replace(/\*\*(.*?)\*\*/g, "$1");
  out = out.replace(/\*(.*?)\*/g, "$1");
  out = out.replace(/__(.*?)__/g, "$1");
  out = out.replace(/_(.*?)_/g, "$1");
  out = out.replace(/~~(.*?)~~/g, "$1");
  out = out.replace(/(\d+)\s*°\s*C\b/gi, "$1 degrees Celsius");
  out = out.replace(/(\d+)\s*°\s*F\b/gi, "$1 degrees Fahrenheit");
  out = out.replace(/°C\b/gi, "degrees Celsius");
  out = out.replace(/°F\b/gi, "degrees Fahrenheit");
  out = out.replace(/°/g, " degrees ");
  out = out.replace(/(\d+)\s*%/g, "$1 percent");
  out = out.replace(/%/g, " percent ");
  out = out.replace(/(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, "$1 rupees");
  out = out.replace(/(?:₹|Rs\.?|INR)/gi, " rupees ");
  out = out.replace(/\bkg\/acre\b/gi, "kilogram per acre");
  out = out.replace(/\bkg\b/gi, "kilogram");
  out = out.replace(/\bqtl\b/gi, "quintal");
  out = out.replace(/\s*\+\s*/g, " plus ");
  out = out.replace(/\s*=\s*/g, " equals ");
  out = out.replace(/\s*&\s*/g, " and ");
  out = out.replace(/[;:<>[\]{}()^*#\\~]/g, " ");
  out = out.replace(/[""]/g, " ");
  out = out.replace(/\s-\s/g, ", ");
  out = out.replace(/-{2,}/g, ", ");
  out = out.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,
    ""
  );
  out = out.replace(/\s+/g, " ").trim();
  if (out && !/[.!?।…]$/.test(out)) out += ".";
  return out;
}

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse body
  const raw = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const text = sanitizeForSpeech(raw);

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({ error: "Text exceeds maximum allowed length" });
  }

  // Check API key
  const apiKey = process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("[tts] ELEVEN_LABS_API_KEY not set in environment variables");
    return res.status(503).json({ error: "Voice service is not configured" });
  }

  const voiceId = process.env.ELEVEN_LABS_VOICE_ID || DEFAULT_VOICE_ID;

  // Try each model in the fallback chain
  let lastResponse = null;
  let lastError = null;

  for (const modelId of MODEL_CHAIN) {
    try {
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${OUTPUT_FORMAT}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: VOICE_SETTINGS,
        }),
      });

      if (response.ok) {
        lastResponse = response;
        break;
      }

      const body = await response.text();
      lastError = body;

      // Only fall through for model-unavailable responses
      if (response.status !== 400 && response.status !== 404 && response.status !== 422) {
        lastResponse = response;
        lastError = body;
        break;
      }
      console.warn(`[tts] Model ${modelId} unavailable (${response.status}), trying next.`);
    } catch (err) {
      lastError = err;
    }
  }

  // All models failed
  if (!lastResponse) {
    console.error("[tts] All models failed:", lastError);
    return res.status(502).json({ error: "Voice service is temporarily unavailable" });
  }

  if (!lastResponse.ok) {
    const body = typeof lastError === "string" ? lastError : "";
    console.error("[tts] ElevenLabs API error:", lastResponse.status, body);

    if (lastResponse.status === 401) {
      return res.status(503).json({ error: "Voice service authentication failed" });
    }
    if (lastResponse.status === 429) {
      return res.status(429).json({ error: "Voice service quota reached. Please try again later." });
    }
    return res.status(lastResponse.status).json({ error: "Voice service is temporarily unavailable" });
  }

  // Stream audio back to client
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const reader = lastResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } catch (err) {
    console.error("[tts] Stream error:", err);
  } finally {
    res.end();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50kb",
    },
  },
};
