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

  const preferredPatterns = [
    /google.*(hindi|हिन्दी|indian)/i,
    /microsoft.*(natural|swara|madhur|hemant|neerja|prabhat|heera|ravi|madhav|priya)/i,
    /(lekha|neerja|veena|rishi|pradeep|kaveri|ananya|kavya|aravind)/i,
    /hi[-_]in/i,
  ];

  for (const pat of preferredPatterns) {
    const match = voices.find((v) => pat.test(v.name) || pat.test(v.lang));
    if (match) return match;
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

// Keep track of active audio elements to prevent overlapping audio
let activeGlobalAudio: HTMLAudioElement | null = null;

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

  const sanitized = prepareTextForTTS(text, lang);
  const chunks = chunkForSpeech(sanitized, lang);
  const totalChunks = chunks.length > 0 ? chunks.length : [sanitized].length;

  let isPaused = false;
  let isStopped = false;
  let currentPlaybackRate = 1.0;
  let audioElement: HTMLAudioElement | null = null;
  let audioUrl: string | null = null;
  let fallbackUtterance: SpeechSynthesisUtterance | null = null;

  callbacks.onStart?.(totalChunks);

  const sarvamCode = getSarvamLanguageCode(lang);
  const sarvamSpeaker = getSarvamSpeaker(lang);

  // Attempt Sarvam AI TTS via backend API
  const startSarvamTts = async () => {
    try {
      let response: Response | null = null;

      // Try /api/voice/tts first, fallback to /api/tts
      try {
        response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sanitized,
            languageCode: sarvamCode,
            speaker: sarvamSpeaker,
          }),
        });
      } catch {
        // Retry secondary endpoint
      }

      if (!response || !response.ok) {
        response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sanitized,
            languageCode: sarvamCode,
            speaker: sarvamSpeaker,
          }),
        });
      }

      if (isStopped) return;

      if (!response.ok) {
        throw new Error(`Sarvam TTS API returned status ${response.status}`);
      }

      const blob = await response.blob();
      if (isStopped) return;

      audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioElement = audio;
      activeGlobalAudio = audio;
      audio.playbackRate = currentPlaybackRate;

      audio.onplay = () => {
        if (isStopped) return;
        callbacks.onProgress?.({ charIndex: 0, sentenceIndex: 0 });
      };

      audio.ontimeupdate = () => {
        if (isStopped || !audio.duration) return;
        const progress = audio.currentTime / audio.duration;
        const currentSentenceIdx = Math.min(
          totalChunks - 1,
          Math.floor(progress * totalChunks),
        );
        callbacks.onProgress?.({
          charIndex: Math.floor(progress * sanitized.length),
          sentenceIndex: currentSentenceIdx,
        });
      };

      audio.onended = () => {
        if (isStopped) return;
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        activeGlobalAudio = null;
        callbacks.onEnd?.();
      };

      audio.onerror = () => {
        if (isStopped) return;
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        activeGlobalAudio = null;
        startSpeechSynthesisFallback();
      };

      await audio.play();
    } catch {
      if (!isStopped) {
        startSpeechSynthesisFallback();
      }
    }
  };

  // Graceful browser SpeechSynthesis fallback
  const startSpeechSynthesisFallback = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isStopped) {
      callbacks.onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // noop
    }

    const utterance = new SpeechSynthesisUtterance(sanitized);
    utterance.lang = sarvamCode || 'hi-IN';
    utterance.rate = currentPlaybackRate * 0.95;
    utterance.pitch = 1.02;

    const voice = getBestIndianVoice(sarvamCode);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (isStopped) return;
      callbacks.onProgress?.({ charIndex: 0, sentenceIndex: 0 });
    };

    utterance.onend = () => {
      if (isStopped) return;
      callbacks.onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      callbacks.onEnd?.();
    };

    fallbackUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Launch Sarvam TTS
  startSarvamTts();

  return {
    pause: () => {
      isPaused = true;
      if (audioElement) {
        audioElement.pause();
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
      if (audioElement) {
        audioElement.play().catch(() => {});
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
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }
      activeGlobalAudio = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // noop
        }
      }
      callbacks.onEnd?.();
    },
    replay: () => {
      isStopped = false;
      isPaused = false;
      if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(() => {});
      } else {
        startSarvamTts();
      }
    },
    setRate: (r: number) => {
      currentPlaybackRate = Math.min(1.5, Math.max(0.7, r));
      if (audioElement) {
        audioElement.playbackRate = currentPlaybackRate;
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

export function stopSpeaking(): void {
  if (activeGlobalAudio) {
    try {
      activeGlobalAudio.pause();
      activeGlobalAudio.currentTime = 0;
    } catch {
      // noop
    }
    activeGlobalAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // noop
    }
  }
}
