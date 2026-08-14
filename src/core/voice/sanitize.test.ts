// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { prepareTextForTTS } from './sanitize';

const FORBIDDEN = ['**', '*', '`', '```', '###', '>', '<', '[', ']', '(', ')', '|', '---', '~', '\\', '₹', '°'];

const assertNoFormatting = (out: string) => {
  for (const ch of FORBIDDEN) {
    expect(out, `must not contain "${ch}"`).not.toContain(ch);
  }
};

describe('voice / sanitize — markdown & formatting', () => {
  it('strips headers, colons and units like "### Weather : 28°C"', () => {
    const out = prepareTextForTTS('### Weather : 28°C', 'hi-IN');
    assertNoFormatting(out);
    expect(out).not.toMatch(/[#:]/);
    expect(out).toContain('डिग्री सेल्सियस');
  });

  it('strips bold formatting "**Namaste**"', () => {
    const out = prepareTextForTTS('**Namaste**', 'hi-IN');
    assertNoFormatting(out);
    expect(out).toContain('Namaste');
  });

  it('strips every markdown character class', () => {
    const out = prepareTextForTTS(
      '## Heading\n> quote\n- bullet\n1. number\n|table|row|\n**bold** _italic_ ~~strike~~ `code` [link](https://x.com) https://example.com',
      'en-IN'
    );
    assertNoFormatting(out);
    expect(out).toContain('Heading');
    expect(out).toContain('quote');
    expect(out).toContain('bullet');
    expect(out).toContain('bold');
    expect(out).toContain('code');
    expect(out).not.toContain('https');
    expect(out).not.toContain('(https');
  });

  it('removes JSON objects and arrays', () => {
    const out = prepareTextForTTS('The result was {"price": 1200, "ok": true} and [1, 2, 3].', 'en-IN');
    assertNoFormatting(out);
    expect(out).not.toContain('{');
    expect(out).not.toContain('}');
    expect(out).not.toContain('price');
  });

  it('never leaves an unpaired backslash or bracket', () => {
    const out = prepareTextForTTS('Value \\\\ 50% of [that] (cost)', 'en-IN');
    assertNoFormatting(out);
    expect(out).toContain('percent');
  });
});

describe('voice / sanitize — symbols to speech', () => {
  it('replaces degree, percent, currency and units in Hindi', () => {
    const out = prepareTextForTTS('Temp 28°C, rain 45%, price ₹4,320, 50 kg, 10 qtl.', 'hi-IN');
    assertNoFormatting(out);
    expect(out).toContain('28 डिग्री सेल्सियस');
    expect(out).toContain('45 प्रतिशत');
    expect(out).toContain('4,320 रुपये');
    expect(out).toContain('किलोग्राम');
    expect(out).toContain('क्विंटल');
  });

  it('replaces degree, percent, currency and units in English', () => {
    const out = prepareTextForTTS('Temp 28°C, rain 45%, price ₹4,320, 50 kg.', 'en-IN');
    assertNoFormatting(out);
    expect(out).toContain('28 degrees Celsius');
    expect(out).toContain('45 percent');
    expect(out).toContain('4,320 rupees');
    expect(out).toContain('kilogram');
  });

  it('replaces &, +, = with words', () => {
    expect(prepareTextForTTS('NPK 10 & 26 & 26', 'hi-IN')).toContain('और');
    expect(prepareTextForTTS('A + B = C', 'en-IN')).toContain('plus');
    expect(prepareTextForTTS('A + B = C', 'en-IN')).toContain('equals');
  });

  it('expands common abbreviations', () => {
    const hi = prepareTextForTTS('Use e.g. urea, etc. approx 5 kg.', 'hi-IN');
    expect(hi).not.toContain('e.g.');
    expect(hi).not.toContain('etc.');
    expect(hi).toContain('उदाहरण');
    expect(hi).toContain('वगैरह');

    const en = prepareTextForTTS('e.g. for example, i.e. that is, approx.', 'en-IN');
    expect(en).not.toContain('e.g.');
    expect(en).toContain('for example');
    expect(en).toContain('that is');
    expect(en).toContain('approximately');
    expect(en).not.toContain('approx.');
  });

  it('expands agri schemes and abbreviations in Hindi', () => {
    const out = prepareTextForTTS('PM-Kisan and PMFBY via KCC with MSP.', 'hi-IN');
    expect(out).toContain('पीएम किसान');
    expect(out).toContain('प्रधानमंत्री फसल बीमा योजना');
    expect(out).toContain('किसान क्रेडिट कार्ड');
  });
});

describe('voice / sanitize — output hygiene', () => {
  it('removes all emoji and un-speakable symbols', () => {
    const out = prepareTextForTTS('Great 🌾! 🙏💧₹🐛', 'hi-IN');
    assertNoFormatting(out);
    expect(out).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('collapses whitespace and guarantees terminal punctuation', () => {
    const out = prepareTextForTTS('  Hello   world ', 'en-IN');
    expect(out).toMatch(/\s+/);
    expect(out.trim()).toBe('Hello world.');
  });

  it('keeps apostrophes inside English contractions', () => {
    const out = prepareTextForTTS("Don't spray today.", 'en-IN');
    expect(out).toContain("Don't");
  });

  it('keeps Devanagari and the danda punctuation', () => {
    const out = prepareTextForTTS('नमस्ते भाई। फसल अच्छी है।', 'hi-IN');
    assertNoFormatting(out);
    expect(out).toContain('नमस्ते');
    expect(out).toContain('।');
  });

  it('returns empty string for empty/garbage input', () => {
    expect(prepareTextForTTS('')).toBe('');
    expect(prepareTextForTTS('   ')).toBe('');
    expect(prepareTextForTTS('***', 'en-IN')).not.toContain('*');
  });

  it('strips raw URLs and keeps no remnants', () => {
    const out = prepareTextForTTS('See https://agri.in/news?id=1 and www.farm.com now.', 'en-IN');
    expect(out).not.toMatch(/https?|www/);
  });
});
