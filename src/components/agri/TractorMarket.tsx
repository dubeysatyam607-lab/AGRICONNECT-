import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Tractor, RefreshCw, Wheat, Layers, Sprout, Shovel, Combine, Droplets,
  Star, MapPin, Search, SlidersHorizontal, Phone, MessageCircle, Navigation,
  X, ChevronRight, Heart, ShieldCheck, BadgeCheck, CreditCard,
  Smartphone, Wallet, Check, ArrowLeft, Fuel, Truck, Gauge, Timer,
  CalendarDays, IndianRupee, Zap, History, Store, WifiOff, type LucideIcon,
} from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { MACHINE_IMG, DEFAULT_MACHINE_IMG } from "@/lib/machine-images";
import { postEdgeJson } from "@/lib/invoke-edge";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FUNC_URL = `${SUPABASE_URL}/functions/v1/tractor-hire`;

function post(body: Record<string, unknown>) {
  return postEdgeJson<Record<string, unknown>>(FUNC_URL, body, 15000);
}

function deviceId(): string {
  let id = localStorage.getItem("tractor_device_id");
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("tractor_device_id", id);
  }
  return id;
}

function fmt(n: number): string {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function isFav(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem("tractor_favs") || "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}
function toggleFav(id: string): boolean {
  let list: string[];
  try {
    list = JSON.parse(localStorage.getItem("tractor_favs") || "[]") as string[];
  } catch {
    list = [];
  }
  const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  localStorage.setItem("tractor_favs", JSON.stringify(next));
  return next.includes(id);
}

const CATEGORIES = ["All", "Tractor", "Rotavator", "Harvester", "Plough", "Seeder", "Cultivator", "Thresher", "Sprayer"];
const CATEGORY_ICONS: Record<string, typeof Tractor> = {
  Tractor, Rotavator: RefreshCw, Harvester: Wheat, Plough: Layers,
  Seeder: Sprout, Cultivator: Shovel, Thresher: Combine, Sprayer: Droplets,
};

interface TractorSummary {
  id: string; name: string; category: string; brand: string; hp?: number;
  implements: string[]; rateHour: number; rateAcre: number; rateDay: number;
  deposit: number; rating: number; reviews: number; status: string;
  nextAvailable: string; city: string; state: string; color: string;
  popular: boolean; verified: boolean; distance: string | null; distanceKm: number | null;
}
interface Owner { id: string; name: string; nameHi: string; phone: string; rating: number; jobs: number; verified: boolean; joined: string; response: string; avatar: string; village: string; city: string; state: string; lat: number; lng: number; }
interface TractorDetail extends TractorSummary {
  owner: Owner; year: number; engine: string; lifting: string; fuel: string;
  cabin: boolean; features: string[]; description: string;
}
interface Review { user: string; rating: number; comment: string; when: string; }
interface Booking {
  id: string; tractorId: string; tractorName: string; category: string;
  ownerId: string; ownerName: string; ownerPhone: string; userName: string;
  hours: number; acres: number; address: string; paymentMethod: string;
  withDriver: boolean; baseFare: number; fuelSurcharge: number;
  driverCharge: number; deposit: number; total: number; status: string; createdAt: string;
}
interface Tracking {
  bookingId: string; tractor: string; driver: string; plate: string;
  progress: number; eta: number; speed: number;
  route: Array<{ lat: number; lng: number }>;
  destination: { lat: number; lng: number };
  steps: Array<{ label: string; time: string; done: boolean }>;
  totalTrip: number; status: string;
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={cn(i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted")} />
      ))}
    </span>
  );
}

function StatusPill({ status, nextAvailable, t }: { status: string; nextAvailable: string; t: (k: string) => string }) {
  const live = status === "available";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold",
      live ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : status === "busy" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-500/15 text-muted-foreground"
    )}>
      <span className={cn("relative flex h-1.5 w-1.5", live && "animate-live-dot")}>
        {live && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping"></span>}
        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", live ? "bg-emerald-500" : status === "busy" ? "bg-amber-500" : "bg-slate-400")}></span>
      </span>
      {live ? t("live") : status === "busy" ? t("busy") : t("maintenance")}
      {!live && <span className="font-medium opacity-70">· {nextAvailable}</span>}
    </span>
  );
}

function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICONS[category] || Tractor;
  return <Icon size={size} />;
}

