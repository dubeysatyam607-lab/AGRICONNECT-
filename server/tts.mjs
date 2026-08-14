import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import { Readable } from "node:stream";

const app = express();
app.use(express.json({ limit: "512kb" }));

// Rate limit to protect the ElevenLabs budget from anonymous cost abuse.
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  message: { error: "Too many TTS requests. Please slow down." },
});
app.use("/api/tts", ttsLimiter);

// Restrict origins when ALLOWED_ORIGINS is configured (dev default stays open).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use("/api/tts", (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ error: "Origin not allowed" });
});

const MAX_TTS_TEXT_LENGTH = 1500;

// ─────────────────────────────────────────────────────────────────────────────
// Voice configuration — ElevenLabs Neural, best-available multilingual
// conversational model. `eleven_v3_conversational` is ultra-low-latency and
// tuned for live dialogue; we fall back automatically to `eleven_v3` then
// `eleven_multilingual_v2` if the account lacks access to a newer model.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const MODEL_CHAIN = [
  process.env.ELEVEN_LABS_MODEL_ID || "eleven_v3_conversational",
  "eleven_v3",
  "eleven_multilingual_v2",
];

const VOICE_SETTINGS = {
  stability: 0.6, // high stability → no sudden pitch jumps / robotic wobble
  similarity_boost: 0.85, // clear, consistent pronunciation
  style: 0.3, // natural conversational emotion, not a flat narrator
  use_speaker_boost: true, // crisp, non-clipped output
};

const OUTPUT_FORMAT = "mp3_44100_192"; // high-fidelity, crystal-clear audio

/**
 * Lightweight text normalisation so no markdown/formatting symbol is ever
 * read aloud. Defense-in-depth: the client also sanitises before sending.
 */
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

app.post("/api/tts", async (req, res) => {
  const raw = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const text = sanitizeForSpeech(raw);
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return res.status(413).json({ error: "Text exceeds maximum allowed length" });
  }

  const apiKey = process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "ElevenLabs API key is missing" });
  }

  const voiceId = process.env.ELEVEN_LABS_VOICE_ID || DEFAULT_VOICE_ID;

  const trySynthesize = async (modelId) => {
    const endpoint =
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream` +
      `?output_format=${OUTPUT_FORMAT}`;

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
    return response;
  };

  let lastResponse = null;
  let lastError = null;
  for (const modelId of MODEL_CHAIN) {
    try {
      const response = await trySynthesize(modelId);
      if (response.ok) {
        lastResponse = response;
        break;
      }
      const body = await response.text();
      lastError = body;
      // Model not found / unsupported — try the next model in the chain.
      if (response.status !== 400 && response.status !== 404 && response.status !== 422) {
        lastResponse = response;
        lastError = body;
        break;
      }
      console.warn(`[tts] Model ${modelId} unavailable (${response.status}), trying next.`);
    } catch (err) {
      lastError = err;
      // Network error — retry the next model too.
    }
  }

  if (!lastResponse) {
    console.error("ElevenLabs TTS error:", lastError);
    return res.status(502).json({ error: "ElevenLabs TTS generation failed" });
  }
  if (!lastResponse.ok) {
    const body = typeof lastError === "string" ? lastError : "";
    console.error("ElevenLabs API error:", lastResponse.status, body);
    return res.status(lastResponse.status).json({ error: "ElevenLabs API error" });
  }

  // Stream audio chunks directly to the client for lowest time-to-first-byte.
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  const nodeStream = Readable.fromWeb(lastResponse.body);
  nodeStream.on("error", (err) => {
    console.error("ElevenLabs stream error:", err);
    if (!res.headersSent) res.status(502).json({ error: "TTS stream failed" });
    res.end();
  });
  nodeStream.pipe(res);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ElevenLabs TTS backend running on http://localhost:${PORT}`);
});
