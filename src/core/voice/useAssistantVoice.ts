import { useCallback, useEffect, useRef, useState } from "react";
import {
  prepareTextForTTS,
  speakText,
  ttsSupported,
  type TtsController,
  type TtsProgress,
} from "../voice";
import { listen, sttSupported, type SttController } from "../voice/stt";
import { useToast } from "@/hooks/use-toast";

/**
 * useAssistantVoice — single voice brain for AgriConnect Assistant.
 *
 * Handles Sarvam AI neural voice playback (Subh voice), word/sentence progress for live subtitles,
 * audio interruption, and STT microphone recognition with auto-commit.
 */
export function useAssistantVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [activeText, setActiveText] = useState("");
  const [progress, setProgress] = useState<TtsProgress | null>(null);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [activeSentence, setActiveSentence] = useState("");
  const [speakingLang, setSpeakingLang] = useState("hi-IN");

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [listeningLang, setListeningLang] = useState("hi-IN");

  const controllerRef = useRef<TtsController | null>(null);
  const sttRef = useRef<SttController | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentTextRef = useRef("");
  const currentLangRef = useRef("hi-IN");
  const transcriptRef = useRef("");
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
      sttRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setProgress(null);
    setActiveSentence("");
  }, []);

  const speak = useCallback(
    (text: string, lang: string = "hi-IN", onEnd?: () => void) => {
      if (!ttsSupported()) return;

      // Interruption: stop any currently playing audio immediately
      stop();

      const sanitized = prepareTextForTTS(text, lang);
      if (!sanitized.trim()) return;

      currentTextRef.current = text;
      currentLangRef.current = lang;
      setActiveText(sanitized);
      setSpeakingLang(lang);
      setPaused(false);
      setProgress(null);
      setSentenceIndex(0);
      setActiveSentence("");

      const chunks = sanitized
        .split(/(?<=[.!?।…])\s+/)
        .filter(Boolean);
      chunksRef.current = chunks;

      const controller = speakText(sanitized, lang, {
        onStart: () => {
          setSpeaking(true);
          setActiveSentence(chunks[0] || sanitized);
        },
        onProgress: (p) => {
          setProgress(p);
          setSentenceIndex(p.sentenceIndex);
          setActiveSentence(chunks[p.sentenceIndex] || sanitized);
        },
        onEnd: () => {
          setSpeaking(false);
          setPaused(false);
          setProgress(null);
          controllerRef.current = null;
          onEnd?.();
        },
        onError: (_err) => {
          setSpeaking(false);
          setPaused(false);
          controllerRef.current = null;
          toast({
            title: "आवाज़ सेवा अनुपलब्ध",
            description: "माफ़ कीजिए, आवाज़ सेवा इस समय उपलब्ध नहीं है।",
            variant: "destructive",
          });
        },
      });

      if (controller) controllerRef.current = controller;
    },
    [stop, toast]
  );

  const pause = useCallback(() => {
    controllerRef.current?.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    controllerRef.current?.resume();
    setPaused(false);
  }, []);

  const replay = useCallback(() => {
    if (!currentTextRef.current) return;
    speak(currentTextRef.current, currentLangRef.current);
  }, [speak]);

  const setSpeechRate = useCallback((r: number) => {
    setRate(r);
    controllerRef.current?.setRate(r);
  }, []);

  const startListening = useCallback(
    (lang: string = "hi-IN", onFinal?: (text: string) => void) => {
      // Interruption: Stop AI speaking immediately when user starts talking/listening!
      stop();

      if (!sttSupported()) return;
      sttRef.current?.abort();
      setListeningLang(lang);
      setTranscript("");
      transcriptRef.current = "";
      setListening(true);
      sttRef.current = listen(lang, {
        onStart: () => setListening(true),
        onTranscript: (combined) => {
          transcriptRef.current = combined;
          setTranscript(combined);
        },
        onEnd: () => {
          setListening(false);
          const final = transcriptRef.current;
          sttRef.current = null;
          transcriptRef.current = "";
          if (final.trim()) onFinal?.(final.trim());
        },
        onError: () => {
          setListening(false);
          sttRef.current = null;
          transcriptRef.current = "";
        },
      });
    },
    [stop]
  );

  const stopListening = useCallback(
    (commit: boolean, onFinal?: (text: string) => void) => {
      const final = transcriptRef.current;
      sttRef.current?.stop();
      sttRef.current = null;
      setListening(false);
      transcriptRef.current = "";
      if (commit && final.trim()) onFinal?.(final.trim());
    },
    []
  );

  return {
    speaking,
    paused,
    rate,
    activeText,
    progress,
    sentenceIndex,
    activeSentence,
    speakingLang,
    listening,
    transcript,
    listeningLang,
    speak,
    pause,
    resume,
    stop,
    replay,
    setSpeechRate,
    startListening,
    stopListening,
  };
}
