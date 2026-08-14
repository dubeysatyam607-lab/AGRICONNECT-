import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json({ limit: "512kb" }));

// Rate limit to protect the Azure TTS budget from anonymous cost abuse.
const azureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  message: { error: "Too many TTS requests. Please slow down." },
});
app.use("/api/azure-tts", azureLimiter);

// Restrict origins when ALLOWED_ORIGINS is configured (dev default stays open).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use("/api/azure-tts", (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ error: "Origin not allowed" });
});

const AZURE_REGION = process.env.AZURE_REGION;
const AZURE_TTS_KEY = process.env.AZURE_TTS_KEY;
const VOICE_NAME = process.env.AZURE_VOICE_NAME || "hi-IN-MadhurNeural";

if (!AZURE_REGION || !AZURE_TTS_KEY) {
  console.error("[azure-tts] AZURE_REGION and AZURE_TTS_KEY must be set in server/.env. Skipping Azure TTS server.");
  process.exit(1);
}

const cleanHindiText = (text) => {
  const replacements = {
    bazaar: "बाज़ार",
    market: "बाज़ार",
    urea: "यूरिया",
    pesticide: "पेस्टिसाइड",
    fertilizer: "उर्वरक",
  };

  let cleaned = text;
  Object.entries(replacements).forEach(([key, value]) => {
    cleaned = cleaned.replace(new RegExp(`\\b${key}\\b`, "gi"), value);
  });

  cleaned = cleaned.replace(/\s*,\s*/g, "，");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/，/g, ",");
  return cleaned;
};

const buildSsml = (text) => {
  const cleaned = cleanHindiText(text);
  return `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xml:lang="hi-IN">
  <voice name="${VOICE_NAME}">
    <prosody rate="88%" pitch="-12%">
      <mstts:express-as style="calm" styledegree="1.0">
        ${cleaned}
      </mstts:express-as>
    </prosody>
  </voice>
</speak>`;
};

app.post("/api/azure-tts", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const ssml = buildSsml(text);
  const endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_TTS_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).send(errorBody);
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Azure TTS error:", error);
    res.status(500).json({ error: "Azure TTS generation failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Azure TTS backend running on http://localhost:${PORT}`);
});
