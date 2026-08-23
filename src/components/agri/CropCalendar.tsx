import React, { useState, useMemo } from "react";
import { Calendar, Droplets, Leaf, Scissors, Info, Sun, Sprout } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { AgriImage } from "@/components/ui/agri-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { interpolate, localeFor } from "@/i18n/journey";
import { TIMELINE_CROPS } from "./cropTimelineData";
import { getFarmerTimelineCropIds } from "./cropTimelineData";
import { loadOnboardingData } from "@/features/auth/presentation/onboarding/onboardingData";

// ── Seasonal Calendar Data ───────────────────────────────────────────────────
interface ICalendarCrop {
  id: string;
  sow: string;
  harvest: string;
  img: string;
  msp: string;
  water: "Very Low" | "Low" | "Medium" | "High" | "Very High";
  duration: number;
}

interface ICalendarSeason {
  id: "kharif" | "rabi" | "zaid";
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  image: string;
  crops: ICalendarCrop[];
}

const SEASONS: ICalendarSeason[] = [
  {
    id: "kharif",
    icon: "🌧️",
    color: "from-green-600/80 to-emerald-500/60",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-300 dark:border-green-700",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800",
    crops: [
      { id: "rice", sow: "Jun–Jul", harvest: "Oct–Nov", img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=300", msp: "₹2,183/qt", water: "High", duration: 150 },
      { id: "maize", sow: "Jun–Jul", harvest: "Sep–Oct", img: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=300", msp: "₹2,090/qt", water: "Medium", duration: 90 },
      { id: "soybean", sow: "Jun–Jul", harvest: "Oct", img: "https://images.unsplash.com/photo-1631806882628-d72d1c2a8dce?auto=format&fit=crop&q=80&w=300", msp: "₹4,600/qt", water: "Medium", duration: 100 },
      { id: "cotton", sow: "Apr–May", harvest: "Nov–Jan", img: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=300", msp: "₹6,620/qt", water: "Medium", duration: 180 },
      { id: "groundnut", sow: "Jun–Jul", harvest: "Sep–Oct", img: "https://images.unsplash.com/photo-1567696153798-9111f9cd3d0d?auto=format&fit=crop&q=80&w=300", msp: "₹6,377/qt", water: "Low", duration: 110 },
      { id: "sugarcane", sow: "Feb–Mar", harvest: "Nov–Mar", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=300", msp: "₹340/qt", water: "Very High", duration: 365 },
    ],
  },
  {
    id: "rabi",
    icon: "❄️",
    color: "from-amber-600/80 to-yellow-500/60",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-300 dark:border-amber-700",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=800",
    crops: [
      { id: "wheat", sow: "Oct–Nov", harvest: "Mar–Apr", img: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=300", msp: "₹2,275/qt", water: "Medium", duration: 120 },
      { id: "mustard", sow: "Oct–Nov", harvest: "Feb–Mar", img: "https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&q=80&w=300", msp: "₹5,650/qt", water: "Low", duration: 110 },
      { id: "gram", sow: "Oct–Nov", harvest: "Feb–Mar", img: "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?auto=format&fit=crop&q=80&w=300", msp: "₹5,440/qt", water: "Low", duration: 100 },
      { id: "potato", sow: "Oct–Nov", harvest: "Jan–Feb", img: "https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?auto=format&fit=crop&q=80&w=300", msp: "₹1,200/qt", water: "Medium", duration: 90 },
      { id: "onion", sow: "Oct–Nov", harvest: "Feb–Apr", img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=300", msp: "₹1,800/qt", water: "Medium", duration: 100 },
      { id: "lentil", sow: "Oct–Nov", harvest: "Mar–Apr", img: "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?auto=format&fit=crop&q=80&w=300", msp: "₹6,425/qt", water: "Very Low", duration: 110 },
    ],
  },
  {
    id: "zaid",
    icon: "☀️",
    color: "from-orange-600/80 to-red-500/60",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-300 dark:border-orange-700",
    image: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&q=80&w=800",
    crops: [
      { id: "watermelon", sow: "Feb–Mar", harvest: "May–Jun", img: "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?auto=format&fit=crop&q=80&w=300", msp: "Market", water: "High", duration: 90 },
      { id: "cucumber", sow: "Feb–Mar", harvest: "Apr–May", img: "https://images.unsplash.com/photo-1568584711271-6bf7b6e7bfff?auto=format&fit=crop&q=80&w=300", msp: "Market", water: "High", duration: 60 },
      { id: "mung", sow: "Mar–Apr", harvest: "Jun–Jul", img: "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?auto=format&fit=crop&q=80&w=300", msp: "₹8,558/qt", water: "Low", duration: 65 },
      { id: "bitterGourd", sow: "Feb–Mar", harvest: "May–Jul", img: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?auto=format&fit=crop&q=80&w=300", msp: "Market", water: "Medium", duration: 75 },
      { id: "okra", sow: "Feb–Mar", harvest: "May–Jul", img: "https://images.unsplash.com/photo-1599031505397-9ac82a71a0cd?auto=format&fit=crop&q=80&w=300", msp: "Market", water: "Medium", duration: 50 },
    ],
  },
];

const cropNameKey = (id: string) => `crop.name.${id}`;
const cropTipKey = (id: string) => `crop.tip.${id}`;
const waterKey = (water: string) => `crop.water${water.replace(/ /g, "")}`;

// ── Individual Crop Details ────────────────────────────────────────────────
const waterColors: Record<string, string> = {
  "Very Low": "bg-muted text-muted-foreground",
  "Low": "bg-accent text-accent-foreground",
  "Medium": "bg-secondary text-secondary-foreground",
  "High": "bg-primary/20 text-primary",
  "Very High": "bg-primary/30 text-primary",
};

interface CropCalendarProps {
  onToast: (message: string) => void;
}

const CropCalendar: React.FC<CropCalendarProps> = ({ onToast }) => {
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const farmer = useMemo(() => {
    const data = loadOnboardingData(language);
    return {
      cropIds: getFarmerTimelineCropIds(data),
      cropIdSet: new Set(getFarmerTimelineCropIds(data)),
    };
  }, [language]);

  const [selectedCrop, setSelectedCrop] = useState<string>(() => farmer.cropIds[0] ?? 'wheat');
  const [sowingDate, setSowingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  const crop = TIMELINE_CROPS.find(c => c.id === selectedCrop)!;

  const timeline = useMemo(() => {
    if (!sowingDate || !crop) return [];
    const sowing = new Date(sowingDate);
    const events: { day: number; date: Date; type: string; label: string }[] = [];

    events.push({ day: 0, date: sowing, type: 'sowing', label: t('crop.sowing') });
    crop.irrigationDays.forEach(day => {
      const date = new Date(sowing); date.setDate(date.getDate() + day);
      events.push({ day, date, type: 'irrigation', label: interpolate(t('crop.irrigationDay'), { day }) });
    });
    crop.fertilizationDays.forEach(day => {
      const date = new Date(sowing); date.setDate(date.getDate() + day);
      events.push({ day, date, type: 'fertilization', label: interpolate(t('crop.fertilizationDay'), { day }) });
    });
    const harvestDate = new Date(sowing); harvestDate.setDate(harvestDate.getDate() + crop.harvestDay);
    events.push({ day: crop.harvestDay, date: harvestDate, type: 'harvest', label: t('crop.harvest') });
    return events.sort((a, b) => a.day - b.day);
  }, [sowingDate, crop, t]);

  const formatDate = (date: Date) => date.toLocaleDateString(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' });
  const isPast = (d: Date) => d < new Date();
  const isUpcoming = (d: Date) => { const w = new Date(); w.setDate(w.getDate() + 7); return d >= new Date() && d <= w; };

  const dotColor = (type: string) => ({ irrigation: 'bg-blue-500', fertilization: 'bg-green-500', harvest: 'bg-amber-500', sowing: 'bg-primary' }[type] || 'bg-muted');
  const eventIcon = (type: string) => ({
    irrigation: <Droplets size={15} className="text-blue-500" />,
    fertilization: <Leaf size={15} className="text-green-500" />,
    harvest: <Scissors size={15} className="text-amber-500" />,
    sowing: <Sprout size={15} className="text-primary" />,
  }[type]);

  return (
    <div className="pb-24 pt-4">
      <div className="px-4 mb-5">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="text-primary" size={22} />
          {t('crop.title')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('crop.subtitle')}</p>
      </div>

      <Tabs defaultValue="seasons" className="w-full">
        <TabsList className="w-full mx-4 mb-4" style={{ width: 'calc(100% - 2rem)' }}>
          <TabsTrigger value="seasons" className="flex-1 gap-1">
            <Sun size={14} /> {t('crop.seasonGuide')}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1 gap-1">
            <Calendar size={14} /> {t('crop.timeline')}
          </TabsTrigger>
        </TabsList>

        {/* ── Season Guide Tab ── */}
        <TabsContent value="seasons" className="px-4 space-y-6">
          {SEASONS.map((season) => (
            <div key={season.id} className={`rounded-2xl overflow-hidden border ${season.borderColor}`}>
              {/* Season Banner */}
              <div className="relative h-32 overflow-hidden">
                <AgriImage
                  type="crops"
                  category={season.id}
                  contextName={`${season.id} seasonal agriculture crop field`}
                  alt={`${t(`crop.${season.id}`)} farming season`}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${season.color} pointer-events-none`} />
                <div className="absolute inset-0 flex items-center px-5 pointer-events-none">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{season.icon}</span>
                      <h3 className="text-white text-2xl font-black">
                        {t(`crop.${season.id}`)}
                      </h3>
                    </div>
                    <p className="text-white/85 text-sm font-medium">
                      {t(`crop.${season.id}Sub`)}
                    </p>
                    <p className="text-white/70 text-xs mt-0.5">{interpolate(t('crop.cropsCount'), { n: season.crops.length })}</p>
                  </div>
                </div>
              </div>

              {/* Crops Grid */}
              <div className={`${season.bgColor} p-3 grid grid-cols-2 gap-3`}>
                {season.crops.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setExpandedCrop(expandedCrop === `${season.id}-${c.id}` ? null : `${season.id}-${c.id}`)}
                    className="bg-card rounded-2xl overflow-hidden border border-border text-left shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Crop Photo */}
                    <div className="h-24 overflow-hidden relative">
                      <AgriImage
                        type="crop"
                        crop={c.id}
                        contextName={t(cropNameKey(c.id))}
                        alt={`${t(cropNameKey(c.id))} crop farming`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                      {farmer.cropIdSet.has(c.id) && (
                        <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                          ★ {t('crop.yourCrop')}
                        </span>
                      )}
                      <div className="absolute bottom-1.5 left-2 right-2">
                        <p className="text-white font-bold text-sm leading-tight">{t(cropNameKey(c.id))}</p>
                      </div>
                    </div>
                    {/* Crop Info */}
                    <div className="p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">🌱 {c.sow}</span>
                        <span className="text-xs text-foreground font-medium">✂️ {c.harvest}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${waterColors[c.water] || 'bg-muted text-muted-foreground'}`}>
                          💧 {t(waterKey(c.water))}
                        </span>
                        <span className="text-xs text-muted-foreground">{interpolate(t('crop.durationLabel'), { dur: c.duration })}</span>
                      </div>

                      {/* Expanded Details */}
                      {expandedCrop === `${season.id}-${c.id}` && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-foreground leading-relaxed">
                            💡 {t(cropTipKey(c.id))}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="text-xs font-semibold text-primary">{t('crop.msp')}</span>
                            <span className="text-xs text-foreground">{c.msp}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline" className="px-4 space-y-4">
          <AgriCard>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {t('crop.selectCrop')}
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-xl text-foreground text-base sm:text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {TIMELINE_CROPS.map(c => (
                    <option key={c.id} value={c.id}>{t(cropNameKey(c.id))}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {t('crop.sowingDate')}
                </label>
                <input
                  type="date"
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-xl text-foreground text-base sm:text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </AgriCard>

          {/* Crop Info Banner */}
          <AgriCard className="bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Info size={18} className="text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground text-sm">{t(cropNameKey(crop.id))}</h4>
                <p className="text-xs text-muted-foreground">
                  {interpolate(t('crop.summary'), { dur: crop.duration, irr: crop.irrigationDays.length, fert: crop.fertilizationDays.length })}
                </p>
              </div>
            </div>
          </AgriCard>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {[
              ['bg-primary', t('crop.sowing')],
              ['bg-blue-500', t('crop.irrigation')],
              ['bg-green-500', t('crop.fertilization')],
              ['bg-amber-500', t('crop.harvest')],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-2.5">
              {timeline.map((event, idx) => {
                const past = isPast(event.date);
                const upcoming = isUpcoming(event.date);
                return (
                  <div key={`${event.type}-${event.day}-${idx}`} className={`relative pl-10 ${past ? 'opacity-50' : ''}`}>
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full ${dotColor(event.type)} ${upcoming ? 'ring-4 ring-primary/20 animate-pulse' : ''}`} />
                    <div className={`bg-card p-3 rounded-xl border ${upcoming ? 'border-primary shadow-soft' : 'border-border'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {eventIcon(event.type)}
                          <div>
                            <p className="font-medium text-foreground text-sm">{event.label}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                          </div>
                        </div>
                        {!past && (
                          <AgriButton size="sm" variant="outline" onClick={() => {
                            toast({ title: t('crop.reminderSetTitle'), description: `${event.label} - ${formatDate(event.date)}` });
                            onToast(t('crop.reminderSet'));
                          }}>
                            {t('crop.remind')}
                          </AgriButton>
                        )}
                      </div>
                      {upcoming && (
                        <div className="mt-1.5 text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                          ⚡ {t('crop.upcoming')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CropCalendar;
