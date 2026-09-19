import React from "react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface QuickActionItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
}

export interface QuickActionsGridProps {
  actions: QuickActionItem[];
  onGo: (tab: string) => void;
}

/** One agriculture hue per action so the grid reads alive, not monotone. */
const TILE_TONES = [
  "bg-primary/12 text-primary",
  "bg-marigold/18 text-amber-700",
  "bg-sky-500/12 text-sky-700",
  "bg-soil/12 text-soil",
  "bg-emerald-500/14 text-emerald-700",
  "bg-bark/12 text-bark",
];

/**
 * Compact action grid for everyday farm work. Large tap targets, one line icon
 * + one short label — no nested cards or long sub-labels.
 */
export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ actions, onGo }) => {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="quick-actions-heading">
      <p id="quick-actions-heading" className="section-eyebrow">{t("home.quickActions")}</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onGo(action.id)}
              className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover active:scale-[0.97]"
            >
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105", TILE_TONES[i % TILE_TONES.length])}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-foreground">
                {t(action.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActionsGrid;
