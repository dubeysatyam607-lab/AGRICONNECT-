/**
 * VoiceEngine — speech recognition for AgriConnect.
 *
 * Continuous listening with interim results powers a live transcript.
 * A silence timer auto-stops after the farmer stops talking, so the
 * experience feels like a natural conversation rather than push-to-talk.
 */

export interface SttCallbacks {
  /** Interim + final transcript fragments as they are recognised. */
  onTranscript?: (transcript: string, isFinal: boolean) => void;
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
  typeof window !== "undefined" &&
  !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

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
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number };
  }) => void) | null;
}

const getRecognitionCtor = (): (new () => SpeechRecognitionLike) | null => {
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return ctor || null;
};

const SILENCE_MS = 2000;
const MAX_DURATION_MS = 60000; // Allow long conversations up to 60 seconds

/**
 * Start listening with live transcripts and automatic silence detection.
 * Returns a controller that can stop/abort listening.
 */
export function listen(
  lang: string,
  callbacks: SttCallbacks = {},
): SttController | null {
  const ctor = getRecognitionCtor();
  if (!ctor) {
    callbacks.onError?.("unsupported");
    return null;
  }

  let recognition: SpeechRecognitionLike | null = null;
  let silenceTimer: number | null = null;
  let durationTimer: number | null = null;
  let listening = false;
  let stopped = false;
  let silenceExpired = false;
  let finalText = "";
  let liveText = "";

  try {
    recognition = new ctor();
  } catch {
    callbacks.onError?.("init-failed");
    return null;
  }

  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const armSilence = () => {
    if (silenceTimer) window.clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => {
      // Farmer stopped speaking after 2 seconds of continuous silence — end listening naturally.
      silenceExpired = true;
      stop();
    }, SILENCE_MS);
  };

  const armDuration = () => {
    if (durationTimer) window.clearTimeout(durationTimer);
    durationTimer = window.setTimeout(() => {
      silenceExpired = true;
      stop();
    }, MAX_DURATION_MS);
  };

  const start = () => {
    if (stopped || !recognition) return;
    try {
      recognition.start();
    } catch {
      // already started — ignore
    }
  };

  recognition.onstart = () => {
    listening = true;
    if (!durationTimer) armDuration();
    callbacks.onStart?.();
  };

  recognition.onresult = (event) => {
    liveText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const isFinal = event.results[i].isFinal;
      const transcript = event.results[i][0].transcript;
      if (isFinal) finalText += transcript;
      else liveText += transcript;
    }
    const combined = (finalText + (finalText && liveText ? " " : "") + liveText).trim();
    callbacks.onTranscript?.(combined, !liveText);
    
    // Any recognised speech resets the 2.0s silence detector
    if (liveText || finalText) {
      armSilence();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    // Don't kill listening on transient 'no-speech' network errors — auto-restart
    if (event.error === "no-speech" && !stopped && !silenceExpired) {
      try { recognition?.start(); } catch { /* ignore */ }
      return;
    }
    callbacks.onError?.(event.error);
  };

  recognition.onend = () => {
    // If browser ended recognition prematurely (e.g. 2-3s idle cutoff)
    // but neither the user stopped nor silence timer expired, seamlessly auto-restart!
    if (!stopped && !silenceExpired) {
      try {
        recognition?.start();
        return;
      } catch {
        // Fall through to end if restart fails
      }
    }

    listening = false;
    if (silenceTimer) window.clearTimeout(silenceTimer);
    if (durationTimer) window.clearTimeout(durationTimer);
    callbacks.onEnd?.();
  };

  const stop = () => {
    if (silenceTimer) window.clearTimeout(silenceTimer);
    if (durationTimer) window.clearTimeout(durationTimer);
    if (recognition) {
      try { recognition.stop(); } catch { /* noop */ }
    }
  };

  const abort = () => {
    stopped = true;
    if (silenceTimer) window.clearTimeout(silenceTimer);
    if (durationTimer) window.clearTimeout(durationTimer);
    if (recognition) {
      try { recognition.abort(); } catch { /* noop */ }
    }
  };

  start();

  return {
    stop,
    abort,
    isListening: () => listening,
  };
}
