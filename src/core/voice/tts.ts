/**
 * VoiceEngine — Human-like Indian Natural Text-to-Speech Engine
 * Powered by Sarvam AI Neural Voice (Subh Voice) with Seamless Indian Language Support.
 *
 * Supported 12 Languages:
 * English, Hindi, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada,
 * Malayalam, Bengali, Odia, Assamese.
 */

import { prepareTextForTTS } from './sanitize';
import { getSarvamLanguageCode, getSarvamSpeaker } from './language';

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
  (!!window.AudioContext ||
    !!(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext ||
    'speechSynthesis' in window ||
    typeof Audio !== 'undefined');

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

  const MAX_CHUNK_LEN = 120;
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

// Global cache for Web Speech voices (fallback)
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices() || [];
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
}

/**
 * Fallback Web Speech Indian voice selector.
 */
export function getBestIndianVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLang = (lang || 'hi-IN').toLowerCase().replace('_', '-');
  const baseCode = targetLang.split('-')[0];

  // Hindi-specific voice names must never win for Tamil/Telugu/etc., otherwise
  // the farmer hears their answer read in the wrong language.
  const hindiPreferred: RegExp[] = [
    /google.*(hindi|हिन्दी|indian)/i,
    /microsoft.*(natural|swara|madhur|hemant|neerja|prabhat|heera|ravi|madhav|priya)/i,
    /(lekha|neerja|veena|rishi|pradeep|kaveri|ananya|kavya|aravind)/i,
    /hi[-_]in/i,
  ];
  // A voice whose own language tag matches the requested language always wins.
  const langMatch = voices.find(
    (v) => v.lang.toLowerCase().split(/[-_]/)[0] === baseCode,
  );
  if (langMatch) return langMatch;

  if (baseCode === 'hi') {
    for (const pat of hindiPreferred) {
      const match = voices.find((v) => pat.test(v.name) || pat.test(v.lang));
      if (match) return match;
    }
  }

  const exactMatch = voices.find((v) => v.lang.toLowerCase() === targetLang);
  if (exactMatch) return exactMatch;

  const baseMatch = voices.find((v) => v.lang.toLowerCase().startsWith(baseCode));
  if (baseMatch) return baseMatch;

  const anyIndian = voices.find(
    (v) => v.lang.toLowerCase().includes('in') || /india/i.test(v.name),
  );
  return anyIndian || voices[0] || null;
}

// Persistent reference set to prevent V8 Garbage Collector from reclaiming active HTMLAudioElements
const activeAudioSet = new Set<HTMLAudioElement>();
let activeGlobalAudio: HTMLAudioElement | null = null;

// Bumped by every stopSpeaking()/speakText() so an orphaned playback chain from
// a previous answer can never keep talking over the current one.
let playbackGeneration = 0;

export function stopSpeaking(): void {
  playbackGeneration += 1;
  if (activeGlobalAudio) {
    try {
      activeGlobalAudio.pause();
      activeGlobalAudio.currentTime = 0;
    } catch {
      // noop
    }
    activeGlobalAudio = null;
  }

  for (const audio of activeAudioSet) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // noop
    }
  }
  activeAudioSet.clear();

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // noop
    }
  }
}

/**
 * Main TTS speaker with Sarvam AI (Subh voice) backend synthesis
 * and graceful browser speech synthesis fallback.
 */
