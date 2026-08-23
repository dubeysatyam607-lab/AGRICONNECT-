import { useState, useCallback, useRef, useEffect } from 'react';
import { listen, sttSupported, type SttController } from '@/core/voice';

interface UseVoiceInputOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

/**
 * useVoiceInput — shared voice-input hook backed by the VoiceEngine.
 * Continuous listening with live transcripts and silence auto-stop, so any
 * input surface (chat, pashu mela, forms) gets a natural conversational mic.
 */
export const useVoiceInput = (options: UseVoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const controllerRef = useRef<SttController | null>(null);
  const committedRef = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!sttSupported()) {
      setIsSupported(false);
      options.onError?.('Speech recognition not supported in this browser');
      return;
    }
    // Ensure supported state is true when STT is available
    setIsSupported(true);

    committedRef.current = false;
    transcriptRef.current = '';
    setTranscript('');
    setIsListening(true);

    controllerRef.current = listen(options.language || 'hi-IN', {
      onStart: () => setIsListening(true),
      onTranscript: (combined) => {
        transcriptRef.current = combined;
        setTranscript(combined);
      },
      onEnd: () => {
        controllerRef.current = null;
        setIsListening(false);
        if (!committedRef.current && transcriptRef.current.trim()) {
          committedRef.current = true;
          options.onResult?.(transcriptRef.current.trim());
        }
      },
      onError: (error) => {
        controllerRef.current = null;
        setIsListening(false);
        if (error === 'not-allowed') {
          options.onError?.('Microphone access denied. Please allow microphone access.');
        } else if (error === 'no-speech') {
          options.onError?.('No speech detected. Please try again.');
        } else {
          options.onError?.(`Speech recognition error: ${error}`);
        }
      },
    });
  }, [options]);

  const stopListening = useCallback(() => {
    const final = transcriptRef.current;
    controllerRef.current?.stop();
    controllerRef.current = null;
    setIsListening(false);
    if (!committedRef.current && final.trim()) {
      committedRef.current = true;
      options.onResult?.(final.trim());
    }
  }, [options]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};
