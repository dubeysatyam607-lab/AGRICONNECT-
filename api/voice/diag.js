/**
 * Diagnostic endpoint — checks whether SARVAM_API_KEY is reachable
 * from Vercel serverless. Never exposes the actual key value.
 *
 * GET /api/voice/diag
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const raw = process.env.SARVAM_API_KEY || "";
  const key = raw.replace(/^["']|["']$/g, "").trim();
  const speaker = (process.env.SARVAM_SPEAKER || "shubh").replace(/^["']|["']$/g, "").trim();

  const info = {
    keyPresent: key.length > 0,
    keyLength: key.length,
    keyPrefix: key ? key.substring(0, 6) + "..." : "(empty)",
    keyHasSurroundingQuotes: raw !== key,
    speaker,
  };

  // Quick probe: call Sarvam API with a minimal text
  if (key) {
    try {
      const probe = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": key,
        },
        body: JSON.stringify({
          inputs: ["test"],
          target_language_code: "en-IN",
          speaker: speaker,
          pace: 1.0,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: "bulbul:v3",
        }),
      });
      info.probeStatus = probe.status;
      info.probeOK = probe.ok;
      if (!probe.ok) {
        info.probeError = await probe.text();
      }
    } catch (e) {
      info.probeStatus = "error";
      info.probeError = e.message;
    }
  }

  return res.status(200).json(info);
}
