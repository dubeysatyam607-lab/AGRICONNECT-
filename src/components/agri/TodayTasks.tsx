import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, PartyPopper, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { interpolate } from "@/i18n/journey";
import { loadOnboardingData } from "@/features/auth/presentation/onboarding/onboardingData";
import { buildFarmerTasks, buildTasksForCropName, type IGeneratedTask } from "./cropTimelineData";

interface TodayTasksProps {
 triggerHaptic: () => void;
 farmCrop?: string;
 onNavigate?: (tab: string) => void;
}

const getTaskAction = (id: string, label: string): { tab: string; label: string } => {
  const s = (id + " " + label).toLowerCase();
  if (s.includes("irrigate") || s.includes("irrigation") || s.includes("water") || s.includes("पानी") || s.includes("सिंचाई")) {
    return { tab: "weather", label: "Irrigation" };
  }
  if (s.includes("mandi") || s.includes("price") || s.includes("rate") || s.includes("भाव") || s.includes("मंडी")) {
    return { tab: "mandi", label: "Mandi" };
  }
  if (s.includes("fertiliz") || s.includes("urea") || s.includes("nutrient") || s.includes("खाद") || s.includes("यूरिया")) {
    return { tab: "store", label: "Store" };
  }
  if (s.includes("harvest") || s.includes("tractor") || s.includes("machin") || s.includes("कटाई") || s.includes("ट्रैक्टर")) {
    return { tab: "tractors", label: "Equipment" };
  }
  if (s.includes("kisan") || s.includes("scheme") || s.includes("subsidy") || s.includes("योजना")) {
    return { tab: "schemes", label: "Schemes" };
  }
  if (s.includes("scan") || s.includes("pest") || s.includes("disease") || s.includes("doctor") || s.includes("कीट") || s.includes("रोग")) {
    return { tab: "crop-doctor", label: "Crop Scan" };
  }
  return { tab: "farm-os", label: "Farm OS" };
};

const LEGACY_TASKS: { id: string; labelKey: string; done: boolean }[] = [
 { id: "legacy-soybean-irrigation", labelKey: "tasks.legacy0", done: false },
 { id: "legacy-harvester-booking", labelKey: "tasks.legacy1", done: false },
 { id: "legacy-urea", labelKey: "tasks.legacy2", done: true },
 { id: "legacy-pm-kisan", labelKey: "tasks.legacy3", done: false },
];

const CONFETTI_COLORS = [
 "#1f6b45", "#d99a1f", "#0ea5e9", "#3f7d52", "#a8542a", "#4f9d5b",
];

const TASKS_KEY = "agri_today_tasks";

const loadDoneMap = (): Record<string, boolean> => {
 try {
 const raw = localStorage.getItem(TASKS_KEY);
 if (!raw) return {};
 const parsed = JSON.parse(raw);
 if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
 return parsed as Record<string, boolean>;
 }
 return {};
 } catch {
 return {};
 }
};

/**
 * Today's Tasks — animated checklist with a progress bar and a confetti
 * celebration when every task is completed. For onboarded farmers the list is
 * personalized from their crops & crop stage; guests get the generic list.
 * Completion state is stored per task-id so it survives regeneration.
 */
