/**
 * VoiceEngine — Human-like Indian Natural Text-to-Speech Engine
 *
 * Replaces robotic voice output with natural conversational Indian Hindi / Hinglish voice.
 * Features:
 * 1. Natural Indian Hindi / Hinglish phonetics and accent selection.
 * 2. Instant sub-second chunk playback (latency < 1s).
 * 3. Conversational pacing with natural pauses.
 * 4. Immediate interruption (barge-in support).
 * 5. Full text normalization (no raw symbols or markdown spoken).
 */

import { prepareTextForTTS } from './sanitize';

export interface TtsProgress {
  /** Global character index within the original full text. */
  charIndex: number;
  /** Which sentence chunk is currently being spoken. */
  sentenceIndex: number;
}

export interface TtsCallbacks {
  onStart?: (totalSentences: number) => void;
  onProgress?: (p: TtsProgress) => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export interface TtsController {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
  setRate: (rate: number) => void;
  isSpeaking: () => boolean;
  isPaused: () => boolean;
  getRate: () => number;
}

export const ttsSupported = (): boolean =>
  typeof window !== 'undefined' &&
  (!!window.AudioContext || !!(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext || 'speechSynthesis' in window);

/** Re-export prepareTextForTTS for convenience. */
export function textForSpeech(text: string, lang: string = 'hi-IN'): string {
  return prepareTextForTTS(text, lang);
}

/** Split clean text into speakable sentence chunks with natural conversational length. */
export function chunkForSpeech(text: string, lang: string = 'hi-IN'): string[] {
  const cleaned = prepareTextForTTS(text, lang).trim();
  if (!cleaned) return [];

  const rawSentences = cleaned.split(/(?<=[.!?।…])\s+/).filter(Boolean);
  const out: string[] = [];

  const MAX_CHUNK_LEN = 110;
  for (const sentence of rawSentences) {
    if (sentence.length <= MAX_CHUNK_LEN) {
      out.push(sentence);
      continue;
    }

    // Split longer sentences on commas or logical conjunctions
    const parts = sentence.split(/(?<=,)\s+/);
    let current = '';
    for (const part of parts) {
      if ((current + ' ' + part).trim().length > MAX_CHUNK_LEN && current) {
        out.push(current.trim());
        current = part;
      } else {
        current = (current + ' ' + part).trim();
      }
    }
    if (current.trim()) out.push(current.trim());
  }

  return out.filter(Boolean);
}

// Global cache for Web Speech voices
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices() || [];
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
}

/**
 * Finds the most natural Indian human voice for the given language.
 * Prefers natural neural Indian voices over generic synthesizers.
 */
export function getBestIndianVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLang = (lang || 'hi-IN').toLowerCase().replace('_', '-');
  const baseCode = targetLang.split('-')[0];

  // 1. High-priority natural Indian neural voices (Hindi & Indian English)
  const preferredPatterns = [
    /google.*(hindi|हिन्दी|indian)/i,
    /microsoft.*(natural|swara|madhur|hemant|neerja|prabhat|heera|ravi|madhav|priya)/i,
    /(lekha|neerja|veena|rishi|pradeep|kaveri|ananya|kavya|aravind)/i,
    /hi[-_]in/i,
  ];

  for (const pat of preferredPatterns) {
    const match = voices.find(
      (v) => pat.test(v.name) || pat.test(v.lang),
    );
    if (match) return match;
  }

  // 2. Exact language match
  const exactMatch = voices.find((v) => v.lang.toLowerCase() === targetLang);
  if (exactMatch) return exactMatch;

  // 3. Base language match (e.g. 'hi' or 'en')
  const baseMatch = voices.find((v) => v.lang.toLowerCase().startsWith(baseCode));
  if (baseMatch) return baseMatch;

  // 4. Any Indian English/Hindi voice fallback
  const anyIndian = voices.find(
    (v) => v.lang.toLowerCase().includes('in') || /india/i.test(v.name),
  );
  return anyIndian || voices[0] || null;
}

/**
 * Main TTS speaker with sentence streaming, sub-second latency, and barge-in support.
 */
export function speakText(
  text: string,
  lang: string = 'hi-IN',
  callbacks: TtsCallbacks = {},
): TtsController {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks.onError?.(new Error('Speech synthesis not supported in this browser'));
    return {
      pause: () => {},
      resume: () => {},
      stop: () => {},
      replay: () => {},
      setRate: () => {},
      isSpeaking: () => false,
      isPaused: () => false,
      getRate: () => 1.0,
    };
  }

  // Cancel any prior speech synthesis immediately
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {
    // noop
  }

  const sanitized = prepareTextForTTS(text, lang);
  const chunks = chunkForSpeech(sanitized, lang);
  const totalChunks = chunks.length > 0 ? chunks.length : [sanitized].length;
  const sentenceList = chunks.length > 0 ? chunks : [sanitized];

  let currentIdx = 0;
  let isPaused = false;
  let isStopped = false;
  let rate = 0.94; // Conversational, warm, natural pace
  let activeUtterance: SpeechSynthesisUtterance | null = null;

  callbacks.onStart?.(totalChunks);

  const speakChunk = (idx: number) => {
    if (isStopped) return;
    if (idx >= sentenceList.length) {
      callbacks.onEnd?.();
      return;
    }

    currentIdx = idx;
    const chunkText = sentenceList[idx];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.lang = lang || 'hi-IN';
    utterance.rate = rate;
    utterance.pitch = 1.02; // Warm, natural vocal tone

    const voice = getBestIndianVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      if (isStopped) return;
      callbacks.onProgress?.({ charIndex: 0, sentenceIndex: idx });
    };

    utterance.onend = () => {
      if (isStopped) return;
      if (isPaused) return;
      // Seamless low-latency transition to next chunk
      setTimeout(() => {
        if (!isStopped && !isPaused) {
          speakChunk(idx + 1);
        }
      }, 30);
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      if (!isStopped && idx + 1 < sentenceList.length) {
        speakChunk(idx + 1);
      } else {
        callbacks.onEnd?.();
      }
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Start playing the first chunk immediately without delay
  speakChunk(0);

  return {
    pause: () => {
      isPaused = true;
      try {
        window.speechSynthesis.pause();
      } catch {
        // noop
      }
    },
    resume: () => {
      if (!isPaused) return;
      isPaused = false;
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          speakChunk(currentIdx);
        }
      } catch {
        speakChunk(currentIdx);
      }
    },
    stop: () => {
      isStopped = true;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // noop
      }
      callbacks.onEnd?.();
    },
    replay: () => {
      isStopped = false;
      isPaused = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // noop
      }
      speakChunk(0);
    },
    setRate: (r: number) => {
      rate = Math.min(1.4, Math.max(0.7, r));
      if (activeUtterance) {
        activeUtterance.rate = rate;
      }
    },
    isSpeaking: () => !isStopped && !isPaused,
    isPaused: () => isPaused,
    getRate: () => rate,
  };
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // noop
    }
  }
}
