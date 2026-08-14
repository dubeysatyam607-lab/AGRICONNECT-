import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Loader2, Square } from 'lucide-react';
import { AgriButton } from './agri-button';
import { useRole } from '@/contexts/RoleContext';
import { textForSpeech } from '@/core/voice';

interface VoiceAssistantButtonProps {
  text: string;
  languageCode?: string;
  className?: string;
}

export const VoiceAssistantButton: React.FC<VoiceAssistantButtonProps> = ({ 
  text, 
  languageCode = 'hi',
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMuted } = useRole();

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (isMuted) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!text) return;

    try {
      setIsLoading(true);

      // Sanitise so markdown/formatting/symbols are NEVER read aloud.
      const speakText = textForSpeech(text, languageCode);

      let response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: speakText, languageCode })
      });

      if (!response.ok) {
        response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speakText, languageCode })
        });
      }

      if (!response.ok) throw new Error('TTS Failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AgriButton
      variant="outline"
      size="sm"
      className={`rounded-full p-2 h-10 w-10 shrink-0 ${className}`}
      onClick={handlePlayPause}
      disabled={isLoading || !text || isMuted}
      title={isMuted ? "Voice is globally muted in settings" : "Listen"}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      ) : isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : isPlaying ? (
        <Square className="w-5 h-5 text-destructive fill-current" />
      ) : (
        <Volume2 className="w-5 h-5 text-primary" />
      )}
    </AgriButton>
  );
};
