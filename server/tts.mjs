import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

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

app.post("/api/tts", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
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

  const voiceId = process.env.ELEVEN_LABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("ElevenLabs API error:", response.status, body);
      return res.status(response.status).json({ error: "ElevenLabs API error" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    res.status(500).json({ error: "ElevenLabs TTS generation failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ElevenLabs TTS backend running on http://localhost:${PORT}`);
});