const MachinePhoto: React.FC<{ name: string; category: string; color: string; className?: string }> = ({ name, category, color, className }) => {
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICONS[category] || Tractor;

  if (failed) {
    return (
      <div className={cn("relative h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center overflow-hidden", className)}>
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 100%, ${color}, transparent 70%)` }}></div>
        <Icon size={46} strokeWidth={1.4} style={{ color, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.45))" }} />
      </div>
    );
  }

  return (
    <div className={cn("relative h-28 bg-slate-900 overflow-hidden", className)}>
      <img
        src={MACHINE_IMG[name] || DEFAULT_MACHINE_IMG}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
    </div>
  );
};

function pointAlongPath(points: Array<{ lat: number; lng: number }>, frac: number): { x: number; y: number } {
  const total = points.length - 1;
  const exact = Math.min(total, Math.max(0, frac * total));
  const i = Math.floor(exact);
  const j = Math.min(i + 1, total);
  const t = exact - i;
  const a = points[i], b = points[j];
  return { x: a.lng + (b.lng - a.lng) * t, y: a.lat + (b.lat - a.lat) * t };
}

const TrackingScreen = ({ booking, onClose, onCall, onChat, t }: {
  booking: Booking; onClose: () => void; onCall: () => void; onChat: () => void; t: (k: string) => string;
}) => {
  const [track, setTrack] = useState<Tracking | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await post({ action: "track", bookingId: booking.id });
      setTrack(res.tracking);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load tracking");
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  if (!track) {
    return (
      <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur flex flex-col items-center justify-center gap-3 animate-fade-up">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-sm text-muted-foreground">{t("tracking")}...</p>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <AgriButton variant="outline" size="sm" onClick={onClose}><ArrowLeft size={14} /> {t("back")}</AgriButton>
      </div>
    );
  }

  const pts = track.route && track.route.length > 1 ? track.route : [];
  if (pts.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-background overflow-y-auto animate-sheet-up flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={t("liveTracking")}>
        <div className="text-center max-w-xs">
          <Truck size={34} className="mx-auto text-muted-foreground mb-3" />
          <h2 className="font-bold text-foreground">{t("liveTracking")}</h2>
          <p className="text-sm text-muted-foreground mt-1">Tracking route is not available for this trip yet.</p>
          <AgriButton variant="outline" size="sm" className="mt-4" onClick={onClose}><ArrowLeft size={14} /> {t("back")}</AgriButton>
        </div>
      </div>
    );
  }
  const xs = pts.map(p => p.lng), ys = pts.map(p => p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const toX = (lng: number) => 10 + ((lng - minX) / Math.max(1e-4, maxX - minX)) * 80;
  const toY = (lat: number) => 85 - ((lat - minY) / Math.max(1e-4, maxY - minY)) * 70;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.lng).toFixed(1)} ${toY(p.lat).toFixed(1)}`).join(" ");
  const start = { x: toX(pts[0].lng), y: toY(pts[0].lat) };
  const dest = { x: toX(track.destination.lng), y: toY(track.destination.lat) };
  const driver = pointAlongPath(pts, track.progress / 100);
  const driverPos = { x: toX(driver.x), y: toY(driver.y) };

  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto animate-sheet-up" role="dialog" aria-modal="true" aria-label={t("liveTracking")}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgriButton variant="outline" size="icon" onClick={onClose}><X size={16} /></AgriButton>
          <div>
            <h2 className="font-bold text-sm flex items-center gap-1.5"><Truck size={15} className="text-primary" /> {t("liveTracking")}</h2>
            <p className="text-[11px] text-muted-foreground">{booking.tractorName} · {track.plate}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span></span>
          LIVE
        </span>
      </div>

      <div className="p-4 space-y-4">
        <AgriCard className="p-0 overflow-hidden">
          <div className="relative w-full h-64 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <path d={path} fill="none" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="0.1 2" className="opacity-80" />
              <circle cx={start.x} cy={start.y} r="1.6" fill="#94a3b8" />
              <circle cx={dest.x} cy={dest.y} r="1.8" fill="#f59e0b">
                <animate attributeName="r" values="1.5;2.5;1.5" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={driverPos.x} cy={driverPos.y} r="2.4" fill="#22c55e" stroke="#ffffff" strokeWidth="0.6">
                <animate attributeName="r" values="2;3;2" dur="1.2s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] font-semibold text-white/90">
              <span className="inline-flex items-center gap-1"><MapPin size={10} /> {booking.ownerName}</span>
              <span className="inline-flex items-center gap-1"><Tractor size={10} /> {track.tractor}</span>
              <span className="inline-flex items-center gap-1"><Navigation size={10} /> {t("farm")}</span>
            </div>
          </div>
        </AgriCard>

        <AgriCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-[11px] text-muted-foreground">{t("driver")}</p>
              <p className="font-bold text-foreground flex items-center gap-1.5">{track.driver} <BadgeCheck size={13} className="text-primary" /></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">ETA</p>
              <p className="font-bold text-primary text-lg leading-tight">{track.eta} {t("min")}</p>
            </div>
          </div>
          <div className="bg-muted rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <Navigation size={13} className="text-primary" />
            <span className="text-muted-foreground">{track.plate}</span>
            <span className="ml-auto font-semibold text-foreground">{track.speed} km/h</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>{track.progress}% {t("route")}</span><span>{track.totalTrip} {t("min")}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700" style={{ width: `${track.progress}%` }}></div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <AgriButton variant="outline" size="sm" className="flex-1" onClick={onCall}><Phone size={14} /> {t("call")}</AgriButton>
            <AgriButton variant="outline" size="sm" className="flex-1" onClick={onChat}><MessageCircle size={14} /> {t("chat")}</AgriButton>
          </div>
        </AgriCard>

        <AgriCard>
          <h3 className="font-bold text-sm mb-3">{t("journey")}</h3>
          <div className="space-y-0">
            {track.steps.map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn("w-3 h-3 rounded-full border-2 mt-0.5", s.done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40")}></span>
                  {i < track.steps.length - 1 && <span className={cn("w-0.5 flex-1 min-h-5", s.done ? "bg-emerald-500/40" : "bg-muted")}></span>}
                </div>
                <div className="pb-4">
                  <p className={cn("text-sm font-semibold", s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.time}</p>
                </div>
              </div>
            ))}
          </div>
        </AgriCard>
      </div>
    </div>
  );
};