export function speakText(
  text: string,
  lang: string = 'hi-IN',
  callbacks: TtsCallbacks = {},
): TtsController {
  stopSpeaking();

  const myGeneration = playbackGeneration;
  const isCurrent = (): boolean => !isStopped && myGeneration === playbackGeneration;

  const sanitized = prepareTextForTTS(text, lang);
  const chunks = chunkForSpeech(sanitized, lang);
  const totalChunks = chunks.length > 0 ? chunks.length : [sanitized].length;

  let isPaused = false;
  let isStopped = false;
  let currentPlaybackRate = 1.0;
  let currentChunkIndex = 0;
  let currentAudioElement: HTMLAudioElement | null = null;
  let currentAudioUrl: string | null = null;
  let fallbackUtterance: SpeechSynthesisUtterance | null = null;

  callbacks.onStart?.(totalChunks);

  const sarvamCode = getSarvamLanguageCode(lang);
  const sarvamSpeaker = getSarvamSpeaker(lang);

  // Helper to fetch audio for a chunk
  const fetchChunkAudio = async (chunkText: string): Promise<Blob | null> => {
    try {
      let response: Response | null = null;
      try {
        response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunkText,
            languageCode: sarvamCode,
            speaker: sarvamSpeaker,
          }),
        });
      } catch {
        // Fallback to secondary route
      }

      if (!response || !response.ok) {
        response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunkText,
            languageCode: sarvamCode,
            speaker: sarvamSpeaker,
          }),
        });
      }

      if (response && response.ok) {
        return await response.blob();
      }
    } catch (err) {
      console.warn('[Sarvam TTS] Fetch error:', err);
    }
    return null;
  };

  // Play chunks sequentially to prevent audio truncation on long responses
  const playNextChunk = async () => {
    if (!isCurrent()) return;

    if (currentChunkIndex >= totalChunks) {
      callbacks.onEnd?.();
      return;
    }

    const chunkText = chunks[currentChunkIndex] || sanitized;
    const blob = await fetchChunkAudio(chunkText);

    if (!isCurrent()) return;

    if (!blob) {
      // Fallback to browser Web Speech API for remaining chunks
      startSpeechSynthesisFallback();
      return;
    }

    try {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }

      currentAudioUrl = URL.createObjectURL(blob);
      const audio = new Audio(currentAudioUrl);
      currentAudioElement = audio;
      activeGlobalAudio = audio;
      activeAudioSet.add(audio);
      audio.playbackRate = currentPlaybackRate;

      audio.onplay = () => {
        if (!isCurrent()) return;
        callbacks.onProgress?.({
          charIndex: Math.floor((currentChunkIndex / totalChunks) * sanitized.length),
          sentenceIndex: currentChunkIndex,
        });
      };

      audio.onended = () => {
        activeAudioSet.delete(audio);
        if (currentAudioUrl) {
          URL.revokeObjectURL(currentAudioUrl);
          currentAudioUrl = null;
        }
        if (!isCurrent()) return;
        currentChunkIndex++;
        playNextChunk();
      };

      audio.onerror = () => {
        activeAudioSet.delete(audio);
        if (currentAudioUrl) {
          URL.revokeObjectURL(currentAudioUrl);
          currentAudioUrl = null;
        }
        if (!isCurrent()) return;
        startSpeechSynthesisFallback();
      };

      await audio.play();
    } catch {
      if (isCurrent()) {
        startSpeechSynthesisFallback();
      }
    }
  };

  // Graceful browser SpeechSynthesis fallback.
  // Speaks ONE chunk at a time: browsers silently cut long utterances short
  // (Chrome stops around 15s), which is why answers used to stop mid-reply.
  const speakableChunks = (): string[] => (chunks.length > 0 ? chunks : [sanitized]);

  const startSpeechSynthesisFallback = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !isCurrent()) {
      if (isCurrent()) callbacks.onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // noop
    }

    const speakChunkAt = (index: number) => {
      const list = speakableChunks();
      if (!isCurrent()) return;
      if (index >= list.length) {
        callbacks.onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(list[index]);
      utterance.lang = sarvamCode || 'hi-IN';
      utterance.rate = currentPlaybackRate * 0.95;
      utterance.pitch = 1.02;

      const voice = getBestIndianVoice(sarvamCode);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (!isCurrent()) return;
        callbacks.onProgress?.({
          charIndex: Math.floor((index / Math.max(1, list.length)) * sanitized.length),
          sentenceIndex: index,
        });
      };

      utterance.onend = () => {
        if (!isCurrent()) return;
        speakChunkAt(index + 1);
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        if (!isCurrent()) return;
        // Skip the chunk that failed rather than abandoning the whole answer.
        speakChunkAt(index + 1);
      };

      fallbackUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakChunkAt(currentChunkIndex);
  };

  // Launch Sarvam TTS
  playNextChunk();

  return {
    pause: () => {
      isPaused = true;
      if (currentAudioElement) {
        currentAudioElement.pause();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.pause();
        } catch {
          // noop
        }
      }
    },
    resume: () => {
      if (!isPaused) return;
      isPaused = false;
      if (currentAudioElement) {
        currentAudioElement.play().catch(() => {});
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
        } catch {
          // noop
        }
      }
    },
    stop: () => {
      isStopped = true;
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        activeAudioSet.delete(currentAudioElement);
        currentAudioElement = null;
      }
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }
      stopSpeaking();
      callbacks.onEnd?.();
    },
    replay: () => {
      isStopped = false;
      isPaused = false;
      currentChunkIndex = 0;
      if (currentAudioElement) {
        currentAudioElement.currentTime = 0;
        currentAudioElement.play().catch(() => {
          playNextChunk();
        });
      } else {
        playNextChunk();
      }
    },
    setRate: (r: number) => {
      currentPlaybackRate = Math.min(1.5, Math.max(0.7, r));
      if (currentAudioElement) {
        currentAudioElement.playbackRate = currentPlaybackRate;
      }
      if (fallbackUtterance) {
        fallbackUtterance.rate = currentPlaybackRate * 0.95;
      }
    },
    isSpeaking: () => !isStopped && !isPaused,
    isPaused: () => isPaused,
    getRate: () => currentPlaybackRate,
  };
}
