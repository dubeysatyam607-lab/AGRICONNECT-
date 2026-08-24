const axios = require('axios');

/**
 * Sarvam AI High Quality Neural Text-to-Speech Controller.
 *
 * Uses Sarvam AI (Subh speaker, bulbul:v1 model) for 12 Indian languages:
 * English, Hindi, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada,
 * Malayalam, Bengali, Odia, Assamese.
 */
const DEFAULT_SPEAKER = process.env.SARVAM_SPEAKER || 'shubh';

const SARVAM_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  or: 'od-IN',
  od: 'od-IN',
  as: 'as-IN',
};

function getTargetLanguageCode(lang = 'hi') {
  const clean = String(lang).toLowerCase().split('-')[0].trim();
  return SARVAM_LANG_MAP[clean] || 'hi-IN';
}

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
    const { text, languageCode = 'hi-IN', speaker = DEFAULT_SPEAKER } = req.body;
    const cleaned = sanitizeForSpeech(typeof text === 'string' ? text : '');

    if (!cleaned || !cleaned.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.SARVAM_API_KEY;

    if (!apiKey) {
      console.error('Sarvam AI API Key is missing from environment variables.');
      return res.status(503).json({ error: 'Sarvam AI API key is missing' });
    }

    const targetLang = getTargetLanguageCode(languageCode);

    const response = await axios({
      method: 'post',
      url: 'https://api.sarvam.ai/text-to-speech',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      data: {
        inputs: [cleaned],
        target_language_code: targetLang,
        speaker: speaker,
        pace: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v3',
      },
    });

    const base64Audio = response.data?.audios?.[0];
    if (!base64Audio) {
      return res.status(502).json({ error: 'No audio returned from Sarvam AI' });
    }

    const audioBuffer = Buffer.from(base64Audio, 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(audioBuffer);
  } catch (error) {
    console.error('Sarvam AI TTS Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Sarvam AI TTS synthesis failed',
      details: error.response?.data || error.message,
    });
  }
};