const ChatModal = ({ owner, tractorName, onClose, t }: {
  owner: { name: string; phone: string; nameHi: string }; tractorName: string; onClose: () => void; t: (k: string) => string;
}) => {
  const key = `tractor_chat_${owner.phone}`;
  const [msgs, setMsgs] = useState<Array<{ from: "user" | "owner"; text: string; time: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(msgs));
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, key]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsgs(m => [...m, { from: "user", text, time }]);
    setInput("");
    const replies = [
      "Thanks for reaching out! I can deliver the tractor at your farm by tomorrow morning. 👍",
      "Sure ji. Let me confirm availability and I will call you shortly.",
      "Rate is per our listing. I can send a driver if needed.",
      "Ok, noted. I will reach your village by evening. Keep your field cleared.",
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    setTimeout(() => setMsgs(m => [...m, { from: "owner", text: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]), 900);
  };

  const quick = ["Is the tractor available today?", "Can you send a driver?", "What is the rate for 5 acres?", "Can you deliver to my village?"];

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur flex items-end justify-center animate-sheet-up" role="dialog" aria-modal="true" aria-label={t("chat")}>
      <div className="w-full max-w-md bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col h-[85vh]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs">{owner.name[0]}</div>
            <div>
              <p className="font-bold text-sm flex items-center gap-1">{owner.name} <BadgeCheck size={12} className="text-primary" /></p>
              <p className="text-[11px] text-muted-foreground">{tractorName}</p>
            </div>
          </div>
          <AgriButton variant="ghost" size="icon" onClick={onClose}><X size={18} /></AgriButton>
        </div>
        <div ref={boxRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/40">
          {msgs.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6">
              <MessageCircle className="mx-auto mb-2 text-muted-foreground/60" size={28} />
              {t("chatStart")}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn("max-w-[80%] px-3 py-2 rounded-2xl text-sm", m.from === "user" ? "ml-auto bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm")}>
              {m.text}
              <p className={cn("text-[10px] mt-0.5", m.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.time}</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {quick.map((q, i) => (
              <button key={i} onClick={() => { setInput(q); }} className="shrink-0 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border">
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={t("typeMsg")}
              className="flex-1 h-10 px-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <AgriButton size="icon" onClick={send} disabled={!input.trim()} aria-label={t("submit")}><Zap size={16} /></AgriButton>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReviewModal = ({ tractor, onClose, onSubmitted, t }: {
  tractor: TractorSummary; onClose: () => void; onSubmitted: (r: number) => void; t: (k: string) => string;
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await post({ action: "review", tractorId: tractor.id, rating, comment, userName: localStorage.getItem("tractor_user_name") || "Farmer" });
      setSent(true);
      onSubmitted(rating);
    } catch {
      setSent(true);
      onSubmitted(rating);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/90 backdrop-blur flex items-center justify-center p-4 overflow-y-auto animate-fade-up" role="dialog" aria-modal="true" aria-label={t("thankReview")}>
      <AgriCard className="w-full max-w-sm">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-3"><Check size={28} /></div>
            <h3 className="font-bold text-foreground">{t("thankReview")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("reviewAdded")}</p>
            <AgriButton className="w-full mt-4" onClick={onClose}>{t("done")}</AgriButton>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-foreground mb-1">{t("rate")} {tractor.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("shareExp")}</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i)} className="transition-transform active:scale-90">
                  <Star size={32} className={cn("transition-colors", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t("writeReview")}
              className="w-full h-24 p-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <AgriButton variant="outline" className="flex-1" onClick={onClose}>{t("cancel")}</AgriButton>
              <AgriButton className="flex-1" onClick={submit} disabled={busy}>{busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />} {t("submit")}</AgriButton>
            </div>
          </>
        )}
      </AgriCard>
    </div>
  );
};

const FilterSheet = ({ open, filters, onChange, onClose, t }: {
  open: boolean;
  filters: { minRate: number; maxRate: number; minRating: number; availableOnly: boolean; verifiedOnly: boolean; sort: string };
  onChange: (f: typeof filters) => void; onClose: () => void; t: (k: string) => string;
}) => {
  if (!open) return null;
  const set = (patch: Partial<typeof filters>) => onChange({ ...filters, ...patch });
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={onClose}></div>
      <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl p-5 pb-8 animate-sheet-up max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t("filters")}>
        <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mb-4"></div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2"><SlidersHorizontal size={16} className="text-primary" /> {t("filters")}</h3>
          <AgriButton variant="ghost" size="sm" onClick={() => onChange({ minRate: 0, maxRate: 5000, minRating: 0, availableOnly: false, verifiedOnly: false, sort: "distance" })}>{t("reset")}</AgriButton>
        </div>

        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{t("pricePerHour")}</p>
        <div className="bg-muted rounded-xl p-3 mb-4">
          <input type="range" min={0} max={3000} step={50} value={filters.maxRate} onChange={e => set({ maxRate: Number(e.target.value) })} className="w-full accent-emerald-600" />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
            <span>{fmt(0)}</span><span className="font-bold text-primary">upto {fmt(filters.maxRate)}</span>
          </div>
        </div>

        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{t("minRating")}</p>
        <div className="flex gap-2 mb-4">
          {[0, 3, 4, 4.5].map(r => (
            <button key={r} onClick={() => set({ minRating: r })} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", filters.minRating === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground")}>
              {r === 0 ? t("any") : <span className="inline-flex items-center gap-1">{r}+ <Star size={10} className="fill-amber-400 text-amber-400" /></span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => set({ availableOnly: !filters.availableOnly })} className={cn("px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5", filters.availableOnly ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : "bg-card border-border text-muted-foreground")}>
            <Tractor size={13} /> {t("availableOnly")}
          </button>
          <button onClick={() => set({ verifiedOnly: !filters.verifiedOnly })} className={cn("px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5", filters.verifiedOnly ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : "bg-card border-border text-muted-foreground")}>
            <ShieldCheck size={13} /> {t("verifiedOnly")}
          </button>
        </div>

        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{t("sort")}</p>
        <div className="flex gap-2 flex-wrap mb-6">
          {[["distance", t("nearest")], ["rating", t("topRated")], ["price_asc", t("priceLow")], ["price_desc", t("priceHigh")]].map(([v, label]) => (
            <button key={v} onClick={() => set({ sort: v })} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", filters.sort === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>

        <AgriButton className="w-full" onClick={onClose}><Check size={16} /> {t("applyFilters")}</AgriButton>
      </div>
    </div>
  );
};

const BookingModal = ({ tractor, onClose, onSubmit }: {
  tractor: TractorSummary; onClose: () => void; onSubmit: (req: { hours: number; acres: number; address: string; paymentMethod: string; withDriver: boolean }) => void;
}) => {
  const [mode, setMode] = useState<"hours" | "acres">("hours");
  const [qty, setQty] = useState(4);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [address, setAddress] = useState("");
  const [withDriver, setWithDriver] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("upi");

  const base = mode === "hours" ? qty * tractor.rateHour : qty * tractor.rateAcre;
  const fuel = Math.round(base * 0.12);
  const driver = withDriver ? 150 : 0;
  const total = base + fuel + driver;

  const payMethods = [
    { id: "upi", label: "UPI", sub: "GPay · PhonePe · Paytm", icon: Smartphone },
    { id: "card", label: "Card", sub: "Debit / Credit", icon: CreditCard },
    { id: "netbanking", label: "Net Banking", sub: "All major banks", icon: Wallet },
    { id: "cash", label: "Cash on arrival", sub: "Pay after work", icon: IndianRupee },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-background/90 backdrop-blur flex items-end justify-center animate-sheet-up">
      <div className="w-full max-w-md bg-card rounded-t-3xl border-t border-border shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-foreground">{tractor.name}</h3>
            <p className="text-[11px] text-muted-foreground">{tractor.city}, {tractor.state}</p>
          </div>
          <AgriButton variant="ghost" size="icon" onClick={onClose}><X size={18} /></AgriButton>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setMode("hours"); setQty(4); }} className={cn("p-3 rounded-xl border text-center", mode === "hours" ? "bg-primary/10 border-primary/50" : "bg-card border-border")}>
              <p className="font-bold text-sm">{tractor.rateHour !== undefined && `₹${tractor.rateHour}/hr`}</p>
              <p className="text-[11px] text-muted-foreground">Per hour</p>
            </button>
            <button onClick={() => { setMode("acres"); setQty(2); }} className={cn("p-3 rounded-xl border text-center", mode === "acres" ? "bg-primary/10 border-primary/50" : "bg-card border-border")}>
              <p className="font-bold text-sm">₹{tractor.rateAcre}/acre</p>
              <p className="text-[11px] text-muted-foreground">Per acre</p>
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{mode === "hours" ? "Duration (hours)" : "Land size (acres)"}</p>
            <div className="flex items-center gap-3 bg-muted rounded-xl p-2">
              <AgriButton size="icon" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</AgriButton>
              <div className="flex-1 text-center font-bold text-lg">{qty} {mode === "hours" ? "hr" : "acre"}</div>
              <AgriButton size="icon" variant="outline" onClick={() => setQty(Math.min(24, qty + 1))} aria-label="Increase">+</AgriButton>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Schedule date</p>
            <div className="flex items-center gap-2 bg-muted rounded-xl p-2">
              <CalendarDays size={16} className="text-primary ml-1" />
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} className="flex-1 bg-transparent text-base sm:text-sm font-semibold focus:outline-none" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Field address</p>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Village, tehsil, district" className="w-full h-10 px-3 rounded-xl bg-muted border border-border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <button onClick={() => setWithDriver(!withDriver)} className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card">
            <span className="flex items-center gap-2 text-sm font-semibold"><Truck size={15} className="text-primary" /> With driver <span className="text-[10px] text-muted-foreground font-normal">+₹150</span></span>
            <span className={cn("w-10 h-6 rounded-full p-0.5 transition-colors", withDriver ? "bg-primary" : "bg-muted")}>
              <span className={cn("block w-5 h-5 rounded-full bg-white transition-transform", withDriver && "translate-x-4")}></span>
            </span>
          </button>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {payMethods.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={cn("p-3 rounded-xl border text-left", paymentMethod === m.id ? "bg-primary/10 border-primary/50" : "bg-card border-border")}>
                    <Icon size={16} className={paymentMethod === m.id ? "text-primary" : "text-muted-foreground"} />
                    <p className="font-bold text-xs mt-1">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-muted rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>{mode === "hours" ? `${qty} hr` : `${qty} acre`} rental</span><span>{fmt(base)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Fuel surcharge (12%)</span><span>{fmt(fuel)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Driver</span><span>{driver ? "+₹150" : "₹0"}</span></div>
            <div className="border-t border-border my-1.5 pt-1.5 flex justify-between font-bold text-foreground"><span>Total</span><span>{fmt(total)}</span></div>
            <p className="text-[11px] text-muted-foreground">Security deposit {fmt(tractor.deposit)} refunded after work.</p>
          </div>

          <AgriButton className="w-full" size="lg" onClick={() => onSubmit({ hours: mode === "hours" ? qty : 0, acres: mode === "acres" ? qty : 0, address, paymentMethod, withDriver })}>
            <CalendarDays size={16} /> Book {fmt(total)}
          </AgriButton>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ booking, onClose, onSuccess, t }: {
  booking: Booking; onClose: () => void; onSuccess: () => void; t: (k: string) => string;
}) => {
  const [stage, setStage] = useState<"pick" | "paying" | "done">("pick");
  const [method, setMethod] = useState(booking.paymentMethod || "upi");

  const pay = () => {
    setStage("paying");
    setTimeout(() => setStage("done"), 1900);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur flex items-center justify-center p-4 overflow-y-auto animate-fade-up" role="dialog" aria-modal="true" aria-label={t("payment")}>
      <AgriCard className="w-full max-w-sm">
        {stage === "done" ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <Check size={34} />
            </div>
            <h3 className="font-bold text-foreground text-lg">{t("paymentSuccess")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{fmt(booking.total)} {t("paidVia")} {method.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground mt-2">{t("receiptSent")}</p>
            <div className="mt-4 space-y-2">
              <AgriButton className="w-full" onClick={() => { onSuccess(); }}><Navigation size={15} /> {t("trackBooking")}</AgriButton>
              <AgriButton variant="outline" className="w-full" onClick={onClose}>{t("done")}</AgriButton>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-foreground flex items-center gap-2"><CreditCard size={16} className="text-primary" /> {t("payment")}</h3>
              <AgriButton variant="ghost" size="icon" onClick={onClose}><X size={16} /></AgriButton>
            </div>
            <p className="text-sm text-muted-foreground">{booking.tractorName}</p>
            <div className="bg-muted rounded-xl p-3 my-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("amountDue")}</span>
              <span className="font-bold text-xl text-primary">{fmt(booking.total)}</span>
            </div>

            {stage === "paying" ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p className="text-sm text-muted-foreground">{t("processing")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {[["upi", "UPI / GPay / PhonePe"], ["card", "Debit / Credit Card"], ["netbanking", "Net Banking"], ["cash", "Cash on arrival"]].map(([id, label]) => (
                    <button key={id} onClick={() => setMethod(id)} className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold", method === id ? "bg-primary/10 border-primary/50" : "bg-card border-border")}>
                      <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", method === id ? "border-primary" : "border-muted-foreground/40")}>
                        {method === id && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
                <AgriButton className="w-full" onClick={pay}><LockIcon /> {t("pay")} {fmt(booking.total)}</AgriButton>
                <p className="text-[11px] text-muted-foreground text-center mt-2">{t("securePay")}</p>
              </>
            )}
          </>
        )}
      </AgriCard>
    </div>
  );
};

const LockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

const TractorMarket: React.FC = () => {
  const { language } = useLanguage();
  const hi = language === "hi";
  const t = (k: string) => (STRINGS as Record<string, [string, string]>)[k]?.[hi ? 1 : 0] ?? k;

  const [tab, setTab] = useState<"discover" | "bookings">("discover");
  const [all, setAll] = useState<TractorSummary[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [stats, setStats] = useState({ total: 0, available: 0, avgRating: 0, avgHour: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [filters, setFilters] = useState({ minRate: 0, maxRate: 5000, minRating: 0, availableOnly: false, verifiedOnly: false, sort: "distance" });
  const [showFilters, setShowFilters] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("tractor_favs") || "[]"); } catch { return []; } });

  const [selected, setSelected] = useState<TractorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReviews, setDetailReviews] = useState<Review[]>([]);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<TractorSummary | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [payment, setPayment] = useState<Booking | null>(null);
  const [tracking, setTracking] = useState<Booking | null>(null);
  const [chat, setChat] = useState<{ name: string; nameHi: string; phone: string; tractor: string } | null>(null);
  const [history, setHistory] = useState<Booking[]>([]);
  const [toast, setToast] = useState("");

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const loadHistory = () => {
    try {
      const local = JSON.parse(localStorage.getItem("tractor_bookings") || "[]") as Booking[];
      setHistory(local);
    } catch {
      setHistory([]);
    }
  };

  const locate = () => {
    setLocating(true);
    if (!navigator.geolocation) { setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    post({ action: "list", latitude: coords?.lat, longitude: coords?.lng, sort: filters.sort })
      .then(res => {
        if (!active) return;
        if (res.tractors?.length) {
          setAll(res.tractors);
          setCategories([...res.categories]);
          setStats(res.stats || { total: res.tractors.length, available: res.tractors.filter((x: TractorSummary) => x.status === "available").length, avgRating: 0, avgHour: 0 });
        }
      })
      .catch(() => setLoadError(t("tractorLoadFailed")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  useEffect(() => { loadHistory(); }, []);

  const visible = useMemo(() => {
    let list = all;
    if (category !== "All") list = list.filter(x => x.category === category);
    if (filters.availableOnly) list = list.filter(x => x.status === "available");
    if (filters.verifiedOnly) list = list.filter(x => x.verified);
    list = list.filter(x => x.rating >= filters.minRating && x.rateHour <= filters.maxRate);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(x => x.name.toLowerCase().includes(q) || x.city.toLowerCase().includes(q) || x.brand.toLowerCase().includes(q) || x.category.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (filters.sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else if (filters.sort === "price_asc") sorted.sort((a, b) => a.rateHour - b.rateHour);
    else if (filters.sort === "price_desc") sorted.sort((a, b) => b.rateHour - a.rateHour);
    else sorted.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    return sorted;
  }, [all, search, category, filters]);

  const openDetails = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await post({ action: "details", id });
      setSelected(res.tractor);
      setDetailReviews(res.reviews || []);
    } catch {
      setSelected(null);
      showToast(t("loadFailed") || "Couldn't load tractor details. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  };

  const doBook = async (req: { hours: number; acres: number; address: string; paymentMethod: string; withDriver: boolean }) => {
    if (!selected) return;
    setBookingModal(false);
    try {
      const res = await post({
        action: "book",
        tractorId: selected.id,
        userName: localStorage.getItem("tractor_user_name") || "Farmer",
        hours: req.hours,
        acres: req.acres,
        address: req.address || `${selected.city}, ${selected.state}`,
        paymentMethod: req.paymentMethod,
        withDriver: req.withDriver,
      });
      const b = res.booking as Booking;
      let list: Booking[] = [];
      try {
        list = JSON.parse(localStorage.getItem("tractor_bookings") || "[]") as Booking[];
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
      localStorage.setItem("tractor_bookings", JSON.stringify([b, ...list]));
      setHistory([b, ...history]);
      setPayment(b);
      setAll(prev => prev.map(x => x.id === selected.id ? { ...x, status: "busy", nextAvailable: "Booked for you" } : x));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Booking failed");
    }
  };

  const renderCard = (tractor: TractorSummary) => {
    const fav = favs.includes(tractor.id);
    return (
      <AgriCard key={tractor.id} className="p-0 overflow-hidden group">
        <div className="relative">
          <MachinePhoto name={tractor.name} category={tractor.category} color={tractor.color} />
          <button
            onClick={() => { const nf = toggleFav(tractor.id); setFavs(prev => nf ? [...prev, tractor.id] : prev.filter(x => x !== tractor.id)); }}
            className={cn("absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur", fav ? "bg-rose-500 text-white" : "bg-white/15 text-white hover:bg-white/30")}
          >
            <Heart size={14} className={fav ? "fill-current" : ""} />
          </button>
          {tractor.popular && (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">★ {t("popular")}</span>
          )}
        </div>
        <div className="p-3.5">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-foreground truncate">{tractor.name}</h3>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {tractor.city}, {tractor.state}
                {tractor.distance && <span className="text-primary font-semibold"> · {tractor.distance}</span>}
              </p>
            </div>
            <StatusPill status={tractor.status} nextAvailable={tractor.nextAvailable} t={t} />
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Stars rating={tractor.rating} size={11} /> {tractor.rating}</span>
            <span className="text-muted-foreground">({tractor.reviews})</span>
            {tractor.hp && <span className="inline-flex items-center gap-1 text-muted-foreground"><Gauge size={11} /> {tractor.hp} HP</span>}
            {tractor.verified && <span className="inline-flex items-center gap-1 text-primary text-[10px] font-bold ml-auto"><ShieldCheck size={11} /> {t("verified")}</span>}
          </div>

          <div className="flex gap-1.5 mt-2 flex-wrap">
            {tractor.implements.slice(0, 3).map(imp => (
              <span key={imp} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{imp}</span>
            ))}
          </div>

          <div className="flex items-end justify-between mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-[11px] text-muted-foreground">{t("perHour")}</p>
              <p className="font-bold text-primary text-lg leading-tight">{fmt(tractor.rateHour)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">{t("perAcre")}</p>
              <p className="font-bold text-foreground">{fmt(tractor.rateAcre)}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <AgriButton variant="outline" size="sm" className="flex-1" onClick={() => openDetails(tractor.id)}>
              <ChevronRight size={13} /> {t("details")}
            </AgriButton>
            <AgriButton size="sm" className="flex-[1.4]" disabled={tractor.status !== "available"} onClick={async () => {
              if (tractor.status !== "available") return;
              if (!selected || selected.id !== tractor.id) await openDetails(tractor.id);
              setBookingModal(true);
            }}>
              <Tractor size={13} /> {t("bookNow")}
            </AgriButton>
          </div>
        </div>
      </AgriCard>
    );
  };

  return (
    <div className="pb-24">
      {toast && (
        <div className="fixed top-16 inset-x-4 z-[90] flex justify-center animate-fade-up">
          <div className="bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-2xl">{toast}</div>
        </div>
      )}

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Tractor size={20} /></span>
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("subtitle")}</p>
          </div>
          <AgriButton size="icon" variant="outline" onClick={locate} disabled={locating} title="Nearby">
            {locating ? <RefreshCw size={16} className="animate-spin" /> : <Navigation size={16} className="text-primary" />}
          </AgriButton>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: t("total"), value: String(stats.total || all.length), icon: Store, color: "text-primary" },
            { label: t("availableNow"), value: String(stats.available || all.filter(x => x.status === "available").length), icon: Zap, color: "text-emerald-500" },
            { label: t("avgRating"), value: String(stats.avgRating || 4.6), icon: Star, color: "text-amber-500" },
            { label: t("avgHour"), value: fmt(stats.avgHour || Math.round(all.reduce((s, x) => s + x.rateHour, 0) / Math.max(1, all.length))), icon: IndianRupee, color: "text-teal-500" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-2 text-center animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <s.icon size={14} className={`mx-auto ${s.color}`} />
              <p className="font-bold text-sm mt-0.5 truncate">{s.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full h-11 pl-10 pr-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-card"
            />
          </div>
          <AgriButton variant="outline" size="icon" onClick={() => setShowFilters(true)} className="h-11 w-11 relative" aria-label={t("filters")}>
            <SlidersHorizontal size={17} />
            {(filters.maxRate < 5000 || filters.minRating > 0 || filters.availableOnly || filters.verifiedOnly || filters.sort !== "distance") && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-background"></span>
            )}
          </AgriButton>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 mt-1">
          {categories.map(c => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95",
                  active ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30" : "bg-card border border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {c !== "All" && <CategoryIcon category={c} size={13} />}
                {c === "All" ? t("all") : c}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-sm">
            {coords ? t("nearbyTractors") : t("featured")}
            <span className="text-muted-foreground font-normal"> · {visible.length}</span>
          </h2>
          <div className="flex bg-card border border-border rounded-full p-0.5 text-[11px] font-bold">
            {(["discover", "bookings"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)} className={cn("px-3 py-1.5 rounded-full transition-colors", tab === tb ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {tb === "discover" ? t("discover") : t("bookings")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "discover" ? (
        loading ? (
          <div className="px-4 space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="h-28 bg-muted"></div>
                <div className="p-3.5 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-8 bg-muted rounded mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 && loadError ? (
          <div className="px-4">
            <AgriCard className="p-8 text-center">
              <WifiOff className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{loadError}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("tryAgain")}</p>
              <button
                onClick={() => setCoords({ ...(coords ?? { lat: undefined, lng: undefined }) })}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} /> {t("retry")}
              </button>
            </AgriCard>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4">
            <AgriCard className="p-8 text-center">
              <Search className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{t("noResults")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("tryFilters")}</p>
            </AgriCard>
          </div>
        ) : (
          <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visible.map(tractor => renderCard(tractor))}
          </div>
        )
      ) : (
        <div className="px-4 space-y-3">
          {history.length === 0 ? (
            <AgriCard className="p-8 text-center">
              <History className="mx-auto text-muted-foreground mb-2" size={28} />
              <p className="font-bold text-foreground">{t("noBookings")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("noBookingsHint")}</p>
            </AgriCard>
          ) : (
            history.map(b => (
              <AgriCard key={b.id} className="p-0 overflow-hidden">
                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><Tractor size={17} /></span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{b.tractorName}</p>
                        <p className="text-[11px] text-muted-foreground">{b.acres > 0 ? `${b.acres} acre` : `${b.hours} hr`} · {new Date(b.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", b.status === "confirmed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-500")}>
                      {b.status === "confirmed" ? t("confirmed") : t("cancelled")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 bg-muted rounded-xl p-2.5">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("owner")}</p>
                      <p className="font-semibold text-xs flex items-center gap-1">{b.ownerName} <BadgeCheck size={11} className="text-primary" /></p>
                    </div>
                    <p className="font-bold text-primary">{fmt(b.total)}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <AgriButton size="sm" variant="outline" className="flex-1" onClick={() => { setTracking(b); }} disabled={b.status !== "confirmed"}><Navigation size={13} /> {t("track")}</AgriButton>
                    <AgriButton size="sm" variant="outline" className="flex-1" onClick={() => { setReviewModal(true); setReviewTarget({ id: b.tractorId, name: b.tractorName, category: b.category, brand: b.category, implements: [], rateHour: 0, rateAcre: 0, rateDay: 0, deposit: 0, rating: 5, reviews: 1, status: "available", nextAvailable: "", city: "", state: "", color: "", popular: false, verified: false, distance: null, distanceKm: null }); }} disabled={b.status !== "confirmed"}><Star size={13} /> {t("rate")}</AgriButton>
                    <AgriButton size="sm" variant="outline" className="flex-1" onClick={() => setChat({ name: b.ownerName, nameHi: b.ownerName, phone: b.ownerPhone, tractor: b.tractorName })}><MessageCircle size={13} /> {t("chat")}</AgriButton>
                  </div>
                </div>
              </AgriCard>
            ))
          )}
        </div>
      )}

      <FilterSheet
        open={showFilters}
        filters={filters}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
        t={t}
      />

      {selected && (
        <div className="fixed inset-0 z-[60] bg-black/50 animate-fade-up" onClick={() => setSelected(null)}></div>
      )}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-[65] mx-auto w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-sheet-up max-h-[88vh] flex flex-col">
          <div className="p-3.5 pb-0 overflow-y-auto flex-1">
            <div className="relative">
              <MachinePhoto name={selected.name} category={selected.category} color={selected.color} className="h-36 rounded-2xl mb-3" />
              <button onClick={() => setSelected(null)} className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"><X size={15} /></button>
              <span className="absolute top-2.5 left-2.5 z-10"><StatusPill status={selected.status} nextAvailable={selected.nextAvailable} t={t} /></span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-extrabold text-lg text-foreground">{selected.name}</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={11} /> {selected.city}, {selected.state} {selected.distance && <span className="text-primary font-semibold">· {selected.distance}</span>}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end"><Stars rating={selected.rating} /> <span className="font-bold text-sm">{selected.rating}</span></div>
                <p className="text-[11px] text-muted-foreground">{selected.reviews} {t("reviews")}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-2">{selected.description}</p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-muted rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{t("perHour")}</p>
                <p className="font-bold text-primary">{fmt(selected.rateHour)}</p>
              </div>
              <div className="bg-muted rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{t("perAcre")}</p>
                <p className="font-bold text-foreground">{fmt(selected.rateAcre)}</p>
              </div>
              <div className="bg-muted rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{t("perDay")}</p>
                <p className="font-bold text-foreground">{fmt(selected.rateDay)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              {selected.hp && <Spec icon={Gauge} label={t("power")} value={`${selected.hp} HP`} />}
              <Spec icon={Fuel} label={t("fuel")} value={selected.fuel} />
              <Spec icon={Timer} label={t("year")} value={String(selected.year)} />
              <Spec icon={Truck} label={t("lifting")} value={selected.lifting} />
              {selected.cabin && <Spec icon={ShieldCheck} label="Cabin" value="AC + Cab" />}
            </div>

            <div className="flex gap-1.5 flex-wrap mt-3">
              {selected.features.map(f => (
                <span key={f} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold"><Check size={10} /> {f}</span>
              ))}
            </div>

            <div className="mt-4">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><UserBadge /> {t("ownerProfile")}</h3>
              <div className="bg-card border border-border rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-base shadow-lg shadow-emerald-500/30">{selected.owner.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm flex items-center gap-1.5">{selected.owner.name} {selected.owner.verified && <BadgeCheck size={14} className="text-primary" />}</p>
                    <p className="text-[11px] text-muted-foreground">{selected.owner.village}, {selected.owner.city}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="inline-flex items-center gap-0.5 font-semibold"><Star size={10} className="fill-amber-400 text-amber-400" /> {selected.owner.rating}</span>
                      <span className="text-muted-foreground">{selected.owner.jobs} {t("jobs")}</span>
                      <span className="text-muted-foreground">· {selected.owner.response}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <AgriButton size="sm" variant="outline" onClick={() => { window.open(`tel:${selected.owner.phone}`, "_self"); }}><Phone size={13} /></AgriButton>
                    <AgriButton size="sm" variant="outline" onClick={() => setChat({ name: selected.owner.name, nameHi: selected.owner.nameHi, phone: selected.owner.phone, tractor: selected.name })}><MessageCircle size={13} /></AgriButton>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{t("reviews")} ({detailReviews.length})</h3>
                <AgriButton size="sm" variant="outline" onClick={() => setReviewModal(true)}><Star size={12} /> {t("writeReview")}</AgriButton>
              </div>
              <div className="space-y-2">
                {detailReviews.slice(0, 4).map((r, i) => (
                  <div key={i} className="bg-muted rounded-xl p-2.5">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-xs">{r.user}</p>
                      <span className="text-[10px] text-muted-foreground">{r.when}</span>
                    </div>
                    <Stars rating={r.rating} size={11} />
                    <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-3.5 border-t border-border flex gap-2 sticky bottom-0 bg-card rounded-b-3xl">
            <AgriButton variant="outline" className="flex-1" onClick={() => setChat({ name: selected.owner.name, nameHi: selected.owner.nameHi, phone: selected.owner.phone, tractor: selected.name })}>
              <MessageCircle size={15} /> {t("chat")}
            </AgriButton>
            <AgriButton className="flex-[1.6]" disabled={selected.status !== "available"} onClick={() => setBookingModal(true)}>
              <Tractor size={15} /> {selected.status === "available" ? t("rentNow") : selected.nextAvailable}
            </AgriButton>
          </div>
        </div>
      )}

      {bookingModal && selected && (
        <BookingModal tractor={selected} onClose={() => setBookingModal(false)} onSubmit={doBook} />
      )}

      {payment && (
        <PaymentModal
          booking={payment}
          onClose={() => setPayment(null)}
          onSuccess={() => { setPayment(null); setTracking(payment); }}
          t={t}
        />
      )}

      {tracking && (
        <TrackingScreen
          booking={tracking}
          onClose={() => setTracking(null)}
          onCall={() => { const owner = tracking.ownerPhone ? { name: tracking.ownerName, phone: tracking.ownerPhone } : null; if (owner) window.open(`tel:${owner.phone}`, "_self"); }}
          onChat={() => { setTracking(null); setChat({ name: tracking.ownerName, nameHi: tracking.ownerName, phone: tracking.ownerPhone, tractor: tracking.tractorName }); }}
          t={t}
        />
      )}

      {chat && (
        <ChatModal owner={{ name: chat.name, nameHi: chat.nameHi, phone: chat.phone }} tractorName={chat.tractor} onClose={() => setChat(null)} t={t} />
      )}

      {reviewModal && reviewTarget && (
        <ReviewModal
          tractor={reviewTarget}
          onClose={() => { setReviewModal(false); setReviewTarget(null); }}
          onSubmitted={r => {
            setDetailReviews(prev => [{ user: "You", rating: r, comment: "", when: "Just now" }, ...prev]);
            setSelected(prev => prev ? { ...prev, rating: Math.round((prev.rating * prev.reviews + r) / (prev.reviews + 1) * 10) / 10, reviews: prev.reviews + 1 } : prev);
            showToast("Thanks for your review!");
          }}
          t={t}
        />
      )}
    </div>
  );
};

const Spec = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="flex items-center gap-2.5 bg-muted rounded-xl p-2.5">
    <Icon size={15} className="text-primary shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold text-xs text-foreground truncate">{value}</p>
    </div>
  </div>
);

const UserBadge = () => (
  <span className="w-5 h-5 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Tractor size={11} /></span>
);

const STRINGS: Record<string, [string, string]> = {
  title: ["Tractor Rental", "ट्रैक्टर किराया"],
  subtitle: ["Uber-style tractor on demand", "ऑन-डिमांड ट्रैक्टर सेवा"],
  total: ["Listed", "सूचीबद्ध"],
  availableNow: ["Live", "उपलब्ध"],
  avgRating: ["Rating", "रेटिंग"],
  avgHour: ["Avg ₹/hr", "औसत ₹/घंटा"],
  searchPlaceholder: ["Search tractor, brand, city...", "ट्रैक्टर, ब्रांड, शहर खोजें..."],
  all: ["All", "सभी"],
  nearbyTractors: ["Nearby tractors", "नज़दीकी ट्रैक्टर"],
  featured: ["All tractors", "सभी ट्रैक्टर"],
  discover: ["Discover", "खोजें"],
  bookings: ["My Bookings", "मेरी बुकिंग"],
  noResults: ["No tractors found", "कोई ट्रैक्टर नहीं मिला"],
  tryFilters: ["Try changing search or filters", "खोज या फ़िल्टर बदलें"],
  tractorLoadFailed: ["Could not load tractors", "ट्रैक्टर लोड नहीं हो सके"],
  tryAgain: ["Check your connection and retry.", "अपना इंटरनेट जाँचकर पुनः प्रयास करें।"],
  retry: ["Retry", "पुनः प्रयास"],
  noBookings: ["No bookings yet", "अभी कोई बुकिंग नहीं"],
  noBookingsHint: ["Rent a tractor to see your bookings here", "ट्रैक्टर किराए पर लें, बुकिंग यहाँ दिखेंगी"],
  details: ["Details", "विवरण"],
  bookNow: ["Book", "बुक"],
  rentNow: ["Rent Now", "अभी किराए पर"],
  perHour: ["Per hour", "प्रति घंटा"],
  perAcre: ["Per acre", "प्रति एकड़"],
  perDay: ["Per day", "प्रति दिन"],
  power: ["Power", "शक्ति"],
  fuel: ["Fuel", "ईंधन"],
  year: ["Year", "वर्ष"],
  lifting: ["Lifting", "लिफ्टिंग"],
  ownerProfile: ["Owner", "मालिक"],
  jobs: ["jobs", "नौकरियां"],
  reviews: ["reviews", "समीक्षाएं"],
  writeReview: ["Write", "समीक्षा लिखें"],
  popular: ["Popular", "लोकप्रिय"],
  verified: ["Verified", "सत्यापित"],
  live: ["Live", "लाइव"],
  busy: ["Booked", "व्यस्त"],
  maintenance: ["Service", "रखरखाव"],
  filters: ["Filters", "फ़िल्टर"],
  reset: ["Reset", "रीसेट"],
  pricePerHour: ["Max price per hour", "अधिकतम दर"],
  minRating: ["Minimum rating", "न्यूनतम रेटिंग"],
  any: ["Any", "कोई भी"],
  availableOnly: ["Available now", "अभी उपलब्ध"],
  verifiedOnly: ["Verified only", "केवल सत्यापित"],
  sort: ["Sort by", "क्रमबद्ध"],
  nearest: ["Nearest", "निकटतम"],
  topRated: ["Top rated", "टॉप रेटेड"],
  priceLow: ["Price: Low", "कम दर"],
  priceHigh: ["Price: High", "अधिक दर"],
  applyFilters: ["Apply Filters", "फ़िल्टर लागू करें"],
  payment: ["Payment", "भुगतान"],
  amountDue: ["Amount due", "कुल राशि"],
  processing: ["Processing payment...", "भुगतान हो रहा है..."],
  pay: ["Pay", "भुगतान करें"],
  securePay: ["256-bit secure payments", "256-बिट सुरक्षित भुगतान"],
  paymentSuccess: ["Payment Successful!", "भुगतान सफल!"],
  paidVia: ["paid via", "से भुगतान"],
  receiptSent: ["Receipt sent to your phone", "रसीद आपके फोन पर भेजी गई"],
  trackBooking: ["Track Driver", "ड्राइवर ट्रैक करें"],
  done: ["Done", "हो गया"],
  tracking: ["Loading tracking", "ट्रैकिंग लोड हो रही"],
  liveTracking: ["Live Tracking", "लाइव ट्रैकिंग"],
  back: ["Back", "वापस"],
  driver: ["Driver", "ड्राइवर"],
  min: ["min", "मिनट"],
  farm: ["Your farm", "आपका खेत"],
  route: ["route covered", "रूट पूरा"],
  journey: ["Trip status", "यात्रा स्थिति"],
  call: ["Call", "कॉल"],
  chat: ["Chat", "चैट"],
  typeMsg: ["Type a message...", "संदेश लिखें..."],
  chatStart: ["Say hello to the owner", "मालिक को नमस्ते कहें"],
  thankReview: ["Thank you!", "धन्यवाद!"],
  reviewAdded: ["Your review has been added", "आपकी समीक्षा जोड़ दी गई"],
  rate: ["Rate", "रेट करें"],
  shareExp: ["Share your experience", "अपना अनुभव साझा करें"],
  submit: ["Submit", "जमा करें"],
  cancel: ["Cancel", "रद्द करें"],
  confirmed: ["Confirmed", "पुष्टि"],
  cancelled: ["Cancelled", "रद्द"],
  owner: ["Owner", "मालिक"],
  track: ["Track", "ट्रैक"],
};

export default TractorMarket;
