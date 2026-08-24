import { describe, it, expect } from 'vitest';
import {
  SARVAM_LANGUAGE_MAP,
  getSarvamLanguageCode,
  getSarvamSpeaker,
  detectLanguageOf,
  localeForLang,
} from './language';
import { prepareTextForTTS } from './sanitize';
import { chunkForSpeech, ttsSupported } from './tts';

describe('Sarvam AI Language Mapping — All 12 Indian Languages', () => {
  const supportedLanguages = [
    { key: 'en', expectedCode: 'en-IN' },
    { key: 'hi', expectedCode: 'hi-IN' },
    { key: 'mr', expectedCode: 'mr-IN' },
    { key: 'gu', expectedCode: 'gu-IN' },
    { key: 'pa', expectedCode: 'pa-IN' },
    { key: 'ta', expectedCode: 'ta-IN' },
    { key: 'te', expectedCode: 'te-IN' },
    { key: 'kn', expectedCode: 'kn-IN' },
    { key: 'ml', expectedCode: 'ml-IN' },
    { key: 'bn', expectedCode: 'bn-IN' },
    { key: 'or', expectedCode: 'od-IN' },
    { key: 'as', expectedCode: 'as-IN' },
  ];

  it('maps all 12 supported AgriConnect languages correctly to Sarvam API codes', () => {
    for (const item of supportedLanguages) {
      expect(getSarvamLanguageCode(item.key)).toBe(item.expectedCode);
      expect(SARVAM_LANGUAGE_MAP[item.key]).toBeDefined();
      expect(SARVAM_LANGUAGE_MAP[item.key].speaker).toBe('shubh');
    }
  });

  it('defaults to Shubh voice speaker for all languages', () => {
    expect(getSarvamSpeaker('hi')).toBe('shubh');
    expect(getSarvamSpeaker('en')).toBe('shubh');
    expect(getSarvamSpeaker('mr')).toBe('shubh');
    expect(getSarvamSpeaker('ta')).toBe('shubh');
  });

  it('falls back safely to hi-IN for unknown or empty languages', () => {
    expect(getSarvamLanguageCode('')).toBe('hi-IN');
    expect(getSarvamLanguageCode('unknown-lang')).toBe('hi-IN');
  });
});

describe('Text Preprocessor & Sanitizer for Sarvam TTS', () => {
  it('strips markdown, code blocks, URLs and symbols without losing speech words', () => {
    const raw = '🌾 **गेहूं की फसल** के लिए 50 kg/acre यूरिया और 25% पोटाश डालें। कीमत ₹1,200/qtl है। Visit https://agriconnect.in for details!';
    const sanitized = prepareTextForTTS(raw, 'hi-IN');

    expect(sanitized).not.toContain('**');
    expect(sanitized).not.toContain('https://');
    expect(sanitized).not.toContain('🌾');
    expect(sanitized).toContain('गेहूं की फसल');
    expect(sanitized).toContain('यूरिया');
  });

  it('chunks long responses into conversational sentences', () => {
    const longText =
      'किसान भाई गेहूं की बुवाई नवंबर के पहले पखवाड़े में करें। उचित बीज दर 100 किलोग्राम प्रति हेक्टेयर रखें। पहली सिंचाई बुवाई के 20-25 दिन बाद सीआरआई अवस्था में करें। इसके बाद आवश्यकतानुसार 4 से 5 सिंचाइयां दें।';
    const chunks = chunkForSpeech(longText, 'hi-IN');

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(150);
    }
  });
});
