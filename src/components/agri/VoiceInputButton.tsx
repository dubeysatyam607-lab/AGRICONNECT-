import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onError,
  language = 'hi-IN',
  className,
  size = 'md'
}) => {
  const { t } = useLanguage();
  const { isListening, transcript, isSupported, toggleListening } = useVoiceInput({
    onResult: onTranscript,
    onError,
    language
  });

  if (!isSupported) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListening}
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-300',
          sizeClasses[size],
          isListening
            ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
          className
        )}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <MicOff size={iconSizes[size]} />
        ) : (
          <Mic size={iconSizes[size]} />
        )}
      </button>
      
      {isListening && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-full">
            <Volume2 size={12} className="animate-pulse text-destructive" />
            <span>{t('agr189')}</span>
          </div>
        </div>
      )}

      {transcript && isListening && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-2 shadow-lg max-w-[200px]">
          <p className="text-xs text-muted-foreground truncate">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;
