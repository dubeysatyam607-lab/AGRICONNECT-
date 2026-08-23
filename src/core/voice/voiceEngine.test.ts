// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chunkForSpeech, textForSpeech } from './tts';
import { detectLanguageOf, localeForLang, langLabel } from './language';
import { extractEntities, verifyCropConsistency } from './entities';
import { correctTranscription } from './stt';
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
    const r = detectLanguageOf('tamatar ka bhav kya hai');
    expect(r?.lang).toBe('hi');
    expect(r?.script).toBe('hinglish');
  });

  it('detects single word Hinglish crop as Hindi/Hinglish', () => {
    const r = detectLanguageOf('tamatar');
    expect(r?.lang).toBe('hi');
  });

  it('detects plain English as English', () => {
    expect(detectLanguageOf('what is tomato price')?.lang).toBe('en');
  });

  it('localeForLang maps supported languages', () => {
    expect(localeForLang('hi')).toBe('hi-IN');
    expect(localeForLang('ta')).toBe('ta-IN');
  });

  it('langLabel returns native names', () => {
    expect(langLabel('hi')).toContain('हिंदी');
    expect(langLabel('en')).toBe('English');
  });
});

describe('voice / entity extraction & consistency', () => {
  it('extracts tomato from Hinglish price query', () => {
    const res = extractEntities('Indore mandi mein tamatar ka bhav kya hai');
    expect(res.crop).toBe('tomato');
    expect(res.mandi).toBe('Indore');
    expect(res.intent).toBe('mandi_price');
  });

  it('extracts wheat from Hindi query', () => {
    const res = extractEntities('गेहूं की सिंचाई कब करें');
    expect(res.crop).toBe('wheat');
    expect(res.intent).toBe('irrigation');
  });

  it('verifies crop consistency and rejects wrong crop answers', () => {
    // If requested tomato, answer talking only about soybean should be rejected
    const isConsistent = verifyCropConsistency('tomato', 'Soybean ki kheti mein DAP 50kg daalein.');
    expect(isConsistent).toBe(false);

    // If requested tomato, answer talking about tomato should be accepted
    const isTomatoConsistent = verifyCropConsistency('tomato', 'Tamatar ka mandi bhav ₹2500/quintal hai.');
    expect(isTomatoConsistent).toBe(true);
  });
});

describe('voice / transcription correction', () => {
  it('corrects speech recognition typos', () => {
    expect(correctTranscription('tamatar ka baav batao')).toBe('tamatar ka bhav batao');
    expect(correctTranscription('soya been ka rate')).toBe('soyabean ka rate');
    expect(correctTranscription('indor mandi')).toBe('Indore mandi');
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
