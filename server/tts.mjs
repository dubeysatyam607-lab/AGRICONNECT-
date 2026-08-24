import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import { Readable } from "node:stream";

const app = express();
app.use(express.json({ limit: "512kb" }));

// Rate limit to protect the Sarvam AI budget from anonymous cost abuse.
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  message: { error: "Too many TTS requests. Please slow down." },
});
app.use("/api/tts", ttsLimiter);
app.use("/api/voice/tts", ttsLimiter);

// Restrict origins when ALLOWED_ORIGINS is configured (dev default stays open).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const checkOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ error: "Origin not allowed" });
};

app.use("/api/tts", checkOrigin);
app.use("/api/voice/tts", checkOrigin);

const MAX_TTS_TEXT_LENGTH = 1500;
const DEFAULT_SPEAKER = process.env.SARVAM_SPEAKER || "shubh";

// Centralized Sarvam language mapping for all 12 AgriConnect languages
const SARVAM_LANG_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  bn: "bn-IN",
  or: "od-IN",
  od: "od-IN",
  as: "as-IN",
};

/** Normalizes language code to Sarvam format (e.g. 'hi' -> 'hi-IN'). */
function getTargetLanguageCode(lang = "hi") {
  const clean = String(lang).toLowerCase().split("-")[0].trim();
  return SARVAM_LANG_MAP[clean] || "hi-IN";
}

// In-memory audio buffer cache to avoid regenerating identical audio
const audioCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Text normalisation so no markdown/formatting symbol is ever read aloud.
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

const handleTtsRequest = async (req, res) => {
  const raw = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const rawLang = req.body?.language || req.body?.languageCode || "hi";
  const speaker = req.body?.speaker || DEFAULT_SPEAKER;

  const text = sanitizeForSpeech(raw);
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return res.status(413).json({ error: "Text exceeds maximum allowed length of 1500 characters" });
  }

  const targetLang = getTargetLanguageCode(rawLang);

  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: "Sarvam AI API key is missing" });
  }

  // Cache lookup
  const cacheKey = `${targetLang}:${speaker}:${text}`;
  if (audioCache.has(cacheKey)) {
    const cachedBuffer = audioCache.get(cacheKey);
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(cachedBuffer);
  }

  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetLang,
        speaker: speaker,
        pace: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: "bulbul:v3",
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[Sarvam TTS] API error (${response.status}):`, errBody);
      return res.status(response.status).json({
        error: "Sarvam AI TTS generation failed",
        status: response.status,
      });
    }

    const data = await response.json();
    const base64Audio = data.audios && data.audios[0];

    if (!base64Audio) {
      return res.status(502).json({ error: "No audio data received from Sarvam AI" });
    }

    const audioBuffer = Buffer.from(base64Audio, "base64");

    // Add to LRU cache
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, audioBuffer);

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(audioBuffer);
  } catch (err) {
    console.error("[Sarvam TTS] Server error:", err);
    return res.status(500).json({ error: "Internal Server Error during TTS synthesis" });
  }
};

app.post("/api/tts", handleTtsRequest);
app.post("/api/voice/tts", handleTtsRequest);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Sarvam AI TTS backend running on http://localhost:${PORT}`);
});
