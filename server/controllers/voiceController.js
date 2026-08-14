const axios = require('axios');

/**
 * ElevenLabs High Quality Neural Text-to-Speech Controller.
 *
 * Uses the best-available multilingual conversational model
 * (`eleven_v3_conversational`, with automatic fallback to `eleven_v3` then
 * `eleven_multilingual_v2`) so Indian Hindi sounds natural and human — never
 * robotic. Text is sanitised so no markdown/symbol is ever read aloud.
 */
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const MODEL_CHAIN = [
  process.env.ELEVEN_LABS_MODEL_ID || 'eleven_v3_conversational',
  'eleven_v3',
  'eleven_multilingual_v2',
];
const VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.85,
  style: 0.3,
  use_speaker_boost: true,
};
const OUTPUT_FORMAT = 'mp3_44100_192';

/** Remove markdown/formatting/symbols so TTS never reads them aloud. */
function sanitizeForSpeech(text) {
  let out = text;
  out = out.replace(/```[\s\S]*?```/g, ' ');
  out = out.replace(/`([^`]+)`/g, '$1');
  out = out.replace(/\{[\s\S]*?\}/g, ' ');
  out = out.replace(/<[^>]*>/g, ' ');
  out = out.replace(/\bhttps?:\/\/\S+/gi, ' ');
  out = out.replace(/\bwww\.\S+/gi, ' ');
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/^[-*_]{3,}\s*$/gm, ' ');
  out = out.replace(/^\s*>\s*/gm, '');
  out = out.replace(/^\s*[-*+]\s+/gm, '');
  out = out.replace(/^\s*\d+[.)]\s+/gm, '');
  out = out.replace(/\|/g, ' ');
  out = out.replace(/\*\*(.*?)\*\*/g, '$1');
  out = out.replace(/\*(.*?)\*/g, '$1');
  out = out.replace(/__(.*?)__/g, '$1');
  out = out.replace(/_(.*?)_/g, '$1');
  out = out.replace(/~~(.*?)~~/g, '$1');
  out = out.replace(/(\d+)\s*°\s*C\b/gi, '$1 degrees Celsius');
  out = out.replace(/(\d+)\s*°\s*F\b/gi, '$1 degrees Fahrenheit');
  out = out.replace(/°C\b/gi, 'degrees Celsius');
  out = out.replace(/°F\b/gi, 'degrees Fahrenheit');
  out = out.replace(/°/g, ' degrees ');
  out = out.replace(/(\d+)\s*%/g, '$1 percent');
  out = out.replace(/%/g, ' percent ');
  out = out.replace(/(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, '$1 rupees');
  out = out.replace(/(?:₹|Rs\.?|INR)/gi, ' rupees ');
  out = out.replace(/\bkg\b/gi, 'kilogram');
  out = out.replace(/\bqtl\b/gi, 'quintal');
  out = out.replace(/\s*\+\s*/g, ' plus ');
  out = out.replace(/\s*=\s*/g, ' equals ');
  out = out.replace(/\s*&\s*/g, ' and ');
  out = out.replace(/[;:<>[\]{}()^*#\\~]/g, ' ');
  out = out.replace(/[""]/g, ' ');
  out = out.replace(/\s-\s/g, ', ');
  out = out.replace(/-{2,}/g, ', ');
  out = out.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '');
  out = out.replace(/\s+/g, ' ').trim();
  if (out && !/[.!?।…]$/.test(out)) out += '.';
  return out;
}

exports.textToSpeech = async (req, res) => {
  try {
    const { text, languageCode = 'hi-IN' } = req.body;
    const cleaned = sanitizeForSpeech(typeof text === 'string' ? text : '');

    if (!cleaned || !cleaned.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API Key is missing from environment variables.');
      return res.status(503).json({ error: 'ElevenLabs API key is missing' });
    }

    const voiceId = process.env.ELEVEN_LABS_VOICE_ID || DEFAULT_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${OUTPUT_FORMAT}`;

    let stream = null;
    let lastStatus = 0;
    let lastError = null;
    for (const modelId of MODEL_CHAIN) {
      try {
        const response = await axios({
          method: 'post',
          url,
          headers: {
            Accept: 'audio/mpeg',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          data: {
            text: cleaned.trim(),
            model_id: modelId,
            voice_settings: VOICE_SETTINGS,
          },
          responseType: 'stream',
          timeout: 20000,
        });
        stream = response;
        lastStatus = response.status;
        break;
      } catch (error) {
        const status = error?.response?.status || 0;
        lastStatus = status;
        lastError = error;
        // Only fall through to the next model for model-unavailable responses.
        if (!(status === 400 || status === 404 || status === 422)) break;
        console.warn(`[voice] Model ${modelId} unavailable (${status}), trying next.`);
      }
    }

    if (!stream) {
      const details = lastError?.response?.data || lastError?.message;
      console.error('ElevenLabs TTS Controller Error:', lastStatus, details);
      return res.status(lastStatus || 502).json({ error: 'Failed to generate speech via ElevenLabs' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    });

    stream.data.pipe(res);
  } catch (error) {
    const status = error?.response?.status || 500;
    const details = error?.response?.data || error.message;
    console.error('ElevenLabs TTS Controller Error:', status, details);
    res.status(status).json({ error: 'Failed to generate speech via ElevenLabs' });
  }
};
