import React from "react";
import type { LucideIcon } from "lucide-react";
import { Sprout, CloudSun, Droplets, TrendingUp, MapPin, ArrowUpRight, ArrowDownRight, Minus, ArrowRight } from "lucide-react";
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
  onGo?: (tab: string) => void;
}

const MovementIcon: React.FC<{ status?: FarmSnapshotData["mandiStatus"] }> = ({ status }) => {
  if (status === "up") return <ArrowUpRight size={13} className="text-emerald-600" aria-hidden="true" />;
  if (status === "down") return <ArrowDownRight size={13} className="text-rose-600" aria-hidden="true" />;
  return <Minus size={13} className="text-muted-foreground" aria-hidden="true" />;
};

const TONE = {
  icon: "bg-emerald-700/10 text-emerald-800",
  chip: "bg-emerald-700/10 text-emerald-800",
} as const;

/**
 * Compact farm snapshot — the four live numbers a farmer checks each morning
 * (crop, weather, crop health proxy, mandi). Each card is clickable and navigates
 * directly to the relevant tool.
 */
export const FarmSnapshot: React.FC<FarmSnapshotProps> = ({ data, onGo }) => {
  const { t } = useLanguage();

  const cells = [
    {
      id: "farm",
      tab: "farm-os",
      icon: Sprout,
      title: t("home.farmTitle") || "My Crop",
      line: data.crop || "Soybean",
      tag: data.stage && data.stage !== data.crop ? data.stage : undefined,
      value: data.area ? `${data.area} ${data.unit || t("home.areaUnit") || "acres"}` : undefined,
    },
    {
      id: "weather",
      tab: "weather",
      icon: CloudSun,
      title: t("svc.weather") || "Weather",
      value: data.temp,
      line: data.condition,
      tag: data.humidity !== undefined ? `${t("home.humidity") || "Humidity"}: ${data.humidity}%` : undefined,
    },
    {
      id: "health",
      tab: "crop-doctor",
      icon: Droplets,
      title: t("home.cropHealth") || "Crop Health",
      value: t("home.farmStatusGood") || "Good condition",
      line: data.crop,
      tag: "Scan to check",
    },
    {
      id: "mandi",
      tab: "mandi",
      icon: TrendingUp,
      title: t("nav.mandi") || "Mandi Bhav",
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
            <button
              key={cell.id}
              type="button"
              onClick={() => onGo?.(cell.tab)}
              className="group flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover active:scale-[0.98]"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-105", TONE.icon)}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                {cell.movement ? (
                  <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold", TONE.chip)}>
                    <MovementIcon status={cell.movement} />
                    {cell.tag || cell.value}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary">
                    {t("home.open") || "Open"}
                    <ArrowRight
                      size={12}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                )}
              </div>
              <div className="w-full">
                <span className="block text-xs font-semibold tracking-wide text-muted-foreground">
                  {cell.title}
                </span>
                {cell.value && (
                  <span className="mt-0.5 block text-lg font-extrabold leading-tight tracking-tight text-foreground">
                    {cell.value}
                  </span>
                )}
                {cell.line && (
                  <span className="mt-0.5 block text-xs font-semibold leading-snug text-foreground/80 truncate">
                    {cell.line}
                  </span>
                )}
                {cell.tag && !cell.movement && cell.tag !== cell.line && (
                  <span className="mt-1 block text-xs font-medium text-emerald-800/90 truncate">
                    {cell.tag}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default FarmSnapshot;