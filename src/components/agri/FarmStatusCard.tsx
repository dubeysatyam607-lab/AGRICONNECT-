import React from "react";
import { Ruler, Layers, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AgriImage } from "@/components/ui/agri-image";
import { cn } from "@/lib/utils";

import { getLocalizedCropName, getLocalizedCropStage } from "@/i18n/dynamic-localization";

export interface FarmStatusCardProps {
  crop: string;
  stage: string;
  area: number;
  landUnit: string;
  soilType?: string;
  attention?: boolean;
  onOpen: () => void;
}

/**
 * "मेरी फसल" — My Crop card. A living tile with a real crop photo, growth
 * stage, land size and a single health marker. One tap opens Farm OS.
 */
export const FarmStatusCard: React.FC<FarmStatusCardProps> = ({
  crop,
  stage,
  area,
  landUnit,
  soilType,
  attention = false,
  onOpen,
}) => {
  const { t, language } = useLanguage();
  const rawCropName = crop?.split("(")[0].trim() || "Soybean";
  const localizedCropName = getLocalizedCropName(rawCropName, language);
  const localizedStage = getLocalizedCropStage(stage, language);

  return (
    <section aria-labelledby="farm-status-heading">
      <p className="section-eyebrow">{t("home.farmTitle")}</p>

      <button
        onClick={onOpen}
        className="mt-2.5 flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.99]"
      >
        <span className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <AgriImage
            type="crop"
            contextName={localizedCropName}
            seedKey={localizedCropName || "farm-field"}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            containerClassName="h-full w-full"
          />
          <span
            className={cn(
              "absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full border border-white",
              attention ? "bg-marigold" : "bg-primary",
            )}
            aria-hidden="true"
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="type-h3 text-foreground">{localizedCropName}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {localizedStage}
            </span>
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 type-meta text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Ruler size={13} aria-hidden="true" />
              <span className="type-num text-foreground">{area}</span> {landUnit || t("home.areaUnit")}
            </span>
            {soilType && (
              <span className="inline-flex items-center gap-1">
                <Layers size={13} aria-hidden="true" />
                {soilType}
              </span>
            )}
          </span>

          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 type-meta font-semibold",
              attention ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary",
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", attention ? "bg-amber-500" : "bg-primary")}
              aria-hidden="true"
            />
            {attention ? t("home.farmStatusAttention") : t("home.farmStatusGood")}
          </span>
        </span>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary-foreground">
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </button>
    </section>
  );
};

export default FarmStatusCard;
