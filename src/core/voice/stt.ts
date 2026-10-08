/**
 * VoiceEngine — Speech Recognition & Voice Activity Detection (VAD)
 *
 * Implements:
 * 1. 5-second no-speech auto-timeout (stops if user stays silent on mic open).
 * 2. 6-second natural sentence-finalization timer (grace period for pauses).
 * 3. Immediate cancellation of timer when farmer resumes speaking.
 * 4. Contextual Speech-to-Text phonetic correction for Indian agricultural words.
 */

export type MicState =
  | 'IDLE'
  | 'LISTENING'
  | 'SPEAKING_DETECTED'
  | 'PAUSE_DETECTED'
  | 'FINALIZING'
  | 'PROCESSING'
  | 'AI_SPEAKING'
  | 'ERROR';

export interface SttCallbacks {
  /** Interim + final transcript fragments as they are recognised. */
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onStateChange?: (state: MicState) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface SttController {
  stop: () => void;
  abort: () => void;
  isListening: () => boolean;
}

export const sttSupported = (): boolean =>
  typeof window !== 'undefined' &&
  !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );

export interface SpeechResultLike extends ArrayLike<{ transcript: string }> {
  isFinal: boolean;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike> & { length: number };
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

const getRecognitionCtor = (): (new () => SpeechRecognitionLike) | null => {
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return ctor || null;
};

// ── Common Speech-to-Text Phonetic & Agricultural Corrections ──────────────
const TRANSCRIPTION_CORRECTIONS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\btamatr\b/gi, replacement: 'tamatar' },
  { pattern: /\b(baav|baw|bhaav|bhavv|bahv)\b/gi, replacement: 'bhav' },
  { pattern: /\b(tamatar|tomato)\s+(ka|ke)?\s*(baav|baw|bhavv|bahv)\b/gi, replacement: '$1 $2 bhav' },
  { pattern: /\bsoya\s+been\b/gi, replacement: 'soyabean' },
  { pattern: /\bsoya\s+bin\b/gi, replacement: 'soyabean' },
  { pattern: /\bindor\b/gi, replacement: 'Indore' },
  { pattern: /\bujain\b/gi, replacement: 'Ujjain' },
  { pattern: /\bgheu\b/gi, replacement: 'gehu' },
  { pattern: /\bgehoo\b/gi, replacement: 'gehu' },
  { pattern: /\bpyas\b/gi, replacement: 'pyaz' },
  { pattern: /\bpiyaz\b/gi, replacement: 'pyaz' },
  { pattern: /\blashun\b/gi, replacement: 'lahsun' },
  { pattern: /\blehsun\b/gi, replacement: 'lahsun' },
  { pattern: /\bkapaas\b/gi, replacement: 'kapas' },
  { pattern: /\bsarsoo\b/gi, replacement: 'sarson' },
  { pattern: /\bkhad\s+ki\s+matra\b/gi, replacement: 'khad ki matra' },
  { pattern: /\byuriya\b/gi, replacement: 'urea' },
];

export function correctTranscription(text: string): string {
  let corrected = text;
  for (const item of TRANSCRIPTION_CORRECTIONS) {
    corrected = corrected.replace(item.pattern, item.replacement);
  }
  return corrected;
}

const NO_SPEECH_TIMEOUT_MS = 5000; // Rule 1: 5s if user does not speak at all
// Rule 2: grace period after speech stops. Farmers pause mid-sentence while
// thinking — a 3-second cutoff was truncating their question and sending
// half a sentence to the AI. 6s keeps the flow without cutting people off.
const SENTENCE_END_PAUSE_MS = 6000;
const MAX_RECORDING_DURATION_MS = 60000; // Max 60 seconds
// Chrome/Android routinely end a recognition session on their own. Restart it
// instead of silently going deaf mid-sentence (only while we did not stop it).
const MAX_UNEXPECTED_RESTARTS = 10;

/**
 * Start listening with live transcripts and adaptive silence detection.
 */
