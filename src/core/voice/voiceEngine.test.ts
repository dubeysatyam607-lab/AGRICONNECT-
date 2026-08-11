// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chunkForSpeech, textForSpeech } from './tts';
import { detectLanguageOf, localeForLang, langLabel } from './language';
import {
  readMemory, writeMemory, rememberProfile, extractFacts,
  updateMemory, rememberTopic, buildMemoryContext,
} from './memory';
import { humanizeResponse, warmOpening, speakNumber, personaInstruction } from './humanize';

const KEY = 'agri_assistant_memory_v1';

describe('voice / tts', () => {
  it('chunkForSpeech strips markdown and emoji noise', () => {
    const chunks = chunkForSpeech('**Good morning** farmer 🌾. How is your soybean crop today?');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.join(' ')).not.toContain('**');
    expect(chunks.join(' ')).not.toContain('🌾');
  });

  it('chunkForSpeech returns [] for empty input', () => {
    expect(chunkForSpeech('')).toEqual([]);
    expect(chunkForSpeech('   ')).toEqual([]);
  });

  it('textForSpeech flattens links and backticks', () => {
    const out = textForSpeech('See `this` and [link](https://x.com)', 'en-IN');
    expect(out).not.toContain('`');
    expect(out).not.toContain('](');
  });
});

describe('voice / language', () => {
  it('detects Devanagari as Hindi', () => {
    const r = detectLanguageOf('मेरी फसल में कीट लग गए हैं');
    expect(r?.lang).toBe('hi');
    expect(r?.script).toBe('devanagari');
  });

  it('detects Tamil script', () => {
    expect(detectLanguageOf('என் பயிருக்கு உரம் தேவை')?.lang).toBe('ta');
  });

  it('detects Hinglish farming talk as Hindi', () => {
    const r = detectLanguageOf('kya mandi bhav hai aaj');
    expect(r?.lang).toBe('hi');
  });

  it('detects plain English as English', () => {
    expect(detectLanguageOf('how do I fix yellow leaves')?.lang).toBe('en');
  });

  it('returns null for empty text', () => {
    expect(detectLanguageOf('')).toBeNull();
  });

  it('localeForLang maps supported languages', () => {
    expect(localeForLang('hi')).toBe('hi-IN');
    expect(localeForLang('ta')).toBe('ta-IN');
    expect(localeForLang('en')).toBe('en-IN');
    expect(localeForLang('zz')).toBe('en-IN');
  });

  it('langLabel returns native names', () => {
    expect(langLabel('hi')).toBe('हिंदी');
    expect(langLabel('en')).toBe('English');
  });
});

describe('voice / memory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('writeMemory/readMemory round-trips', () => {
    writeMemory({ ...readMemory(), name: 'Ramesh' });
    expect(readMemory().name).toBe('Ramesh');
  });

  it('rememberProfile seeds and increments visits', () => {
    rememberProfile({ crop: 'Soybean', farmArea: 5.2, soilType: 'Black Soil' });
    rememberProfile({ crop: 'Soybean', farmArea: 5.2, soilType: 'Black Soil' });
    const m = readMemory();
    expect(m.crop).toBe('Soybean');
    expect(m.visits).toBe(2);
  });

  it('extractFacts picks up name and village', () => {
    const facts = extractFacts('my name is Ramesh Patel and I live in Nanded village');
    expect(facts.name).toBe('Ramesh Patel');
    expect(facts.village).toBe('Nanded village');
  });

  it('updateMemory merges facts', () => {
    updateMemory((m) => { m.facts = { ...m.facts, loan: 'KCC' }; });
    expect(readMemory().facts.loan).toBe('KCC');
  });

  it('rememberTopic dedupes and caps', () => {
    rememberTopic('mandi price');
    rememberTopic('mandi price');
    rememberTopic('fertilizer');
    const m = readMemory();
    expect(m.topics.filter((t) => t === 'mandi price').length).toBe(1);
    expect(m.topics.length).toBe(2);
  });

  it('buildMemoryContext is empty without facts and populated otherwise', () => {
    writeMemory({ ...readMemory(), name: '', crop: '', farmArea: 0, soilType: '', variety: '', stage: '', village: '' });
    expect(buildMemoryContext(readMemory())).toBe('');

    writeMemory({ ...readMemory(), name: 'Ramesh', crop: 'Soybean', stage: 'Flowering', farmArea: 5.2 });
    const ctx = buildMemoryContext(readMemory());
    expect(ctx).toContain('Ramesh');
    expect(ctx).toContain('Soybean');
    expect(ctx).toContain('5.2');
  });
});

describe('voice / humanize', () => {
  it('humanizeResponse capitalises and terminates', () => {
    expect(humanizeResponse('  hello world')).toBe('Hello world.');
    expect(humanizeResponse('Already fine.')).toBe('Already fine.');
  });

  it('warmOpening greets by name in both languages', () => {
    expect(warmOpening('hi', 'Ramesh')).toContain('Ramesh');
    expect(warmOpening('en', 'Ramesh')).toContain('Ramesh');
  });

  it('speakNumber formats to Indian digits', () => {
    expect(speakNumber(29.4)).toBe('29');
    expect(speakNumber('4,320')).toBe('4,320');
  });

  it('personaInstruction provides a warm role for both languages', () => {
    expect(personaInstruction('hi')).toContain('कृषि');
    expect(personaInstruction('en')).toContain('farmer');
  });
});