const TodayTasks: React.FC<TodayTasksProps> = ({ triggerHaptic, farmCrop, onNavigate }) => {
 const { t, language } = useLanguage();
 const [celebrate, setCelebrate] = useState(false);
 const prevAllDone = useRef(false);

 const generated = useMemo(() => {
 const personalized = buildFarmerTasks(loadOnboardingData(language), t);
 if (personalized.length > 0) return personalized;
 const byFarmCrop = farmCrop ? buildTasksForCropName(farmCrop, t) : [];
 if (byFarmCrop.length > 0) return byFarmCrop;
 return LEGACY_TASKS.map(({ id, labelKey, done }) => ({ id, label: t(labelKey), done }));
 }, [language, t, farmCrop]);

 const [tasks, setTasks] = useState<IGeneratedTask[]>(() => {
 const doneMap = loadDoneMap();
 return generated.map((t) => ({ ...t, done: doneMap[t.id] ?? t.done }));
 });

 useEffect(() => {
 setTasks((prev) =>
 generated.map((t) => {
 const match = prev.find((p) => p.id === t.id);
 return { ...t, done: match ? match.done : t.done };
 }),
 );
 }, [generated]);

 useEffect(() => {
 try {
 localStorage.setItem(
 TASKS_KEY,
 JSON.stringify(Object.fromEntries(tasks.map((t) => [t.id, t.done]))),
 );
 } catch {
 /* storage unavailable */
 }
 }, [tasks]);

 const doneCount = tasks.filter((t) => t.done).length;
 const pct = Math.round((doneCount / tasks.length) * 100);
 const allDone = doneCount === tasks.length;

 const confetti = useMemo(
 () =>
 Array.from({ length: 14 }).map((_, i) => ({
 left: 8 + ((i * 61 + 13) % 84),
 dx: (i % 2 === 0 ? 1 : -1) * (30 + ((i * 17) % 50)),
 dy: -(50 + ((i * 23) % 70)),
 rot: (i % 2 === 0 ? 1 : -1) * (360 + (i % 4) * 180),
 delay: (i % 5) * 0.05,
 color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
 })),
 [],
 );

 useEffect(() => {
 if (allDone && !prevAllDone.current) {
 triggerHaptic();
 setCelebrate(true);
 prevAllDone.current = true;
 const t = setTimeout(() => setCelebrate(false), 1300);
 return () => clearTimeout(t);
 }
 prevAllDone.current = allDone;
 }, [allDone, triggerHaptic]);

 const toggleTask = (idx: number) => {
 triggerHaptic();
 setTasks((prev) => prev.map((task, i) => (i === idx ? { ...task, done: !task.done } : task)));
 };

 return (
 <section className="mt-6 reveal" style={{ animationDelay: "600ms" }} aria-labelledby="tasks-heading">
 <div className="flex items-end justify-between mb-3 px-1">
 <h2 id="tasks-heading" className="type-h2 tracking-tight text-foreground flex items-center gap-1.5">
 <CalendarDays className="h-5 w-5 text-emerald-700" strokeWidth={1.8} aria-hidden="true" /> {t("tasks.title")}
 </h2>
 <span
 className={cn(
 "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
 allDone ? "bg-feature-doctor/15 text-feature-doctor" : "bg-feature-loans/12 text-feature-loans",
 )}
 >
 {allDone ? t("tasks.allDone") : `${doneCount}/${tasks.length}`}
 </span>
 </div>

 <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card">
 {/* Confetti overlay on completion */}
 {celebrate && (
 <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
 {confetti.map((c, i) => (
 <span
 key={i}
 className="absolute top-1/2 h-2 w-1.5 rounded-[1px] "
 style={{
 left: `${c.left}%`,
 backgroundColor: c.color,
 ["--dx" as any]: `${c.dx}px`,
 ["--dy" as any]: `${c.dy}px`,
 ["--rot" as any]: `${c.rot}deg`,
 animationDelay: `${c.delay}s`,
 }}
 />
 ))}
 </div>
 )}

 {/* Animated progress bar */}
 <div className="flex items-center gap-3">
 <div
 className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
 role="progressbar"
 aria-valuenow={pct}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label={t("tasks.progress")}
 >
 <div
 className={cn(
 "h-full rounded-full transition-all duration-700 ease-out",
 allDone ? "bg-feature-doctor" : "bg-primary",
 )}
 style={{ width: `${pct}%` }}
 />
 </div>
 <span className="text-xs font-semibold text-muted-foreground tabular-nums">{pct}%</span>
 </div>

  <div className="space-y-2">
  {tasks.map((task, idx) => {
    const action = getTaskAction(task.id, task.label);
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => toggleTask(idx)}
        role="checkbox"
        aria-checked={task.done}
        aria-label={interpolate(t("tasks.ariaTask"), { label: task.label, status: task.done ? t("tasks.completed") : t("tasks.pending") })}
        className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-700/40 hover:bg-muted/30 active:scale-[0.99]"
      >
        <span className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          task.done ? "border-emerald-700 bg-emerald-700 text-white" : "border-border bg-background group-hover:border-emerald-700/50",
        )}>
          {task.done && <Check size={13} className="stroke-[3]" aria-hidden="true" />}
        </span>
        <span className={cn("flex-1 text-sm font-medium transition-colors", task.done ? "text-muted-foreground line-through" : "text-foreground")}>
          {task.label}
        </span>
        {onNavigate && action && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(action.tab);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onNavigate(action.tab);
              }
            }}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 hover:bg-primary hover:text-white px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors cursor-pointer"
            title={`Open ${action.label}`}
          >
            {action.label}
            <ChevronRight size={11} aria-hidden="true" />
          </span>
        )}
        <span className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
          task.done ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" : "bg-muted text-muted-foreground",
        )}>
          {task.done ? t("tasks.completed") : t("tasks.todo")}
        </span>
      </button>
    );
  })}
  </div>

 {allDone && (
 <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/10 px-3 py-2.5 text-sm font-bold text-emerald-800 dark:text-emerald-300">
 <PartyPopper size={16} aria-hidden="true" /> {t("tasks.greatJob")}
 </div>
 )}
 </div>
 </section>
 );
};

export default TodayTasks;
