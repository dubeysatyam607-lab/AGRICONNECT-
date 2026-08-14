import React from "react";
import { Pause, Play, RotateCcw, X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowOrb } from "./GlowOrb";
import { Waveform } from "./Waveform";

/**
 * VoicePlayerBar — the in-flight speaking status row.
 *
 * Shows a smooth pulsing orb + animated waveform while the AI speaks, the
 * sentence currently being spoken as a highlighted live subtitle, a progress
 * bar of the whole utterance, and transport controls (pause/resume/replay/
 * stop) plus a speech-speed toggle.
 */
interface VoicePlayerBarProps {
  activeSentence: string;
  progress: number; // 0..1
  paused: boolean;
  rate: number;
  onPause: () => void;
  onResume: () => void;
  onReplay: () => void;
  onStop: () => void;
  onRate: (rate: number) => void;
}

export const VoicePlayerBar: React.FC<VoicePlayerBarProps> = ({
  activeSentence,
  progress,
  paused,
  rate,
  onPause,
  onResume,
  onReplay,
  onStop,
  onRate,
}) => {
  const nextRate = rate >= 1.15 ? 0.8 : rate >= 1 ? 1.15 : 1;
  const percent = Math.round(progress * 100);

  return (
    <div className="bg-slate-900/95 border-t border-white/10 px-4 py-3 animate-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={onStop}
          className="p-2 rounded-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors shrink-0"
          aria-label="Stop speaking"
        >
          <X size={15} />
        </button>

        {/* Speaking orb + animated waveform */}
        <div className="flex items-center gap-3 shrink-0" aria-hidden>
          <GlowOrb size={44} className={cn(paused && "opacity-50")}>
            <Volume2 size={16} className="text-white" />
          </GlowOrb>
          <Waveform bars={16} active={!paused} className="h-8 w-16" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
            <span className={cn("w-1.5 h-1.5 rounded-full", paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse")} />
            {paused ? "Paused" : "Speaking…"}
          </div>
          {activeSentence ? (
            <p className="text-xs text-emerald-200/95 mt-0.5 line-clamp-2 leading-snug">
              <span className="bg-emerald-500/15 text-emerald-200 px-1.5 py-0.5 rounded-md">
                {activeSentence}
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5 italic">Preparing voice…</p>
          )}
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <button
          onClick={paused ? onResume : onPause}
          className={cn(
            "p-2.5 rounded-full transition-all shrink-0",
            paused
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : "bg-white/5 text-slate-200 hover:bg-white/15"
          )}
          aria-label={paused ? "Resume speaking" : "Pause speaking"}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>

        <button
          onClick={onReplay}
          className="p-2.5 rounded-full bg-white/5 text-slate-200 hover:bg-white/15 transition-colors shrink-0"
          aria-label="Replay message"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-500 font-bold">{percent}%</span>
        <button
          onClick={() => onRate(nextRate)}
          className="text-[10px] font-bold text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 transition-colors"
          title="Speech speed"
        >
          {rate >= 1.15 ? "1.15×" : rate >= 1 ? "1.0×" : "0.8×"}
        </button>
      </div>
    </div>
  );
};
