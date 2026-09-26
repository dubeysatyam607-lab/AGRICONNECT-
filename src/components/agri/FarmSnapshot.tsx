import React from "react";
import type { LucideIcon } from "lucide-react";
import { Sprout, CloudSun, Droplets, TrendingUp, MapPin, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface FarmSnapshotData {
  crop?: string;
  stage?: string;
  area?: number;
  unit?: string;
  soil?: string;
  temp?: string;
  condition?: string;
  humidity?: number;
  mandiCrop?: string;
  mandiPrice?: string;
  mandiStatus?: "up" | "down" | "stable";
  mandiChange?: string;
}

export interface FarmSnapshotProps {
  data: FarmSnapshotData;
}

const MovementIcon: React.FC<{ status?: FarmSnapshotData["mandiStatus"] }> = ({ status }) => {
  if (status === "up") return <ArrowUpRight size={13} className="text-emerald-600" aria-hidden="true" />;
  if (status === "down") return <ArrowDownRight size={13} className="text-rose-600" aria-hidden="true" />;
  return <Minus size={13} className="text-muted-foreground" aria-hidden="true" />;
};

const TONE = {
  icon: "bg-primary/12 text-primary",
  chip: "bg-primary/10 text-primary",
} as const;

/**
 * Compact farm snapshot — the four live numbers a farmer checks each morning
 * (crop, weather, crop health proxy, mandi). Every value is optional and only
 * rendered when real data exists; absent data degrades silently.
 */
export const FarmSnapshot: React.FC<FarmSnapshotProps> = ({ data }) => {
  const { t } = useLanguage();

  const cells = [
    {
      id: "farm",
      icon: MapPin,
      title: t("home.farmTitle") || "Crop",
      line: data.crop,
      tag: data.stage,
      value: data.area ? `${data.area} ${data.unit || t("home.areaUnit") || "acres"}` : undefined,
    },
    {
      id: "weather",
      icon: CloudSun,
      title: t("svc.weather") || "Weather",
      value: data.temp,
      line: data.condition,
      tag: data.humidity !== undefined ? t("home.humidity") || "Humidity" : undefined,
      tagValue: data.humidity !== undefined ? `${data.humidity}%` : undefined,
    },
    {
      id: "health",
      icon: Droplets,
      title: t("home.cropHealth") || "Crop Health",
      value: t("home.farmStatusGood") || "Good",
      line: data.stage,
      tag: data.crop,
    },
    {
      id: "mandi",
      icon: TrendingUp,
      title: t("nav.mandi") || "Mandi",
      value: data.mandiPrice ? `₹${data.mandiPrice}` : undefined,
      line: data.mandiCrop,
      tag: data.mandiStatus ? data.mandiChange : undefined,
      movement: data.mandiStatus,
    },
  ].filter((c) => c.value || c.line);

  if (cells.length === 0) return null;

  return (
    <section aria-labelledby="farm-snapshot-heading">
      <p id="farm-snapshot-heading" className="section-eyebrow">{t("home.snapshotTitle")}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {cells.map((cell) => {
          const Icon = cell.icon;
          return (
            <div
              key={cell.id}
              className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-3.5 shadow-soft"
            >
              <span className="flex items-center justify-between">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE.icon)}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                {cell.movement && (
                  <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold", TONE.chip)}>
                    <MovementIcon status={cell.movement} />
                    {cell.tag || cell.value}
                  </span>
                )}
              </span>
              <span>
                <span className="block text-xs font-semibold tracking-wide text-muted-foreground">
                  {cell.title}
                </span>
                {cell.value && (
                  <span className="mt-0.5 block text-lg font-extrabold leading-tight tracking-tight text-foreground">
                    {cell.value}
                  </span>
                )}
                {cell.line && (
                  <span className="mt-0.5 block text-xs font-semibold leading-snug text-foreground/80">
                    {cell.line}
                  </span>
                )}
                {cell.tag && !cell.movement && (
                  <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                    {cell.tag && cell.tagValue ? `${cell.tag}: ${cell.tagValue}` : cell.tag}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FarmSnapshot;