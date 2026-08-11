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
  <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center px-6 text-white animate-in fade-in duration-300">
    <GlowOrb size={120}>
      <MicOff size={34} className="animate-pulse" />
    </GlowOrb>

    <p className="text-white text-base font-extrabold mt-6 tracking-wide">
      किसान सहायक सुन रहा है…
    </p>
    <p className="text-slate-400 text-[11px] mt-1.5">
      {isFinal ? "Processing what you said…" : "Speak clearly — I stop automatically when you pause."}
    </p>

    {/* Live transcript card */}
    <div className="w-full max-w-md mt-6">
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 min-h-[72px]">
        {transcript ? (
          <p className={cn(
            "text-sm leading-relaxed text-center",
            isFinal ? "text-emerald-300" : "text-slate-100"
          )}>
            {transcript}
          </p>
        ) : (
          <Waveform bars={20} active className="h-12" />
        )}
      </div>

      {transcript && (
        <p className="text-center text-[10px] text-slate-500 mt-2">
          Heard in {langLabel(lang)} — edit in the chat box before sending
        </p>
      )}
    </div>

    {/* Controls */}
    <div className="flex items-center gap-4 mt-8">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full px-5 py-2.5 transition-colors active:scale-95"
      >
        <X size={14} /> Cancel
      </button>
      <button
        onClick={() => onCommit(transcript)}
        disabled={!transcript.trim()}
        className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-40 disabled:pointer-events-none rounded-full px-6 py-2.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
      >
        <Check size={14} /> Done
      </button>
    </div>
  </div>
);