export function listen(
  lang: string,
  callbacks: SttCallbacks = {},
): SttController | null {
  const ctor = getRecognitionCtor();
  if (!ctor) {
    callbacks.onError?.('unsupported');
    return null;
  }

  let recognition: SpeechRecognitionLike | null = null;
  let initialSilenceTimer: number | null = null;
  let pauseTimer: number | null = null;
  let maxDurationTimer: number | null = null;

  let listening = false;
  let stopped = false;
  let hasSpoken = false;
  let restarts = 0;
  let pendingRestart = false;
  let finalText = '';
  let liveText = '';

  try {
    recognition = new ctor();
  } catch {
    callbacks.onError?.('init-failed');
    return null;
  }

  recognition.lang = lang || 'hi-IN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const clearAllTimers = () => {
    if (initialSilenceTimer) {
      window.clearTimeout(initialSilenceTimer);
      initialSilenceTimer = null;
    }
    if (pauseTimer) {
      window.clearTimeout(pauseTimer);
      pauseTimer = null;
    }
    if (maxDurationTimer) {
      window.clearTimeout(maxDurationTimer);
      maxDurationTimer = null;
    }
  };

  // Rule 1: Arm 5-second initial silence detector
  const armInitialSilence = () => {
    if (initialSilenceTimer) window.clearTimeout(initialSilenceTimer);
    initialSilenceTimer = window.setTimeout(() => {
      if (!hasSpoken && listening) {
        // User didn't speak for 5 seconds -> Auto-stop to IDLE
        callbacks.onStateChange?.('IDLE');
        stop();
      }
    }, NO_SPEECH_TIMEOUT_MS);
  };

  // Rule 2: Arm sentence completion detector (6-second grace period)
  const armSentenceEndTimer = () => {
    if (pauseTimer) window.clearTimeout(pauseTimer);
    callbacks.onStateChange?.('PAUSE_DETECTED');

    pauseTimer = window.setTimeout(() => {
      // Grace period of silence after speaking -> finalize utterance
      callbacks.onStateChange?.('FINALIZING');
      stop();
    }, SENTENCE_END_PAUSE_MS);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearAllTimers();
    try {
      recognition?.stop();
    } catch {
      // noop
    }
  };

  const abort = () => {
    stopped = true;
    clearAllTimers();
    try {
      recognition?.abort();
    } catch {
      // noop
    }
    callbacks.onStateChange?.('IDLE');
  };

  recognition.onstart = () => {
    // A restart must not look like a brand-new session: it would wipe the
    // partial transcript state and emit a second onStart to the UI.
    const isRestart = pendingRestart;
    pendingRestart = false;
    listening = true;
    stopped = false;
    callbacks.onStateChange?.('LISTENING');
    if (isRestart) {
      // The farmer was already mid-sentence. Re-arm the silence rule so the
      // mic still switches off if nobody speaks after the restart.
      if (hasSpoken) armSentenceEndTimer();
    } else {
      hasSpoken = false;
      callbacks.onStart?.();
      // Start 5-second initial silence check
      armInitialSilence();
    }

    // Arm max duration guard (cleared by the previous session's onend)
    if (maxDurationTimer) window.clearTimeout(maxDurationTimer);
    maxDurationTimer = window.setTimeout(() => {
      stop();
    }, MAX_RECORDING_DURATION_MS);
  };

  recognition.onresult = (event) => {
    liveText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const isFinal = event.results[i].isFinal;
      const transcript = event.results[i][0].transcript;
      if (isFinal) finalText += transcript;
      else liveText += transcript;
    }

    const rawCombined = (finalText + (finalText && liveText ? ' ' : '') + liveText).trim();
    if (rawCombined.length > 0) {
      hasSpoken = true;
      if (initialSilenceTimer) {
        window.clearTimeout(initialSilenceTimer);
        initialSilenceTimer = null;
      }

      callbacks.onStateChange?.('SPEAKING_DETECTED');

      // Apply phonetic corrections
      const cleanCombined = correctTranscription(rawCombined);
      callbacks.onTranscript?.(cleanCombined, !liveText);

      // As long as speech keeps arriving, the browser may end the session as
      // often as it likes — we can always restart from a clean budget.
      restarts = 0;

      // Arm the silence grace period for sentence completion
      armSentenceEndTimer();
    }
  };

  recognition.onerror = (event) => {
    clearAllTimers();
    if (event.error === 'no-speech') {
      // The engine is still alive; onend decides whether to restart.
      if (!hasSpoken) {
        callbacks.onStateChange?.('IDLE');
      }
      return;
    }
    if (event.error === 'aborted') {
      stopped = true;
      return;
    }
    // Fatal for this session (permission denied, network, service unavailable):
    // never auto-restart, or we would spin forever.
    stopped = true;
    callbacks.onStateChange?.('ERROR');
    callbacks.onError?.(event.error);
  };

  recognition.onend = () => {
    listening = false;
    clearAllTimers();

    if (stopped) {
      callbacks.onStateChange?.('IDLE');
      callbacks.onEnd?.();
      return;
    }

    // The browser ended the session on its own (Chrome/Android do this
    // routinely). Keep listening so the farmer can finish the sentence — but
    // only if they had actually started speaking. A silent mic must stop.
    if (hasSpoken && restarts < MAX_UNEXPECTED_RESTARTS) {
      restarts += 1;
      pendingRestart = true;
      try {
        recognition.start();
        return;
      } catch {
        // Already running or unusable — fall through and end honestly.
      }
      pendingRestart = false;
    }

    callbacks.onStateChange?.('IDLE');
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    callbacks.onError?.('start-failed');
    return null;
  }

  return {
    stop,
    abort,
    isListening: () => listening,
  };
}
