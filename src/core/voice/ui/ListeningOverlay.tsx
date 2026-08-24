import React from "react";
import { MicOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowOrb } from "./GlowOrb";
import { Waveform } from "./Waveform";
import { langLabel } from "../language";

/**
 * ListeningOverlay — full-screen layer shown while the assistant listens.
 * Displays the live transcript in real time, the detected language, and
 * clear "Done" / "Cancel" controls. Silence auto-commits after a pause.
 *
 * Theme: AgriConnect white + green — matches the main app visual identity.
 */
interface ListeningOverlayProps {
  transcript: string;
  lang: string;
  isFinal?: boolean;
  onCommit: (transcript: string) => void;
  onCancel: () => void;
}

export const ListeningOverlay: React.FC<ListeningOverlayProps> = ({
  transcript,
  lang,
  isFinal = false,
  onCommit,
  onCancel,
}) => (
  <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center px-6 text-foreground animate-in fade-in duration-300">
    <GlowOrb size={120}>
      <MicOff size={34} className="animate-pulse text-white" />
    </GlowOrb>

    <p className="text-foreground text-base font-extrabold mt-6 tracking-wide">
      किसान सहायक सुन रहा है…
    </p>
    <p className="text-muted-foreground text-[11px] mt-1.5">
      {isFinal ? "Processing what you said…" : "Speak clearly — I stop automatically when you pause."}
    </p>

    {/* Live transcript card */}
    <div className="w-full max-w-md mt-6">
      <div className="bg-muted border border-border rounded-2xl p-4 min-h-[72px]">
        {transcript ? (
          <p className={cn(
            "text-sm leading-relaxed text-center",
            isFinal ? "text-primary font-semibold" : "text-foreground"
          )}>
            {transcript}
          </p>
        ) : (
          <Waveform bars={20} active className="h-12" />
        )}
      </div>

      {transcript && (
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Heard in {langLabel(lang)} — edit in the chat box before sending
        </p>
      )}
    </div>

    {/* Controls */}
    <div className="flex items-center gap-4 mt-8">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted hover:bg-muted/80 border border-border rounded-full px-5 py-2.5 transition-colors active:scale-95"
      >
        <X size={14} /> Cancel
      </button>
      <button
        onClick={() => onCommit(transcript)}
        disabled={!transcript.trim()}
        className="flex items-center gap-2 text-xs font-bold text-white bg-primary disabled:opacity-40 disabled:pointer-events-none rounded-full px-6 py-2.5 shadow-lg shadow-primary/25 transition-all active:scale-95"
      >
        <Check size={14} /> Done
      </button>
    </div>
  </div>
);
